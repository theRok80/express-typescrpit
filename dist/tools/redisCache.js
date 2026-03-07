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
exports.get = get;
exports.set = set;
exports.keys = keys;
exports.remove = remove;
exports.keyName = keyName;
exports.keyNameWithoutSalt = keyNameWithoutSalt;
exports.mget = mget;
exports.zget = zget;
exports.zcard = zcard;
exports.zrem = zrem;
exports.zadd = zadd;
exports.incr = incr;
exports.expire = expire;
const ioredis_1 = __importDefault(require("ioredis"));
const constants_1 = require("../constants");
const common_1 = require("./common");
const client = new ioredis_1.default();
const slaveClient = new ioredis_1.default();
function keyName(key) {
    if (key.includes(`${constants_1.ENVIRONMENT}:`)) {
        return key;
    }
    return constants_1.ENVIRONMENT + ':' + key;
}
function keyNameWithoutSalt(key) {
    const replaceKey = key.replace(/\//g, ':').replace(/-/g, ':').split(':');
    replaceKey.pop();
    return replaceKey.join(':');
}
function get(key) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!key) {
            throw new Error('key is required');
        }
        const cacheKey = keyName(key);
        try {
            const data = yield slaveClient.get(cacheKey);
            if (data) {
                return (0, common_1.jsonParse)(data);
            }
            throw new Error('not found');
        }
        catch (e) {
            return undefined;
        }
    });
}
function set(key_1, value_1) {
    return __awaiter(this, arguments, void 0, function* (key, value, ttl = 60) {
        if (!key || value == null) {
            throw new Error('invalid params');
        }
        const cacheKey = keyName(key);
        try {
            const serialized = typeof value === 'string' ? value : (0, common_1.jsonStringify)(value);
            yield client.set(cacheKey, serialized, 'EX', ttl);
        }
        catch (e) {
            console.log('redisCache set error', e);
            throw e;
        }
    });
}
function remove(key) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!key) {
            throw new Error('key is required');
        }
        try {
            const targetKeys = yield keys(key);
            yield Promise.all(targetKeys.map((k) => client.del(k)));
        }
        catch (e) {
            console.log('redisCache remove error', e);
            throw e;
        }
    });
}
function keys(key_1) {
    return __awaiter(this, arguments, void 0, function* (key, noSalt = false) {
        try {
            if (key) {
                const [, keys] = yield client.scan(0, 'MATCH', `*${noSalt ? keyNameWithoutSalt(key) : key}*`, 'COUNT', 100);
                return keys;
            }
            else {
                const [, keys] = yield client.scan(0, 'MATCH', `${constants_1.ENVIRONMENT}:*`, 'COUNT', 9999);
                return keys;
            }
        }
        catch (e) {
            console.log('redisCache remove error', e);
            throw e;
        }
    });
}
function mget(keys) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!keys || !Array.isArray(keys) || keys.length === 0) {
            throw new Error('keys array is required');
        }
        const cacheKeys = keys.map((key) => keyName(key));
        try {
            const data = yield slaveClient.mget(cacheKeys);
            return data.map((item) => (item ? (0, common_1.jsonParse)(item) : undefined));
        }
        catch (e) {
            return keys.map(() => undefined);
        }
    });
}
function zget(_a) {
    return __awaiter(this, arguments, void 0, function* ({ key, offset = 0, limit = -1, order = 'asc', }) {
        if (!key) {
            throw new Error('key is required');
        }
        const cacheKey = key === 'order' ? key : keyName(key);
        const start = offset;
        const stop = limit === -1 ? -1 : offset + limit - 1;
        if (order === 'desc') {
            return yield slaveClient.zrevrange(cacheKey, start, stop);
        }
        return yield slaveClient.zrange(cacheKey, start, stop);
    });
}
function zcard(_a) {
    return __awaiter(this, arguments, void 0, function* ({ key }) {
        if (!key) {
            throw new Error('key is required');
        }
        const cacheKey = key === 'order' ? key : keyName(key);
        return yield slaveClient.zcard(cacheKey);
    });
}
function zrem(_a) {
    return __awaiter(this, arguments, void 0, function* ({ key, members }) {
        if (!key) {
            throw new Error('key is required');
        }
        if (!members || !Array.isArray(members) || members.length === 0) {
            throw new Error('members array is required');
        }
        const cacheKey = key === 'order' ? key : keyName(key);
        return yield client.zrem(cacheKey, ...members);
    });
}
function zadd(_a) {
    return __awaiter(this, arguments, void 0, function* ({ key, data, ttl, }) {
        var _b;
        if (!key) {
            throw new Error('key is required');
        }
        if (!data || !Array.isArray(data) || data.length === 0) {
            throw new Error('data array is required');
        }
        const cacheKey = key === 'order' ? key : keyName(key);
        const args = data.flatMap((item) => [item.score, item.member]);
        if (ttl) {
            const pipeline = client.pipeline();
            pipeline.zadd(cacheKey, ...args);
            pipeline.expire(cacheKey, ttl);
            const result = yield pipeline.exec();
            return (_b = result === null || result === void 0 ? void 0 : result.length) !== null && _b !== void 0 ? _b : 0;
        }
        return yield client.zadd(cacheKey, ...args);
    });
}
function incr(key) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!key) {
            throw new Error('key is required');
        }
        return yield client.incr(key);
    });
}
function expire(key, ttl) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!key) {
            throw new Error('key is required');
        }
        return yield client.expire(key, ttl);
    });
}
//# sourceMappingURL=redisCache.js.map