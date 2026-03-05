import { PAYMENT_STATUS } from '../constants';
import { Props } from '../types/props';
import { User } from '../types/tables/user';
import { LogPayment, Product } from '../types/tables/payment';
import DEBUG from 'debug';
import * as handler from '../handlers/payment';

const debug = DEBUG('dev.managers.payment');

async function prepare(props: Props) {
  try {
    await handler.generateOrderId();

    const productData = await handler.getProductData(props?.requestParams);

    if (!productData) {
      throw new Error('Product not found');
    }

    const orderId = await handler.getOrderId(props?.uuid);
    const amount = await getAmountFromPrice({
      userId: props?.requestParams?.userId,
      productId: props?.requestParams?.productId,
      price: productData.price,
    });

    return orderId;
  } catch (e) {
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
        return stripe.webhook(props);
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
const stripe = {
  webhook: async (props: Props) => {
    const thisStatus = stripe.setOrderStatus(props?.requestParams?.orderStatus);
  },
  setOrderStatus: function (status: string): number {
    switch (status) {
      case 'pending':
        return PAYMENT_STATUS.PENDING;
      case 'success':
        return PAYMENT_STATUS.SUCCESS;
      case 'failed':
        return PAYMENT_STATUS.FAILED;
      case 'cancelled':
        return PAYMENT_STATUS.CANCELLED;
      case 'refunded':
        return PAYMENT_STATUS.REFUNDED;
      default:
        throw new Error('Invalid status');
    }
  },
  success: async function () {},
  failed: async function () {},
  cancelled: async function () {},
  refunded: async function () {},
  pending: async function () {},
  processing: async function () {},
};

export { prepare, webhook };
