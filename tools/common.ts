import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import * as response from './response';
import { JsonStringified } from '../types/variables';

function isLocalhost(ip: string) {
  return ip === '127.0.0.1' || ip === '::1';
}

function formValidationResult(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // 에러 확인은 내부만 가능하도록
    if (
      process.env?.ENVIRONMENT !== 'production' ||
      isLocalhost(req.clientIp)
    ) {
      return response.notValid(req, res, errors.array());
    }
    return response.sendStatus(req, res, 400);
  }
  return next();
}

/**
 * Stringify object to JSON string
 *
 * @param data object or string
 * @returns
 */
function jsonStringify<T>(data: T): JsonStringified<T> {
  if (typeof data === 'string') {
    return data;
  }
  return JSON.stringify(data);
}

/**
 * Parse JSON string to object
 *
 * @param data string or object
 * @returns
 */
function jsonParse(data: string | object): object {
  if (typeof data === 'string') {
    return JSON.parse(data);
  }

  return data;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return error?.toString() || (error as string);
}

export { formValidationResult, jsonStringify, jsonParse, getErrorMessage };
