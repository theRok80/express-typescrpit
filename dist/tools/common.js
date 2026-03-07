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
Object.defineProperty(exports, "__esModule", { value: true });
exports.formValidationResult = formValidationResult;
exports.jsonStringify = jsonStringify;
exports.jsonParse = jsonParse;
exports.getErrorMessage = getErrorMessage;
const express_validator_1 = require("express-validator");
const response = __importStar(require("./response"));
function isLocalhost(ip) {
    return ip === '127.0.0.1' || ip === '::1';
}
function formValidationResult(req, res, next) {
    var _a;
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        if (((_a = process.env) === null || _a === void 0 ? void 0 : _a.ENVIRONMENT) !== 'production' ||
            isLocalhost(req.clientIp)) {
            return response.notValid(req, res, errors.array());
        }
        return response.sendStatus(req, res, 400);
    }
    return next();
}
function jsonStringify(data) {
    if (typeof data === 'string') {
        return data;
    }
    return JSON.stringify(data);
}
function jsonParse(data) {
    if (typeof data === 'string') {
        return JSON.parse(data);
    }
    return data;
}
function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return (error === null || error === void 0 ? void 0 : error.toString()) || error;
}
//# sourceMappingURL=common.js.map