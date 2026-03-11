import { CURRENT_DATETIME, dayjs, PAYMENT_STATUS } from '../constants';
import { Props } from '../types/props';
import { User } from '../types/tables/user';
import { LogPayment, LogWebhook, Product } from '../types/tables/payment';
import DEBUG from 'debug';
import * as handler from '../handlers/payment';
import { AVAILABLE_PAYMENT_PG } from '../constants';
import { Manager, PaymentPg, PaymentStatus } from '../types/Payment';
import { getErrorMessage } from '../tools/common';
import * as coinManager from './coin';

const debug = DEBUG('dev:managers:payment');

async function prepare(props: Props): Promise<LogPayment['orderId']> {
  const { uuid } = props;
  const { pg, method, productId } = props?.requestParams as {
    pg: (typeof AVAILABLE_PAYMENT_PG)[keyof typeof AVAILABLE_PAYMENT_PG];
    method: string;
    productId: Product['productId'];
  };
  const userId = props?.tokenData?.userId;

  try {
    await handler.generateOrderId();

    const productData = await handler.getProductData(props?.requestParams);

    const orderId = await handler.getOrderId(uuid);
    const amount = await getAmountFromPrice({
      userId,
      productId,
      price: productData.price,
    });

    await handler.setLogPayment({
      uuid,
      orderId,
      userId,
      productId,
      price: productData.price,
      amount,
      pg,
      method,
      status: PAYMENT_STATUS.PROCESSING,
    });

    await handler.setLogPaymentCoin({
      orderId,
      coins: productData.coins,
    });

    return orderId;
  } catch (e) {
    await handler.setLogPayment({
      uuid,
      userId,
      productId,
      pg,
      method,
      status: PAYMENT_STATUS.ERROR,
      errorMessage: getErrorMessage(e),
    });
    throw e;
  }
}

/**
 * 실제 가격에서 특정 조건에 따라 가격 변경이 일어날 경우 계산하여 반환
 *
 * @description Get amount from price
 *
 * @param {User['userId']} userId
 * @param {Product['productId']} productId
 * @param {Product['price']} price
 * @returns {Promise<LogPayment['amount']>}
 */
async function getAmountFromPrice({
  userId,
  productId,
  price,
}: {
  userId?: User['userId'];
  productId?: Product['productId'];
  price: Product['price'];
}): Promise<LogPayment['amount']> {
  try {
    // 특정 조건들에 대한 처리를 추가
    // 현재는 그대로 반환
    return price;
  } catch (e) {
    // 에러가 발생하면 로깅하고 주문진행은 방해하지 않도록 원래 가격을 반환
    debug.extend('getAmountFromPrice')(e);
    return price;
  }
}

/**
 * PG 사 별로 주문 상태 코드, orderId 를 반환하는 방법이 다를 수 있으므로
 * 각각 별도로 처리
 */
function getOrderStatus(
  pg: PaymentPg,
  props: Props,
): {
  orderId: LogPayment['orderId'];
  status: PaymentStatus;
} {
  switch (pg.toLowerCase()) {
    case 'stripe':
      const orderId = props?.requestParams?.orderId as LogPayment['orderId'];
      const requestStatus = props?.requestParams?.orderStatus;
      let status: PaymentStatus;
      // PG 별 응답코드에 따라 처리할 상태값 설정
      switch (requestStatus) {
        case 'pending':
          status = PAYMENT_STATUS.PENDING;
        case 'success':
          status = PAYMENT_STATUS.SUCCESS;
        case 'failed':
          status = PAYMENT_STATUS.FAILED;
        case 'cancelled':
          status = PAYMENT_STATUS.CANCELLED;
        case 'refunded':
          status = PAYMENT_STATUS.REFUNDED;
        default:
          throw new Error('Invalid status');
      }
      return { orderId, status };
    default:
      throw new Error('Invalid PG');
  }
}

async function webhook(pg: string, props: Props) {
  const webhookLogId = props?.webhookLogId as LogWebhook['id'];

  try {
    const { orderId, status } = getOrderStatus(pg, props);

    switch (status) {
      case PAYMENT_STATUS.SUCCESS:
        return await success({ orderId, webhookLogId });
      case PAYMENT_STATUS.REFUNDED:
        return await refunded({ orderId, webhookLogId });
      case PAYMENT_STATUS.FAILED:
      case PAYMENT_STATUS.CANCELLED:
      case PAYMENT_STATUS.ERROR:
      case PAYMENT_STATUS.PENDING:
        return await failed({ orderId, webhookLogId, status });
      default:
        throw new Error('Invalid status');
    }
  } catch (e) {
    debug.extend('webhook:error')(e);
    throw e;
  }
}

async function success({
  orderId,
  webhookLogId,
}: {
  orderId: LogPayment['orderId'];
  webhookLogId: LogWebhook['id'];
}) {
  if (!orderId) {
    throw new Error('orderId is required');
  }

  const paymentLog = await handler.getLogPayment(orderId);
  const { userId, status, uuid, productId, pg, method } = paymentLog;

  if (status === PAYMENT_STATUS.SUCCESS) {
    return { message: 'already processed' };
  }

  // 성공 처리에 관련된 시간을 관련 로그에서 동일한 시간으로 통일
  const currentDatetime = CURRENT_DATETIME();

  try {
    // 상품 구성에 따른 처리
    const logPaymentCoin = await handler.getLogPaymentCoin(orderId);
    await coinManager.reserve({
      userId,
      coins: logPaymentCoin,
      relationType: 'payment',
      relationId: orderId,
      currentDatetime: currentDatetime,
    });

    // log webhook 업데이트
    await handler.updateWebhookLog({
      id: webhookLogId,
      status,
      updatedAt: currentDatetime,
    });

    // 주문 상태 업데이트
    await handler.setLogPayment({
      uuid,
      orderId,
      userId,
      productId,
      pg,
      method,
      status,
      updatedAt: currentDatetime,
    });

    // 정상 처리 되었으므로 work webhook 제거
    await handler.removeWorkWebhook({ orderId });

    return { message: 'done' };
  } catch (e) {
    debug.extend('STRIPE:webhook:error')(e);

    // log webhook 업데이트
    await handler.updateWebhookLog({
      id: webhookLogId,
      status: PAYMENT_STATUS.ERROR,
      result: getErrorMessage(e),
      updatedAt: currentDatetime,
    });

    // log payment 업데이트
    await handler.setLogPayment({
      uuid,
      orderId,
      userId,
      productId,
      pg,
      method,
      status: PAYMENT_STATUS.ERROR,
      errorMessage: getErrorMessage(e),
      updatedAt: currentDatetime,
    });
    throw e;
  }
}

async function refunded({
  orderId,
  webhookLogId,
}: {
  orderId: LogPayment['orderId'];
  webhookLogId: LogWebhook['id'];
}) {
  if (!orderId) {
    throw new Error('orderId is required');
  }

  const paymentLog = await handler.getLogPayment(orderId);
  const { userId, status, uuid, productId, pg, method } = paymentLog;

  if (status !== PAYMENT_STATUS.SUCCESS) {
    throw new Error('Invalid status');
  }

  return { message: 'done' };
}

async function failed({
  orderId,
  webhookLogId,
  status,
}: {
  orderId: LogPayment['orderId'];
  webhookLogId: LogWebhook['id'];
  status: PaymentStatus;
}) {
  return { message: 'done' };
}

export { prepare, webhook };
