import { Router, Request, Response } from 'express';
import { formValidationResult } from '../../tools/common';
import { check } from 'express-validator';
import { prepare } from '../../controllers/v1/payment';

const router = Router();

router.post('/prepare/:pg', check('productId').isInt(), formValidationResult, prepare);

router.post('/', (req: Request, res: Response): void => {
  res.send('Hello World');
});

export default router;
