import { User } from './user';
import { Props } from '../props';

export interface LogSign {
  uuid: Props['uuid'];
  email: User['email'];
  token?: string;
  clientIp: Props['clientIp'];
  type: 'signIn' | 'signUp';
  result: 'success' | 'failed';
  errorMessage?: string;
  createdAt: Date;
  expiredAt?: Date | string;
}
