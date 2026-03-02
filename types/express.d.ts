declare namespace Express {
  import { AgentDetails } from 'express-useragent';
  import { Props } from './props';

  export interface Request {
    uuid: string;
    rawBody: Buffer;
    tempIp: string | string[] | undefined;
    clientIp: string;
    clientIpV6?: string;
    useragent: AgentDetails;
    props: Props;
  }
}
