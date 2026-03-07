"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = propsInit;
const debug_1 = __importDefault(require("debug"));
const net_1 = __importDefault(require("net"));
const ip_address_1 = require("ip-address");
const uuid_1 = require("uuid");
const express_useragent_1 = require("express-useragent");
const debug = (0, debug_1.default)('dev:middlewares:propsInit');
function propsInit(req, res, next) {
    var _a, _b;
    req.uuid = (0, uuid_1.v4)();
    req.tempIp = req.ip || req.connection.remoteAddress;
    if (typeof req.headers['x-forwarded-for'] === 'string') {
        req.tempIp = req.headers['x-forwarded-for'].split(',')[0].trim();
    }
    else if (req.headers['x-real-ip']) {
        req.tempIp = req.headers['x-real-ip'];
    }
    const tempIp = req.tempIp;
    const ipType = net_1.default.isIP(tempIp);
    if (ipType === 4) {
        req.clientIp = tempIp;
    }
    else if (ipType === 6) {
        try {
            const addr6 = new ip_address_1.Address6(tempIp);
            const teredo = addr6.inspectTeredo();
            req.clientIp = (_a = teredo === null || teredo === void 0 ? void 0 : teredo.client4) !== null && _a !== void 0 ? _a : tempIp;
        }
        catch (_c) {
            req.clientIp = tempIp;
        }
        req.clientIpV6 = tempIp;
    }
    else if (tempIp === '::1') {
        req.clientIp = '0.0.0.1';
    }
    else if (tempIp.indexOf('::ffff:') >= 0) {
        req.clientIp = tempIp.replace('::ffff:', '');
    }
    else {
        req.clientIp = '0';
    }
    req.props = {
        headers: req.headers,
        body: req.body,
        query: req.query,
        params: req.params,
        uuid: req.uuid,
        clientIp: req.clientIp,
        useragent: express_useragent_1.useragent.parse((_b = req.headers['user-agent']) !== null && _b !== void 0 ? _b : ''),
        requestParams: Object.assign(Object.assign({}, req.body), req.query),
    };
    next();
}
//# sourceMappingURL=propsInit.js.map