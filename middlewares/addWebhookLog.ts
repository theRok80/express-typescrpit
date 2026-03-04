import { Request, Response, NextFunction } from 'express';
import { addWebhookLog } from '../handlers/payment';
import * as response from '../tools/response';

export default (req: Request, res: Response, next: NextFunction) => {
  addWebhookLog(req.props)
    .then(() => next())
    .catch((e) => response.error(req, res, e));
};
