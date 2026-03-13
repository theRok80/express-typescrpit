import { Props } from '../props';
import { PAYMENT_STATUS } from '../../constants';
import { Datetime } from '../variables';

export interface OrderIdWarehouse {
  orderId: string;
  status: (typeof ORDER_ID_STATUS)[keyof typeof ORDER_ID_STATUS];
  uuid?: Props['uuid'];
  createdAt: Datetime;
  updatedAt: Datetime;
}

export interface LogWebhook {
  id: number;
  pg: string;
  orderId: string;
  data: string;
  status: (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];
  result: string;
  createdAt: Datetime;
  updatedAt: Datetime;
}

export interface WorkWebhook {
  logId: LogWebhook['id'];
  orderId: LogPayment['orderId'];
  data: string;
  pg: (typeof PAYMENT_PG)[keyof typeof PAYMENT_PG];
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
  coinType: (typeof COIN_TYPE)[keyof typeof COIN_TYPE];
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
  pg: (typeof PAYMENT_PG)[keyof typeof PAYMENT_PG];
  method: (typeof PAYMENT_PG)[keyof typeof PAYMENT_PG];
  status: (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];
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
