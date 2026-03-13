import { Props } from '../props';
import { PAYMENT_STATUS } from '../../constants';
import { Datetime } from '../variables';
import { OrderIdStatus } from '../Payment';
import Stripe from 'stripe';
import { JsonStringified } from '../variables';

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
  currency: string;
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

export interface StripeCustomer {
  userId: User['userId'];
  customerId: string;
  clientIp: string;
  createdAt: Datetime;
}

export interface StripeType {
  customer: {
    get: StripeCustomer;
    create: StripeCustomer;
  };
}

export interface StripeProduct {
  productId: Product['productId'];
  stripeProductId: Stripe.Product['id'];
  createdAt: Datetime;
}

export interface StripePrice {
  productId: Product['productId'];
  priceId: Stripe.Price['id'];
  price: Product['price'];
  currency: Product['currency'];
  createdAt: Datetime;
}

export interface StripeCheckout {
  orderId: LogPayment['orderId'];
  send: JsonStringified<Stripe.Checkout.SessionCreateParams>;
  response: JsonStringified<Stripe.Response<Stripe.Checkout.Session>>;
  createdAt: Datetime;
}
