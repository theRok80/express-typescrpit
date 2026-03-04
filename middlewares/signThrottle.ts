import Debug from 'debug';
import { Request, Response, NextFunction } from 'express';
import { get, incr, expire, remove } from '../tools/redisCache';
import * as response from '../tools/response';

const debug = Debug('dev:middlewares:signThrottle');

/**
 *
 * 회원가입 요청 제한
 *
 * @param req Request
 * @param res Response
 * @param next NextFunction
 */
export default async function signThrottle(req: Request, res: Response, next: NextFunction) {
  try {
    const ipTtl = 60;
    const maxRequestsPerMinute = 10;
    const { clientIp } = req.props;
    if (!clientIp) {
      throw new Error('Client IP is required');
    }

    let signType = 'others'; // signUp, signIn, others

    if (req.originalUrl.includes('sign/up')) {
      signType = 'signUp';
    } else if (req.originalUrl.includes('sign/in')) {
      signType = 'signIn';
    }

    const key = `${signType}:throttle:${clientIp}`;
    const currentCount = await get(key);

    if (currentCount && typeof currentCount === 'number' && currentCount >= maxRequestsPerMinute) {
      throw new Error('Too many requests');
    }

    if (typeof currentCount !== 'number') {
      await remove(key);
    }

    await incr(key);
    await expire(key, ipTtl);

    next();
  } catch (e) {
    debug.extend('signThrottle:error')(e);
    response.error(req, res, e as Error);
  }
}
