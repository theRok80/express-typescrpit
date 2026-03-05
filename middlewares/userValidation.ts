import { Request, Response, NextFunction } from 'express';
import Debug from 'debug';
import * as redis from '../tools/redisCache';
import { UserRedisData } from '../types/sign';
import { CURRENT_DATETIME } from '../constants';

const debug = Debug('dev:middlewares:userValidation');

/**
 * 현재 요청에 포함된 유저 토큰의 유효성을 검사
 * 유저 토큰을 검증을 위해서 요청헤더에는 토큰이 존재하는 경우 user-id 값을 필수로 포함하도록 설계
 *
 * @param req
 * @param res
 * @param next
 * @returns
 */
export default async function userValidation(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.props.headers['user-id'];
    const token = req.props.headers['token'];

    if (userId && token) {
      const data = (await redis.get(`user:token:${token}`)) as UserRedisData;

      console.log(data);

      if (!data) {
        return next();
      }

      if (data.expiredAt < CURRENT_DATETIME) {
        return next();
      }

      if (+data.userId === +userId) {
        req.props.tokenData = data;
      }
    }
    next();
  } catch (e) {
    debug.extend('userValidation:error')(e);
    next();
  }
}
