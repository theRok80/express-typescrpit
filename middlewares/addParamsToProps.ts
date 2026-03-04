import _ from 'lodash';
import { Request, Response, NextFunction } from 'express';

export default function addParamsToProps(req: Request, res: Response, next: NextFunction) {
  _.forEach({ ...req.params, ...req.body }, (v, k) => {
    if (k.toString().match(/.+Id$/) && !v.toString().match(/[^-+0-9]+/)) {
      // debug.info('middleware:addParamsToProps', { k, v });
      req.props.params[k] = +v;
      req.props.requestParams[k] = +v;
    } else if (k.toString().match(/.+At$/)) {
      req.props.params[k] = v?.length ? v : null;
      req.props.requestParams[k] = v?.length ? v : null;
    } else {
      req.props.params[k] = v;
      req.props.requestParams[k] = v;
    }
  });
  next();
}
