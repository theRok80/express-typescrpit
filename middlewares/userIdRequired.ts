import { Request, Response, NextFunction } from 'express';
import * as response from '../tools/response';

export default function userIdRequired(req: Request, res: Response, next: NextFunction) {
  if (!req.props?.tokenData?.userId) {
    return response.sendStatus(req, res, 401);
  }
  next();
}
