import i18n from 'i18n';

import { Request, Response, NextFunction, RequestHandler } from 'express';

i18n.configure({
  locales: ['en', 'ko', 'ja'],
  directory: `${__dirname}/locales`,
  defaultLocale: 'en',
  cookie: 'lang',
  header: 'language',
});

const middleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  i18n.init(req, res);
  res.locals.__ = res.__;
  return next();
};

export default middleware;
