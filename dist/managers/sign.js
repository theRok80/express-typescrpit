"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.signUp = signUp;
exports.signIn = signIn;
const debug_1 = __importDefault(require("debug"));
const uuid_1 = require("uuid");
const userHandler = __importStar(require("../handlers/user"));
const redis = __importStar(require("../tools/redisCache"));
const common_1 = require("../tools/common");
const constants_1 = require("../constants");
const debug = (0, debug_1.default)('dev:managers:user');
function signUp(props) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const clientIp = props.clientIp;
            const { email, password, name } = props.requestParams;
            if (yield userHandler.isEmailExists(email)) {
                throw new Error('Email already exists');
            }
            yield userHandler.addLogSign({ type: 'signUp', props, result: 'success' });
            return userHandler.createUser({ email, password, name, clientIp });
        }
        catch (e) {
            debug.extend('signUp:error')(e);
            yield userHandler.addLogSign({
                type: 'signUp',
                props,
                result: 'failed',
                errorMessage: (0, common_1.getErrorMessage)(e),
            });
            throw e;
        }
    });
}
function signIn(props) {
    return __awaiter(this, void 0, void 0, function* () {
        const { email, password } = props.requestParams;
        try {
            const row = yield userHandler.getUserByEmail({ email });
            if (!row) {
                throw new Error('User not found');
            }
            const hashedPassword = userHandler.makePasswordHash(password);
            if (hashedPassword !== row.password) {
                throw new Error('Invalid password');
            }
            const rows = yield userHandler.getLiveSignTokens(email);
            yield Promise.all(rows.map(row => redis.remove(`user:token:${row.token}`)));
            const token = (0, uuid_1.v4)();
            const tokenExpiredAt = constants_1.CURRENT_DAY.add(constants_1.USER_TOKEN_TTL, 'seconds').format(constants_1.DATETIME_FORMAT);
            const userRedisData = Object.assign(Object.assign({}, row), { signedInAt: constants_1.CURRENT_DATETIME, expiredAt: tokenExpiredAt });
            yield redis.set(`user:token:${token}`, (0, common_1.jsonStringify)(userRedisData), constants_1.USER_TOKEN_TTL);
            yield userHandler.addLogSign({
                type: 'signIn',
                props,
                result: 'success',
                token,
                expiredAt: tokenExpiredAt,
            });
            return {
                token,
                userId: row.userId,
                email: row.email,
                name: row.name,
            };
        }
        catch (e) {
            debug.extend('signIn:error')(e);
            yield userHandler.addLogSign({
                type: 'signIn',
                props,
                result: 'failed',
                errorMessage: (0, common_1.getErrorMessage)(e),
            });
            throw e;
        }
    });
}
//# sourceMappingURL=sign.js.map