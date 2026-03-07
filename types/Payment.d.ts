import { Props } from './props';
import { PaymentStatus } from './variables';

export namespace Handler {}
export namespace Manager {
  export interface Stripe {
    name: 'stripe';
    webhook(props: Props): Promise<{ message: string }>;
    success(props: Props): Promise<void>;
    failed(props: Props): Promise<void>;
    refunded(props: Props): Promise<void>;
  }
}
