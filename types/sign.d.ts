import { User } from './tables/user';

export interface SignInResponse extends Pick<User, 'userId' | 'email' | 'name'> {
  token: string;
}

export interface UserRedisData extends User {
  signedInAt: Date | string;
  expiredAt: Date | string;
}
