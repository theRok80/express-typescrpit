import { Request, Response } from 'express';

/**
 * 실제 응답전에 뭔가 처리할 것이 있을때 사용하기위해
 *
 * @param req Request
 * @param res Response
 * @param err Error
 * @param callback () => void
 */
const watcher = (req: Request, res: Response, err?: Error, callback?: () => void) => {
  if (typeof callback === 'function') {
    callback();
  }
};

export default watcher;
