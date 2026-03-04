import { Request, Response } from 'express';

async function webhook(req: Request, res: Response) {
  res.send('webhook received');
}

export { webhook };
