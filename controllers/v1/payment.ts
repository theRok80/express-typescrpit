import { Request, Response } from 'express';
import * as response from '../../tools/response';
import * as manager from '../../managers/payment';

function prepare(req: Request, res: Response): void {
  manager
    .prepare(req.props)
    .then((data) => response.success(req, res, data))
    .catch((e) => response.error(req, res, e));
}

function webhook(req: Request, res: Response): void {
  const { pg } = req.props.requestParams as { pg: string };
  const lowerCasePg = pg.toLowerCase();

  manager
    .webhook(lowerCasePg, req.props)
    .then((data) => response.success(req, res, data))
    .catch((e) => response.error(req, res, e));
}

export { prepare, webhook };
