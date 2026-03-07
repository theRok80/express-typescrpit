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
exports.prepare = prepare;
exports.webhook = webhook;
const constants_1 = require("../constants");
const debug_1 = __importDefault(require("debug"));
const handler = __importStar(require("../handlers/payment"));
const common_1 = require("../tools/common");
const debug = (0, debug_1.default)('dev.managers.payment');
function prepare(props) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const { uuid } = props;
        const { pg, method, productId } = props === null || props === void 0 ? void 0 : props.requestParams;
        const userId = (_a = props === null || props === void 0 ? void 0 : props.tokenData) === null || _a === void 0 ? void 0 : _a.userId;
        try {
            yield handler.generateOrderId();
            const productData = yield handler.getProductData(props === null || props === void 0 ? void 0 : props.requestParams);
            if (!productData) {
                throw new Error('Product not found');
            }
            const orderId = yield handler.getOrderId(uuid);
            const amount = yield getAmountFromPrice({
                userId,
                productId,
                price: productData.price,
            });
            yield handler.setLogPayment({
                uuid,
                orderId,
                userId,
                productId,
                price: productData.price,
                amount,
                pg,
                method,
                status: constants_1.PAYMENT_STATUS.PROCESSING,
            });
            return orderId;
        }
        catch (e) {
            yield handler.setLogPayment({
                uuid,
                userId,
                productId,
                pg,
                method,
                status: constants_1.PAYMENT_STATUS.ERROR,
                errorMessage: (0, common_1.getErrorMessage)(e),
            });
            throw e;
        }
    });
}
function getAmountFromPrice(_a) {
    return __awaiter(this, arguments, void 0, function* ({ userId, productId, price, }) {
        try {
            return price;
        }
        catch (e) {
            debug.extend('getAmountFromPrice')(e);
            return price;
        }
    });
}
function webhook(pg, props) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            switch (pg) {
                case 'stripe':
                    return STRIPE.webhook(props);
                default:
                    throw new Error('Invalid PG');
            }
        }
        catch (e) {
            debug.extend('webhook:error')(e);
            throw e;
        }
    });
}
const STRIPE = {
    name: 'stripe',
    webhook(props) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const orderId = (_a = props === null || props === void 0 ? void 0 : props.requestParams) === null || _a === void 0 ? void 0 : _a.orderId;
            const requestStatus = (_b = props === null || props === void 0 ? void 0 : props.requestParams) === null || _b === void 0 ? void 0 : _b.orderStatus;
            const webhookLogId = props === null || props === void 0 ? void 0 : props.webhookLogId;
            let status;
            switch (requestStatus) {
                case 'pending':
                    status = constants_1.PAYMENT_STATUS.PENDING;
                    break;
                case 'success':
                    status = constants_1.PAYMENT_STATUS.SUCCESS;
                    break;
                case 'failed':
                    status = constants_1.PAYMENT_STATUS.FAILED;
                    break;
                case 'cancelled':
                    status = constants_1.PAYMENT_STATUS.CANCELLED;
                    break;
                case 'refunded':
                    status = constants_1.PAYMENT_STATUS.REFUNDED;
                default:
                    throw new Error('Invalid status');
            }
            const logPayment = yield handler.getLogPayment(orderId);
            const userId = logPayment === null || logPayment === void 0 ? void 0 : logPayment.userId;
            const newRequestParams = Object.assign(Object.assign({}, props.requestParams), { status,
                orderId, logData: logPayment });
            try {
                if (status === constants_1.PAYMENT_STATUS.SUCCESS) {
                    yield STRIPE.success(Object.assign(Object.assign({}, props), { requestParams: newRequestParams }));
                }
                else if (status === constants_1.PAYMENT_STATUS.REFUNDED) {
                    yield STRIPE.refunded(Object.assign(Object.assign({}, props), { requestParams: newRequestParams }));
                }
                else {
                    yield STRIPE.failed(Object.assign(Object.assign({}, props), { requestParams: newRequestParams }));
                }
                yield handler.updateWebhookLog({
                    id: webhookLogId,
                    status,
                });
                const { uuid, orderId, userId, productId, pg, method } = logPayment;
                yield handler.setLogPayment({
                    uuid,
                    orderId,
                    userId,
                    productId,
                    pg,
                    method,
                    status,
                });
                yield handler.removeWorkWebhook({ orderId });
                return { message: 'done' };
            }
            catch (e) {
                debug.extend('STRIPE.webhook:error')(e);
                yield handler.updateWebhookLog({
                    id: webhookLogId,
                    status: constants_1.PAYMENT_STATUS.ERROR,
                    result: (0, common_1.getErrorMessage)(e),
                });
                yield handler.setLogPayment({
                    uuid: logPayment === null || logPayment === void 0 ? void 0 : logPayment.uuid,
                    orderId,
                    userId,
                    productId: logPayment === null || logPayment === void 0 ? void 0 : logPayment.productId,
                    pg: STRIPE.name,
                    method: logPayment === null || logPayment === void 0 ? void 0 : logPayment.method,
                    status: constants_1.PAYMENT_STATUS.ERROR,
                    errorMessage: (0, common_1.getErrorMessage)(e),
                });
                throw e;
            }
        });
    },
    success: function (props) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error('test');
        });
    },
    failed: function (props) {
        return __awaiter(this, void 0, void 0, function* () {
        });
    },
    refunded: function (props) {
        return __awaiter(this, void 0, void 0, function* () {
        });
    },
};
//# sourceMappingURL=payment.js.map