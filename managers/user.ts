import { Props } from '../types/props';
import * as userHandler from '../handlers/user';

/**
 * Sign up
 *
 * @param props Props
 * @returns User ID
 */
async function signUp(props: Props): ReturnType<typeof userHandler.createUser> {
  const clientIp = props.clientIp;
  const { email, password, name } = props.requestParams as {
    email: string;
    password: string;
    name: string;
  };

  if (await userHandler.isEmailExists(email)) {
    throw new Error('Email already exists');
  }

  return userHandler.createUser({ email, password, name, clientIp });
}

/**
 * Sign in
 *
 * @param props Props
 * @returns User ID
 */
async function signIn(
  props: Props
): Promise<Pick<NonNullable<Awaited<ReturnType<typeof userHandler.getUserByEmail>>>, 'userId' | 'email' | 'name'>> {
  const { email, password } = props.requestParams as {
    email: string;
    password: string;
  };
  const row = await userHandler.getUserByEmail({ email });

  if (!row) {
    throw new Error('User not found');
  }

  const hashedPassword = userHandler.makePasswordHash(password);

  if (hashedPassword !== row.password) {
    throw new Error('Invalid password');
  }

  return {
    userId: row.userId,
    email: row.email,
    name: row.name,
  };
}

export { signUp, signIn };
