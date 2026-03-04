import { Request, Response } from 'express';
import * as response from '../../tools/response';
import * as manager from '../../managers/sign';

function signUp(req: Request, res: Response) {
  manager
    .signUp(req.props)
    .then((userId) =>
      response.success(req, res, {
        userId,
      })
    )
    .catch((err) => response.error(req, res, err));
}

function signIn(req: Request, res: Response) {
  manager
    .signIn(req.props)
    .then((user) => response.success(req, res, user))
    .catch((err) => response.error(req, res, err));
}

export { signUp, signIn };
