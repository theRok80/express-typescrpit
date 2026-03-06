import { PAYMENT_STATUS } from '../constants';
import { Props } from '../types/props';
import { User } from '../types/tables/user';
import { LogPayment, Product } from '../types/tables/payment';
import DEBUG from 'debug';
import * as handler from '../handlers/payment';
import { AVAILABLE_PAYMENT_PG } from '../constants';
import { PaymentStatus } from '../types/variables';
import { Manager } from '../types/Payment';

const debug = DEBUG('dev.managers.payment');

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

    if (!productData) {
      throw new Error('Product not found');
    }

    const orderId = await handler.getOrderId(uuid);
    const amount = await getAmountFromPrice({
      userId,
      productId,
      price: productData.price,
    });

    await handler.addLogPayment({
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

    return orderId;
  } catch (e) {
    await handler.addLogPayment({
      uuid,
      userId,
      productId,
      pg,
      method,
      status: PAYMENT_STATUS.ERROR,
      errorMessage: e instanceof Error ? e.message : 'Unknown error',
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
  async webhook(props: Props) {
    const orderId = props?.requestParams?.orderId as LogPayment['orderId'];
    const userId = props?.requestParams?.userId as User['userId'];
    const requestStatus = props?.requestParams?.orderStatus;

    let status: PaymentStatus;
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
        status = PAYMENT_STATUS.ERROR;
    }

    const logPayment = await handler.getLogPayment(orderId);

    if (status === PAYMENT_STATUS.SUCCESS) {
      return STRIPE.success({
        ...props,
        requestParams: { ...props.requestParams, status, userId, orderId },
      });
    }

    if (status === PAYMENT_STATUS.REFUNDED) {
      return STRIPE.refunded({
        ...props,
        requestParams: { ...props.requestParams, status, userId, orderId },
      });
    }

    // 그 외 상태는 일괄적으로 상태값만 다르고 동일하게 처리
    return STRIPE.failed({
      ...props,
      requestParams: { ...props.requestParams, status, userId, orderId },
    });
  },
  success: async function (props: Props) {
    try {
    } catch (e) {
      debug.extend('STRIPE.success:error')(e);
      // await handler.addLogPayment({
      //   uuid: props.uuid,
      //   orderId: props.requestParams.orderId,
      //   userId: props.tokenData.userId,
      //   productId: props.requestParams.productId,
      //   pg: 'stripe',
      //   method: props.requestParams.method,
      //   status: PAYMENT_STATUS.ERROR,
      // });
      throw e;
    }
  },
  failed: async function (props: Props) {},
  refunded: async function (props: Props) {},
};

export { prepare, webhook };
