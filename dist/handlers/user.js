"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makePasswordHash = makePasswordHash;
exports.isEmailExists = isEmailExists;
exports.createUser = createUser;
exports.getUserByEmail = getUserByEmail;
exports.addLogSign = addLogSign;
exports.getLiveSignTokens = getLiveSignTokens;
const crypto_1 = __importDefault(require("crypto"));
const debug_1 = __importDefault(require("debug"));
const database_1 = require("../tools/database");
const tables_1 = __importDefault(require("../tools/tables"));
const constants_1 = require("../constants");
const debug = (0, debug_1.default)('dev:handlers:user');
function makePasswordHash(password) {
    if (!password) {
        throw new Error('Password is required');
    }
    return crypto_1.default
        .createHmac('sha256', process.env.SECRET_SALT)
        .update(password)
        .digest('hex');
}
function isEmailExists(email) {
    return __awaiter(this, void 0, void 0, function* () {
        const [rows] = yield (0, database_1.executeQuery)({
            printName: 'user.isEmailExists',
            table: tables_1.default.user.main,
            action: 'select',
            where: {
                email,
            },
        });
        return rows.length > 0;
    });
}
function createUser(_a) {
    return __awaiter(this, arguments, void 0, function* ({ email, password, name, clientIp, }) {
        const passwordHash = makePasswordHash(password);
        const [{ insertId }] = yield (0, database_1.executeQuery)({
            printName: 'user.createUser',
            table: tables_1.default.user.main,
            action: 'insert',
            set: { email, password: passwordHash, name, clientIp },
        });
        return insertId;
    });
}
function getUserByEmail(_a) {
    return __awaiter(this, arguments, void 0, function* ({ email }) {
        if (!email) {
            throw new Error('Email is required');
        }
        try {
            const [rows] = yield (0, database_1.executeQuery)({
                printName: 'user.getUserByEmail',
                table: tables_1.default.user.main,
                action: 'select',
                where: { email },
            });
            return rows === null || rows === void 0 ? void 0 : rows[0];
        }
        catch (e) {
            debug.extend('getUserByEmail:error')(e);
            throw e;
        }
    });
}
function addLogSign(_a) {
    return __awaiter(this, arguments, void 0, function* ({ type, props, result, token, errorMessage, expiredAt, }) {
        const { uuid, clientIp } = props;
        const { email } = props.requestParams;
        if (!uuid || !email) {
            return;
        }
        try {
            yield (0, database_1.executeQuery)({
                printName: 'user.addLogSign',
                table: tables_1.default.sign.log,
                action: 'insert',
                set: {
                    uuid,
                    email,
                    token,
                    clientIp,
                    type,
                    result,
                    errorMessage,
                    createdAt: constants_1.CURRENT_DATETIME,
                    expiredAt,
                },
            });
        }
        catch (e) {
            debug.extend('addLogSign:error')(e);
            throw e;
        }
    });
}
function getLiveSignTokens(email) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!email) {
            throw new Error('Email is required');
        }
        try {
            const [rows] = yield (0, database_1.executeQuery)({
                printName: 'user.getLiveSignTokens',
                table: tables_1.default.sign.log,
                action: 'select',
                where: {
                    email,
                    type: 'signIn',
                    result: 'success',
                    statement: ['`token` IS NOT NULL', ` \`expiredAt\` > '${constants_1.CURRENT_DATETIME}'`],
                },
            });
            return rows;
        }
        catch (e) {
            debug.extend('getLiveSignTokens:error')(e);
            throw e;
        }
    });
}
//# sourceMappingURL=user.js.map