import { Props } from './props';
import { PaymentStatus } from './variables';
import { Product, ProductCoin } from './tables/payment';

export namespace Handler {
  export interface GetProductData extends Product {
    coins: ProductCoin[];
    stripe: {
      product?: StripeProduct;
      price?: StripePrice;
    };
  }
}
export namespace Manager {
  export interface Prepare extends Props {
    orderId: LogPayment['orderId'];
  }
  export interface Success extends Props {
    orderId: LogPayment['orderId'];
  }
  export interface Failed extends Props {
    orderId: LogPayment['orderId'];
  }
  export interface Refunded extends Props {
    orderId: LogPayment['orderId'];
  }
}

export type PaymentPg = (typeof PAYMENT_PG)[keyof typeof PAYMENT_PG];

export type PaymentStatus =
  (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];
