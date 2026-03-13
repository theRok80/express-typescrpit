import { Request, Response } from 'express';
import * as manager from '../../managers/payment';
import * as response from '../../tools/response';

function webhookBatch(req: Request, res: Response): void {
  manager
    .webhookBatch()
    .then(data => response.success(req, res, data))
    .catch(e => response.error(req, res, e));
}

export { webhookBatch };
