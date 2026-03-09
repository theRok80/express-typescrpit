import { Props } from './props';
import { PaymentStatus } from './variables';
import { Product, ProductCoin } from './tables/payment';

export namespace Handler {
  export interface GetProductData extends Product {
    coins: ProductCoin[];
  }
}
export namespace Manager {
  export interface Stripe {
    name: 'stripe';
    webhook(props: Props): Promise<{ message: string }>;
    success(props: Props & { successDatetime: Date | string }): Promise<void>;
    failed(props: Props): Promise<void>;
    refunded(props: Props): Promise<void>;
  }
}
