import { Datetime } from '../variables';

export interface User {
  userId: number;
  email: string;
  password: string;
  name: string;
  clientIp: string;
  createdAt: Datetime;
  updatedAt: Datetime;
}
