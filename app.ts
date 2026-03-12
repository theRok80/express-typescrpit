import dotenv from 'dotenv';
dotenv.config({ quiet: true });

import express, { Express, Request, Response, NextFunction, RequestHandler } from 'express';
const app: Express = express();

import cors from 'cors';
import cookieParser from 'cookie-parser';
import { v4 } from 'uuid';
import bodyParser from 'body-parser';
import bodyParserXml from 'body-parser-xml';
import compression from 'compression';
import requestIp from 'request-ip';
import useragent from 'express-useragent';
import i18n from './i18n';

bodyParserXml(bodyParser);

// TYPES

// ROUTES
import v1Router from './routes/v1';

// MIDDLEWARES
import propsInit from './middlewares/propsInit';
import * as response from './tools/response';

// VARIABLES
const corsOptions = {
  exposedHeaders: [],
};

// INITIALIZE
app.use(compression());
app.use(i18n);

app.use(
  express.json({
    verify: (req: Request, _res: Response, buf: Buffer) => {
      req.rawBody = buf; // Stripe PG webhook 에서 rawBody 를 이용함
    },
  })
);
app.use(bodyParser.xml());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(propsInit);

app.use('/v1', v1Router);

app.use(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (err: Error, req: Request, res: Response, _next: NextFunction): void => {
    response.error(req, res, err);
  }
);

export default app;
