import { Router, Request, Response } from 'express';
import { formValidationResult } from '../../tools/common';
import { check } from 'express-validator';
import { prepare } from '../../controllers/v1/payment';
import addParamsToProps from '../../middlewares/addParamsToProps';

const router = Router();

router.post(
  '/prepare/:productId',
  check('pg').isString(),
  formValidationResult,
  addParamsToProps,
  prepare
);

router.post('/', (req: Request, res: Response): void => {
  res.send('Hello World');
});

export default router;
