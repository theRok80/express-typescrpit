import { Request, Response, NextFunction } from 'express';
import { AVAILABLE_PAYMENT_PG, PAYMENT_PG } from '../constants';
import * as response from '../tools/response';

export default function pgMethodValidation(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { pg, method } = req.props.requestParams;
  if (!pg || !method) {
    return response.sendStatus(req, res, 400);
  }

  if (!AVAILABLE_PAYMENT_PG.includes(pg)) {
    return response.sendStatus(req, res, 400);
  }

  if (!PAYMENT_PG?.[pg as keyof typeof PAYMENT_PG]?.includes(method)) {
    return response.sendStatus(req, res, 400);
  }

  next();
}
