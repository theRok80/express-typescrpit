import express, { Request, Response } from 'express';
import { check } from 'express-validator';
import { formValidationResult } from '../../tools/common';
import { signUp, signIn } from '../../controllers/v1/user';

const router = express.Router();

router.post(
  '/signUp',
  check('email').isEmail(),
  check('password').isLength({ min: 8 }),
  formValidationResult,
  signUp
);

router.post(
  '/signIn',
  check('email').isEmail(),
  check('password').isLength({ min: 8 }),
  formValidationResult,
  signIn
);

export default router;
