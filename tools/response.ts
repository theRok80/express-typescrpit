import _ from 'lodash';
import { v4 } from 'uuid';
import watcher from './actionWatcher';

import { Request, Response } from 'express';
import { ValidationError } from 'express-validator';

function success(req: Request, res: Response, data: any) {
  watcher(req, res, undefined, () => {
    res.status(200).json({
      uuid: req.props?.uuid,
      ...data,
    });
  });
}

function error(req: Request, res: Response, err: Error) {
  watcher(req, res, err, () => {
    res.status(500).json({
      uuid: req.props?.uuid,
      error: err.message,
    });
  });
}

function notValid(req: Request, res: Response, errors: ValidationError[]) {
  watcher(req, res, undefined, () => {
    res.status(400).json({
      uuid: req.props?.uuid,
      errors: errors.map((error) => error.msg),
    });
  });
}

function sendStatus(req: Request, res: Response, status: number) {
  watcher(req, res, undefined, () => {
    res.status(status).send();
  });
}

export { success, error, notValid, sendStatus };
