import { User } from './user';
import { Props } from '../props';
import { Datetime } from '../variables';

export interface LogSign {
  uuid: Props['uuid'];
  email: User['email'];
  token?: string;
  clientIp: Props['clientIp'];
  type: 'signIn' | 'signUp';
  result: 'success' | 'failed';
  errorMessage?: string;
  createdAt: Datetime;
  expiredAt?: Datetime;
}
