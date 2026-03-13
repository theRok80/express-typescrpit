import { Props } from '../props';
import { PAYMENT_STATUS } from '../../constants';
import { Datetime } from '../variables';
import { OrderIdStatus } from '../Payment';

export interface OrderIdWarehouse {
  orderId: string;
  status: OrderIdStatus;
  uuid?: Props['uuid'];
  createdAt: Datetime;
  updatedAt: Datetime;
}

export interface LogWebhook {
  id: number;
  pg: string;
  orderId: string;
  data: string;
  status: PaymentStatus;
  result: string;
  createdAt: Datetime;
  updatedAt: Datetime;
}

export interface WorkWebhook {
  logId: LogWebhook['id'];
  orderId: LogPayment['orderId'];
  data: string;
  pg: PaymentPg;
  createdAt: Datetime;
}

export interface Product {
  productId: number;
  name: string;
  price: number;
  createdAt: Datetime;
  updatedAt: Datetime;
}

export interface ProductCoin {
  productId: Product['productId'];
  coin: number;
  coinType: CoinType;
  periodValue: number;
  periodUnit: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
  createdAt: Datetime;
  updatedAt: Datetime;
}

export interface LogPayment {
  uuid: Props['uuid'];
  orderId: string;
  userId: User['userId'];
  productId: Product['productId'];
  price: Product['price'];
  amount: number;
  pg: PaymentPg;
  method: PaymentPg;
  status: PaymentStatus;
  errorMessage?: string;
  createdAt: Datetime;
  updatedAt: Datetime;
}

export interface LogPaymentCoin {
  orderId: LogPayment['orderId'];
  coin: ProductCoin['coin'];
  coinType: ProductCoin['coinType'];
  periodValue: ProductCoin['periodValue'];
  periodUnit: ProductCoin['periodUnit'];
  createdAt: Datetime;
}
