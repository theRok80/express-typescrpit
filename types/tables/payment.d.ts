import { Props } from '../props';
import { PAYMENT_STATUS } from '../../constants';

export interface OrderIdWarehouse {
  orderId: string;
  status: (typeof ORDER_ID_STATUS)[keyof typeof ORDER_ID_STATUS];
  uuid?: Props['uuid'];
  createdAt: Date;
  updatedAt: Date;
}

export interface LogWebhook {
  id: number;
  pg: string;
  orderId: string;
  data: string;
  createdAt: Date;
}

export interface Product {
  productId: number;
  name: string;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LogPaymentPrepare {
  uuid: string;
  userId: number;
  orderId: string;
  productId: number;
  pg: string;
  method: string;
  amount: number;
  status: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LogPayment {
  uuid: Props['uuid'];
  orderId: string;
  userId: User['userId'];
  productId: Product['productId'];
  price: Product['price'];
  amount: number;
  pg: string;
  method: string;
  status: (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}
