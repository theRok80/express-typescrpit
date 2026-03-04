import express, { Request, Response } from 'express';
import { check } from 'express-validator';
import { formValidationResult } from '../../tools/common';
import { signUp, signIn } from '../../controllers/v1/sign';
import signThrottle from '../../middlewares/signThrottle';

const router = express.Router();

router.post(
  '/up',
  check('email').isEmail(),
  check('password').isLength({ min: 8 }),
  formValidationResult,
  signThrottle,
  signUp
);

router.post(
  '/in',
  check('email').isEmail(),
  check('password').isLength({ min: 8 }),
  formValidationResult,
  signThrottle,
  signIn
);

export default router;
