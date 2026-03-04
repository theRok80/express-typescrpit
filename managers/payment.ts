import { PAYMENT_STATUS } from '../constants';
import { Props } from '../types/props';
import DEBUG from 'debug';
import * as handler from '../handlers/payment';

const debug = DEBUG('dev.managers.payment');

async function prepare(props: Props) {
  const productData = await handler.getProductData(props?.requestParams);

  if (!productData) {
    throw new Error('Product not found');
  }

  return productData;
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
