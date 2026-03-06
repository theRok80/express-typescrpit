import { Router } from 'express';
import { formValidationResult } from '../../tools/common';
import { check } from 'express-validator';
import { prepare } from '../../controllers/v1/payment';
import addParamsToProps from '../../middlewares/addParamsToProps';
import { AVAILABLE_PAYMENT_PG } from '../../constants';

const router = Router();

router.post(
  '/prepare/:productId',
  check('pg').isIn(AVAILABLE_PAYMENT_PG),
  check('method').isString(),
  formValidationResult,
  addParamsToProps,
  prepare
);

export default router;
