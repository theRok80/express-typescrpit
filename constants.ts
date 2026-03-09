import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import duration from 'dayjs/plugin/duration';
import isBetween from 'dayjs/plugin/isBetween';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import weekday from 'dayjs/plugin/weekday';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(duration);
dayjs.extend(isBetween);
dayjs.extend(advancedFormat);
dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.extend(weekday);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const ENVIRONMENT = process.env.ENVIRONMENT || 'development';
const PAYMENT_STATUS = {
  PROCESSING: 1,
  SUCCESS: 2,
  FAILED: 3,
  CANCELLED: 4,
  REFUNDED: 5,
  PENDING: 6,
  ERROR: 9,
};
const USER_TOKEN_TTL = 60 * 60 * 24 * 30; // 30 days
const DEFAULT_TIMEZONE = 'Asia/Seoul';
const CURRENT_DAY = function (): dayjs.Dayjs {
  return dayjs().tz(DEFAULT_TIMEZONE);
};
const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
const DATE_FORMAT = 'YYYY-MM-DD';
const CURRENT_DATETIME = function (): string {
  return CURRENT_DAY().format(DATETIME_FORMAT);
};
const CURRENT_DATE = function (): string {
  return CURRENT_DAY().format(DATE_FORMAT);
};
const ORDER_ID_STATUS = {
  AVAILABLE: 0,
  PROCESSING: 1,
  USED: 2,
};
const PAYMENT_PG = {
  stripe: ['card', 'apple', 'google'],
};
const AVAILABLE_PAYMENT_PG = Object.keys(PAYMENT_PG);
const COIN_TYPE = {
  NORMAL: 1,
  BONUS: 2,
  PROMOTION: 3,
};

export {
  dayjs,
  ENVIRONMENT,
  PAYMENT_STATUS,
  USER_TOKEN_TTL,
  DEFAULT_TIMEZONE,
  CURRENT_DAY,
  DATETIME_FORMAT,
  DATE_FORMAT,
  CURRENT_DATETIME,
  CURRENT_DATE,
  ORDER_ID_STATUS,
  PAYMENT_PG,
  AVAILABLE_PAYMENT_PG,
  COIN_TYPE,
};
