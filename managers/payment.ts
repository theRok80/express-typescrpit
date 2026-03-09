import { CURRENT_DATETIME, dayjs, PAYMENT_STATUS } from '../constants';
import { Props } from '../types/props';
import { User } from '../types/tables/user';
import { LogPayment, LogWebhook, Product } from '../types/tables/payment';
import DEBUG from 'debug';
import * as handler from '../handlers/payment';
import { AVAILABLE_PAYMENT_PG } from '../constants';
import { PaymentStatus } from '../types/variables';
import { Manager } from '../types/Payment';
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

async function webhook(pg: string, props: Props) {
  try {
    switch (pg) {
      case 'stripe':
        return STRIPE.webhook(props);
      default:
        throw new Error('Invalid PG');
    }
  } catch (e) {
    debug.extend('webhook:error')(e);
    throw e;
  }
}

/**
 * Stripe
 * PG 사 별로 처리하는 함수를 따로 정의하여 사용
 *
 * @description Stripe webhook manager
 */
const STRIPE: Manager.Stripe = {
  name: 'stripe',
  async webhook(props: Props): Promise<{ message: string }> {
    const orderId = props?.requestParams?.orderId as LogPayment['orderId'];
    const requestStatus = props?.requestParams?.orderStatus;
    const webhookLogId = props?.webhookLogId as LogWebhook['id'];

    // PG 별 응답코드에 따라 처리할 상태값 설정
    let status: PaymentStatus;
    switch (requestStatus) {
      case 'pending':
        status = PAYMENT_STATUS.PENDING;
        break;
      case 'success':
        status = PAYMENT_STATUS.SUCCESS;
        break;
      case 'failed':
        status = PAYMENT_STATUS.FAILED;
        break;
      case 'cancelled':
        status = PAYMENT_STATUS.CANCELLED;
        break;
      case 'refunded':
        status = PAYMENT_STATUS.REFUNDED;
      default:
        throw new Error('Invalid status');
    }

    const logPayment = await handler.getLogPayment(orderId);
    const userId = logPayment?.userId;

    const newRequestParams = {
      ...props.requestParams,
      status,
      orderId,
      logData: logPayment,
    };

    try {
      if (status === PAYMENT_STATUS.SUCCESS) {
        // 이미 처리된 주문
        if (logPayment.status === PAYMENT_STATUS.SUCCESS) {
          return { message: 'already processed' };
        }

        await STRIPE.success({
          ...props,
          successDatetime: CURRENT_DATETIME(), // 처리 시간을 통일하기 위해 현재 시간 사용
          requestParams: newRequestParams,
        });
      } else if (status === PAYMENT_STATUS.REFUNDED) {
        await STRIPE.refunded({
          ...props,
          requestParams: newRequestParams,
        });
      } else {
        // 그 외 상태는 일괄적으로 상태값만 다르고 동일하게 처리
        // 이 후 별도의 처리가 필요한 경우 분리처리 필요
        await STRIPE.failed({
          ...props,
          requestParams: newRequestParams,
        });
      }

      // log webhook 업데이트
      await handler.updateWebhookLog({
        id: webhookLogId,
        status,
      });

      // 주문 상태 업데이트
      const { uuid, orderId, userId, productId, pg, method } = logPayment;
      await handler.setLogPayment({
        uuid,
        orderId,
        userId,
        productId,
        pg,
        method,
        status,
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
      });

      // log payment 업데이트
      await handler.setLogPayment({
        uuid: logPayment?.uuid,
        orderId,
        userId,
        productId: logPayment?.productId,
        pg: STRIPE.name,
        method: logPayment?.method,
        status: PAYMENT_STATUS.ERROR,
        errorMessage: getErrorMessage(e),
      });
      throw e;
    }
  },
  success: async function (
    props: Props & { successDatetime: Date | string },
  ): Promise<void> {
    const orderId = props?.requestParams?.logData
      ?.orderId as LogPayment['orderId'];
    const successDatetime = props?.successDatetime as Date | string;
    const userId = props?.requestParams?.logData
      ?.userId as LogPayment['userId'];

    // 상품 구성에 따른 처리
    const logPaymentCoin = await handler.getLogPaymentCoin(orderId);
    await coinManager.reserve({
      userId,
      coins: logPaymentCoin,
      relationType: 'payment',
      relationId: orderId,
      currentDatetime: successDatetime,
    });

    // 구성 상품 지급 등에 대한 처리
    // TEST
    throw new Error('test');
  },
  failed: async function (props: Props): Promise<void> {
    // 실패 시 처리 부분
  },
  refunded: async function (props: Props): Promise<void> {
    // 환불 시 지급 회수등에 대한 처리
  },
};

export { prepare, webhook };
