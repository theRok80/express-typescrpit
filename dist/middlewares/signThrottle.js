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
exports.default = signThrottle;
const debug_1 = __importDefault(require("debug"));
const redisCache_1 = require("../tools/redisCache");
const response = __importStar(require("../tools/response"));
const debug = (0, debug_1.default)('dev:middlewares:signThrottle');
function signThrottle(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const ipTtl = 60;
            const maxRequestsPerMinute = 10;
            const { clientIp } = req.props;
            if (!clientIp) {
                throw new Error('Client IP is required');
            }
            let signType = 'others';
            if (req.originalUrl.includes('sign/up')) {
                signType = 'signUp';
            }
            else if (req.originalUrl.includes('sign/in')) {
                signType = 'signIn';
            }
            const key = `${signType}:throttle:${clientIp}`;
            const currentCount = yield (0, redisCache_1.get)(key);
            if (currentCount && typeof currentCount === 'number' && currentCount >= maxRequestsPerMinute) {
                throw new Error('Too many requests');
            }
            if (typeof currentCount !== 'number') {
                yield (0, redisCache_1.remove)(key);
            }
            yield (0, redisCache_1.incr)(key);
            yield (0, redisCache_1.expire)(key, ipTtl);
            next();
        }
        catch (e) {
            debug.extend('signThrottle:error')(e);
            response.error(req, res, e);
        }
    });
}
//# sourceMappingURL=signThrottle.js.map