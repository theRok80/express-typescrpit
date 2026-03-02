import { Request, Response, NextFunction } from 'express';
import Debug from 'debug';
import net from 'net';
import { Address6 } from 'ip-address';
import { v4 } from 'uuid';
import { useragent } from 'express-useragent';

const debug = Debug('dev:middlewares:propsInit');

/**
 * 이후 프로세스에서 변수 사용 시 통일된 형태로 사용할 수 있도록 초기화
 *
 * @param req Request
 * @param res Response
 * @param next NextFunction
 */
export default function propsInit(req: Request, res: Response, next: NextFunction) {
  // request uuid
  req.uuid = v4();

  req.tempIp = req.ip || req.connection.remoteAddress;

  // 프록시를 통한 요청일 경우
  if (typeof req.headers['x-forwarded-for'] === 'string') {
    req.tempIp = req.headers['x-forwarded-for'].split(',')[0].trim();
  } else if (req.headers['x-real-ip']) {
    req.tempIp = req.headers['x-real-ip'];
  }

  const tempIp = req.tempIp as string;
  const ipType = net.isIP(tempIp);

  if (ipType === 4) {
    req.clientIp = tempIp;
  } else if (ipType === 6) {
    try {
      const addr6 = new Address6(tempIp);
      const teredo = addr6.inspectTeredo();
      req.clientIp = teredo?.client4 ?? tempIp;
    } catch {
      req.clientIp = tempIp;
    }
    req.clientIpV6 = tempIp;
  } else if (tempIp === '::1') {
    req.clientIp = '0.0.0.1';
  } else if (tempIp.indexOf('::ffff:') >= 0) {
    req.clientIp = tempIp.replace('::ffff:', '');
  } else {
    req.clientIp = '0';
  }

  console.log(req.clientIp);

  req.props = {
    headers: req.headers,
    body: req.body,
    query: req.query,
    params: req.params,
    uuid: req.uuid,
    clientIp: req.clientIp,
    useragent: useragent.parse(req.headers['user-agent'] ?? ''),
    requestParams: {
      ...req.body,
      ...req.query,
    },
  };

  next();
}
