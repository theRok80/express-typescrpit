import { User } from './tables/user';
import { Datetime } from './variables';

export interface SignInResponse extends Pick<
  User,
  'userId' | 'email' | 'name'
> {
  token: string;
}

export interface UserRedisData extends User {
  signedInAt: Datetime;
  expiredAt: Datetime;
}
