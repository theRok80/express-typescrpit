import { IncomingHttpHeaders } from 'http';
import { Request } from 'express';
import { AgentDetails } from 'express-useragent';
import { PoolClient } from 'pg';
import { ParamsDictionary } from './express';
import { UserRedisData } from './sign';

export interface Props {
  headers: IncomingHttpHeaders;
  body: Request['body'];
  query: Request['query'];
  params: ParamsDictionary;
  uuid: string;
  clientIp: string;
  useragent: AgentDetails;
  requestParams: Request['body'] & Request['query'] & ParamsDictionary;
  tokenData?: UserRedisData;
  webhookLogId?: LogWebhook['id']; // 결제 관련 웹훅 로그 ID
}
