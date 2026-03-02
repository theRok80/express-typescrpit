import { IncomingHttpHeaders } from 'http';
import { Request } from 'express';
import { AgentDetails } from 'express-useragent';
import { PoolClient } from 'pg';
import { ParamsDictionary } from './express';

export interface Props {
  headers: IncomingHttpHeaders;
  body: Request['body'];
  query: Request['query'];
  params: ParamsDictionary;
  uuid: string;
  clientIp: string;
  useragent: AgentDetails;
  requestParams: Request['body'] & Request['query'] & ParamsDictionary;
}
