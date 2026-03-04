import Debug from 'debug';
import { Request, Response, NextFunction } from 'express';
import { get, incr, expire, remove } from '../tools/redisCache';
import * as response from '../tools/response';

const debug = Debug('dev:middlewares:signUpThrottle');

/**
 *
 * 회원가입 요청 제한
 *
 * @param req Request
 * @param res Response
 * @param next NextFunction
 */
export default async function signUpThrottle(req: Request, res: Response, next: NextFunction) {
  try {
    const ipTtl = 60;
    const maxRequestsPerMinute = 10;
    const { clientIp } = req.props;
    if (!clientIp) {
      throw new Error('Client IP is required');
    }

    const key = `signUp:throttle:${clientIp}`;
    const currentCount = await get(key);

    if (currentCount && typeof currentCount === 'number' && currentCount >= maxRequestsPerMinute) {
      throw new Error('Too many requests');
    }

    if (typeof currentCount !== 'number') {
      await remove(key);
    }

    await incr(key);
    await expire(key, ipTtl);
  } catch (e) {
    debug.extend('signUpThrottle:error')(e);
    response.error(req, res, e as Error);
  }
}
