import { PAYMENT_STATUS, PAYMENT_PG } from '../constants';

export type UserId = number;
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];
