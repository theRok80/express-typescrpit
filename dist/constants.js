"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AVAILABLE_PAYMENT_PG = exports.PAYMENT_PG = exports.ORDER_ID_STATUS = exports.CURRENT_DATE = exports.CURRENT_DATETIME = exports.DATE_FORMAT = exports.DATETIME_FORMAT = exports.CURRENT_DAY = exports.DEFAULT_TIMEZONE = exports.USER_TOKEN_TTL = exports.PAYMENT_STATUS = exports.ENVIRONMENT = exports.dayjs = void 0;
const dayjs_1 = __importDefault(require("dayjs"));
exports.dayjs = dayjs_1.default;
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
const timezone_1 = __importDefault(require("dayjs/plugin/timezone"));
const duration_1 = __importDefault(require("dayjs/plugin/duration"));
const isBetween_1 = __importDefault(require("dayjs/plugin/isBetween"));
const advancedFormat_1 = __importDefault(require("dayjs/plugin/advancedFormat"));
const weekOfYear_1 = __importDefault(require("dayjs/plugin/weekOfYear"));
const isoWeek_1 = __importDefault(require("dayjs/plugin/isoWeek"));
const weekday_1 = __importDefault(require("dayjs/plugin/weekday"));
const isSameOrAfter_1 = __importDefault(require("dayjs/plugin/isSameOrAfter"));
const isSameOrBefore_1 = __importDefault(require("dayjs/plugin/isSameOrBefore"));
dayjs_1.default.extend(utc_1.default);
dayjs_1.default.extend(timezone_1.default);
dayjs_1.default.extend(duration_1.default);
dayjs_1.default.extend(isBetween_1.default);
dayjs_1.default.extend(advancedFormat_1.default);
dayjs_1.default.extend(weekOfYear_1.default);
dayjs_1.default.extend(isoWeek_1.default);
dayjs_1.default.extend(weekday_1.default);
dayjs_1.default.extend(isSameOrAfter_1.default);
dayjs_1.default.extend(isSameOrBefore_1.default);
const ENVIRONMENT = process.env.ENVIRONMENT || 'development';
exports.ENVIRONMENT = ENVIRONMENT;
const PAYMENT_STATUS = {
    PROCESSING: 1,
    SUCCESS: 2,
    FAILED: 3,
    CANCELLED: 4,
    REFUNDED: 5,
    PENDING: 6,
    ERROR: 9,
};
exports.PAYMENT_STATUS = PAYMENT_STATUS;
const USER_TOKEN_TTL = 60 * 60 * 24 * 30;
exports.USER_TOKEN_TTL = USER_TOKEN_TTL;
const DEFAULT_TIMEZONE = 'Asia/Seoul';
exports.DEFAULT_TIMEZONE = DEFAULT_TIMEZONE;
const CURRENT_DAY = (0, dayjs_1.default)().tz(DEFAULT_TIMEZONE);
exports.CURRENT_DAY = CURRENT_DAY;
const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
exports.DATETIME_FORMAT = DATETIME_FORMAT;
const DATE_FORMAT = 'YYYY-MM-DD';
exports.DATE_FORMAT = DATE_FORMAT;
const CURRENT_DATETIME = CURRENT_DAY.format(DATETIME_FORMAT);
exports.CURRENT_DATETIME = CURRENT_DATETIME;
const CURRENT_DATE = CURRENT_DAY.format(DATE_FORMAT);
exports.CURRENT_DATE = CURRENT_DATE;
const ORDER_ID_STATUS = {
    AVAILABLE: 0,
    PROCESSING: 1,
    USED: 2,
};
exports.ORDER_ID_STATUS = ORDER_ID_STATUS;
const PAYMENT_PG = {
    stripe: ['card', 'apple', 'google'],
};
exports.PAYMENT_PG = PAYMENT_PG;
const AVAILABLE_PAYMENT_PG = Object.keys(PAYMENT_PG);
exports.AVAILABLE_PAYMENT_PG = AVAILABLE_PAYMENT_PG;
//# sourceMappingURL=constants.js.map