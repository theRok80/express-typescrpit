import Debug from 'debug';
import { Props } from '../types/props';
import { v4 } from 'uuid';
import { SignInResponse } from '../types/sign';
import * as userHandler from '../handlers/user';
import * as redis from '../tools/redisCache';
import { jsonStringify } from '../tools/common';
import { USER_TOKEN_TTL, CURRENT_DATETIME, CURRENT_DAY, DATETIME_FORMAT } from '../constants';

const debug = Debug('dev:managers:user');

/**
 * Sign up
 *
 * @param props Props
 * @returns User ID
 */
async function signUp(props: Props): ReturnType<typeof userHandler.createUser> {
  try {
    const clientIp = props.clientIp;
    const { email, password, name } = props.requestParams as {
      email: string;
      password: string;
      name: string;
    };

    if (await userHandler.isEmailExists(email)) {
      throw new Error('Email already exists');
    }

    await userHandler.addLogSign({ type: 'signUp', props, result: 'success' });

    return userHandler.createUser({ email, password, name, clientIp });
  } catch (e) {
    debug.extend('signUp:error')(e);
    await userHandler.addLogSign({
      type: 'signUp',
      props,
      result: 'failed',
      errorMessage: e instanceof Error ? e.message : 'Unknown error',
    });
    throw e;
  }
}

/**
 * Sign in
 *
 * @param props Props
 * @returns User ID
 */
async function signIn(props: Props): Promise<SignInResponse> {
  const { email, password } = props.requestParams as {
    email: string;
    password: string;
  };

  try {
    const row = await userHandler.getUserByEmail({ email });

    console.log(row);

    if (!row) {
      throw new Error('User not found');
    }

    const hashedPassword = userHandler.makePasswordHash(password);

    if (hashedPassword !== row.password) {
      throw new Error('Invalid password');
    }

    // 이전 로그인 토큰 중 아직 만료 안된 것은 Redis에서 삭제
    const rows = await userHandler.getLiveSignTokens(email);
    await Promise.all(rows.map((row) => redis.remove(`user:token:${row.token}`)));

    const token = v4();
    await redis.set(
      `user:token:${token}`,
      jsonStringify({
        ...row,
        signedInAt: CURRENT_DATETIME,
      }),
      USER_TOKEN_TTL
    );

    const tokenExpiredAt = CURRENT_DAY.add(USER_TOKEN_TTL, 'seconds').format(DATETIME_FORMAT);

    await userHandler.addLogSign({
      type: 'signIn',
      props,
      result: 'success',
      token,
      expiredAt: tokenExpiredAt,
    });

    return {
      token,
      userId: row.userId,
      email: row.email,
      name: row.name,
    };
  } catch (e) {
    debug.extend('signIn:error')(e);
    await userHandler.addLogSign({
      type: 'signIn',
      props,
      result: 'failed',
      errorMessage: e instanceof Error ? e.message : 'Unknown error',
    });
    throw e;
  }
}

export { signUp, signIn };
