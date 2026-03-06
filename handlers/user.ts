import crypto from 'crypto';
import Debug from 'debug';
import { executeQuery } from '../tools/database';
import tables from '../tools/tables';
import { UserId } from '../types/variables';
import { User } from '../types/tables/user';
import { Props } from '../types/props';
import { LogSign } from '../types/tables/sign';
import { CURRENT_DATETIME } from '../constants';

const debug = Debug('dev:handlers:user');

/**
 * Make password hash
 *
 * @param password password to hash
 * @returns hashed password
 */
function makePasswordHash(password: string): string {
  if (!password) {
    throw new Error('Password is required');
  }

  return crypto
    .createHmac('sha256', process.env.SECRET_SALT as string)
    .update(password)
    .digest('hex');
}

/**
 * Check if email exists
 *
 * @param email email to check
 * @returns true if email exists, false otherwise
 */
async function isEmailExists(email: string): Promise<boolean> {
  const [rows] = await executeQuery({
    printName: 'user.isEmailExists',
    //print: true,
    table: tables.user.main,
    action: 'select',
    where: {
      email,
    },
  });

  return rows.length > 0;
}

/**
 * Create user
 *
 * @param email email to create
 * @param password password to create
 * @param name name to create
 * @param clientIp client IP to create
 * @returns user ID
 */
async function createUser({
  email,
  password,
  name,
  clientIp,
}: {
  email: string;
  password: string;
  name: string;
  clientIp: string;
}): Promise<UserId> {
  const passwordHash = makePasswordHash(password);

  const [{ insertId }] = await executeQuery({
    printName: 'user.createUser',
    //print: true,
    table: tables.user.main,
    action: 'insert',
    set: { email, password: passwordHash, name, clientIp },
  });

  return insertId as UserId;
}

/**
 * Get user by email
 *
 * @param email email to sign in
 * @returns user
 */
async function getUserByEmail({ email }: Pick<User, 'email'>): Promise<User | undefined> {
  if (!email) {
    throw new Error('Email is required');
  }

  try {
    const [rows] = await executeQuery({
      printName: 'user.getUserByEmail',
      //print: true,
      table: tables.user.main,
      action: 'select',
      where: { email },
    });

    return rows?.[0] as User | undefined;
  } catch (e) {
    debug.extend('getUserByEmail:error')(e);
    throw e;
  }
}

async function addLogSign({
  type,
  props,
  result,
  token,
  errorMessage,
  expiredAt,
}: {
  type: LogSign['type'];
  props: Props;
  result: LogSign['result'];
  token?: LogSign['token'];
  errorMessage?: LogSign['errorMessage'];
  expiredAt?: LogSign['expiredAt'];
}): Promise<void> {
  const { uuid, clientIp } = props;
  const { email } = props.requestParams as Pick<User, 'email'>;

  if (!uuid || !email) {
    return;
  }

  try {
    await executeQuery({
      printName: 'user.addLogSign',
      //print: true,
      table: tables.sign.log,
      action: 'insert',
      set: {
        uuid,
        email,
        token,
        clientIp,
        type,
        result,
        errorMessage,
        createdAt: CURRENT_DATETIME,
        expiredAt,
      },
    });
  } catch (e) {
    debug.extend('addLogSign:error')(e);
    throw e;
  }
}

async function getLiveSignTokens(email: string): Promise<LogSign[]> {
  if (!email) {
    throw new Error('Email is required');
  }

  try {
    const [rows] = await executeQuery({
      printName: 'user.getLiveSignTokens',
      //print: true,
      table: tables.sign.log,
      action: 'select',
      where: {
        email,
        type: 'signIn',
        result: 'success',
        statement: ['`token` IS NOT NULL', ` \`expiredAt\` > '${CURRENT_DATETIME}'`],
      },
    });

    return rows as LogSign[];
  } catch (e) {
    debug.extend('getLiveSignTokens:error')(e);
    throw e;
  }
}

export {
  makePasswordHash,
  isEmailExists,
  createUser,
  getUserByEmail,
  addLogSign,
  getLiveSignTokens,
};
