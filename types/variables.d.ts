import { PAYMENT_STATUS, PAYMENT_PG } from '../constants';

export type UserId = number;
export type Datetime = Date | string;

export type JsonStringified<T> = string & { __stringified?: T };
