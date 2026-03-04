export interface SignInResponse extends Pick<User, 'userId' | 'email' | 'name'> {
  token: string;
}
