import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import * as response from './response';

function isLocalhost(ip: string) {
  return ip === '127.0.0.1' || ip === '::1';
}

function formValidationResult(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  console.log(errors.array());

  if (!errors.isEmpty()) {
    // 에러 확인은 내부만 가능하도록
    if (process.env?.ENVIRONMENT !== 'production' || isLocalhost(req.clientIp)) {
      return response.notValid(req, res, errors.array());
    }
    return response.sendStatus(req, res, 400);
  }
  return next();
}

export { formValidationResult };
