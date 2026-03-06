import { Props } from './props';
import { PaymentStatus } from './variables';

export namespace Handler {}
export namespace Manager {
  export interface Stripe {
    webhook(props: Props): Promise<void>;
    success(props: Props): Promise<void>;
    failed(props: Props): Promise<void>;
    refunded(props: Props): Promise<void>;
  }
}
