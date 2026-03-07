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
exports.generateOrderId = generateOrderId;
exports.getOrderId = getOrderId;
exports.addWebhookLog = addWebhookLog;
exports.updateWebhookLog = updateWebhookLog;
exports.getProductData = getProductData;
exports.setLogPayment = setLogPayment;
exports.getLogPayment = getLogPayment;
exports.removeWorkWebhook = removeWorkWebhook;
const debug_1 = __importDefault(require("debug"));
const common_1 = require("../tools/common");
const database_1 = require("../tools/database");
const tables_1 = __importDefault(require("../tools/tables"));
const constants_1 = require("../constants");
const debug = (0, debug_1.default)('dev.handlers.payment');
const orderIdMinimumCount = 100;
function generateOrderId() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const [rows] = yield (0, database_1.executeQuery)({
                printName: 'payment.generateOrderId',
                table: tables_1.default.payment.orderIdWarehouse,
                action: 'select',
                where: {
                    status: 0,
                },
            });
            if (rows.length < orderIdMinimumCount) {
                const orderIds = [];
                for (let i = 0; i < orderIdMinimumCount; i += 1) {
                    const orderId = Math.random().toString(36).substring(2).toUpperCase();
                    orderIds.push([orderId, 0]);
                }
                yield (0, database_1.executeQuery)({
                    printName: 'payment.generateOrderId',
                    table: tables_1.default.payment.orderIdWarehouse,
                    action: 'insert',
                    query: (0, database_1.bulkQueryBuilder)({
                        table: tables_1.default.payment.orderIdWarehouse,
                        columns: ['orderId', 'status'],
                        values: orderIds,
                    }),
                });
            }
        }
        catch (e) {
            debug.extend('generateOrderId')(e);
        }
    });
}
function getOrderId(uuid) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!uuid) {
            throw new Error('UUID is required');
        }
        try {
            const [rows] = yield (0, database_1.executeQuery)({
                printName: 'payment.getOrderId.select',
                table: tables_1.default.payment.orderIdWarehouse,
                action: 'select',
                where: {
                    status: constants_1.ORDER_ID_STATUS.AVAILABLE,
                },
                conditions: 'ORDER BY `createdAt` ASC LIMIT 10',
            });
            let orderId;
            let i = 0;
            do {
                const orderIdInRow = (_a = rows === null || rows === void 0 ? void 0 : rows[i]) === null || _a === void 0 ? void 0 : _a.orderId;
                if (!orderIdInRow) {
                    throw new Error('Order ID not found');
                }
                const [{ affectedRows }] = yield (0, database_1.executeQuery)({
                    printName: 'payment.getOrderId.update',
                    table: tables_1.default.payment.orderIdWarehouse,
                    action: 'update',
                    set: {
                        uuid,
                        status: constants_1.ORDER_ID_STATUS.USED,
                    },
                    where: {
                        orderId: orderIdInRow,
                    },
                });
                if (affectedRows) {
                    orderId = orderIdInRow;
                }
                i += 1;
            } while (!(orderId === null || orderId === void 0 ? void 0 : orderId.length));
            if (!(orderId === null || orderId === void 0 ? void 0 : orderId.length)) {
                throw new Error('Order ID not found');
            }
            return orderId;
        }
        catch (e) {
            debug.extend('getOrderId')(e);
            throw e;
        }
    });
}
function addWebhookLog(props) {
    return __awaiter(this, void 0, void 0, function* () {
        const { pg, orderId } = props.requestParams;
        const data = (0, common_1.jsonStringify)(props === null || props === void 0 ? void 0 : props.body);
        if (pg && orderId) {
            try {
                const [[{ insertId: logId }]] = yield Promise.all([
                    yield (0, database_1.executeQuery)({
                        printName: 'payment.addWebhookLog',
                        table: tables_1.default.payment.log.webhook,
                        action: 'ignore',
                        set: {
                            pg,
                            orderId,
                            data,
                        },
                    }),
                    yield (0, database_1.executeQuery)({
                        printName: 'payment.addWebhookLog',
                        table: tables_1.default.payment.work.webhook,
                        action: 'ignore',
                        set: {
                            pg,
                            orderId,
                            data,
                        },
                    }),
                ]);
                return logId;
            }
            catch (e) {
                debug.extend('addWebhookLog')(e);
                throw e;
            }
        }
    });
}
function updateWebhookLog(_a) {
    return __awaiter(this, arguments, void 0, function* ({ id, status, result }) {
        if (!id || !status) {
            return;
        }
        try {
            yield (0, database_1.executeQuery)({
                printName: 'payment.updateWebhookLog',
                table: tables_1.default.payment.log.webhook,
                action: 'update',
                set: {
                    status,
                    result,
                },
                where: {
                    id,
                },
            });
        }
        catch (e) {
            debug.extend('updateWebhookLog')(e);
            throw e;
        }
    });
}
function getProductData(_a) {
    return __awaiter(this, arguments, void 0, function* ({ productId, }) {
        if (!productId) {
            throw new Error('Product ID is required');
        }
        try {
            const [rows] = yield (0, database_1.executeQuery)({
                printName: 'payment.getProductData',
                table: tables_1.default.payment.product,
                action: 'select',
                where: {
                    productId,
                },
            });
            return rows === null || rows === void 0 ? void 0 : rows[0];
        }
        catch (e) {
            debug.extend('getProductData')(e);
            throw e;
        }
    });
}
function setLogPayment(_a) {
    return __awaiter(this, arguments, void 0, function* ({ uuid, orderId, userId, productId, price, amount, pg, method, status, errorMessage, }) {
        if (!uuid || !userId) {
            throw new Error('UUID and User ID are required');
        }
        try {
            const [{ affectedRows }] = yield (0, database_1.executeQuery)({
                printName: 'payment.setLogPayment',
                table: tables_1.default.payment.log.payment,
                action: 'duplicate',
                set: {
                    uuid,
                    userId,
                    orderId,
                    productId,
                    price,
                    amount,
                    pg,
                    method,
                    status,
                    errorMessage,
                },
                duplicate: {
                    amount,
                    pg,
                    method,
                    status,
                    errorMessage,
                },
            });
            return affectedRows;
        }
        catch (e) {
            debug.extend('setLogPayment')(e);
            throw e;
        }
    });
}
function getLogPayment(orderId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!orderId) {
            throw new Error('Order ID is required');
        }
        try {
            const [rows] = yield (0, database_1.executeQuery)({
                printName: 'payment.getLogPayment',
                table: tables_1.default.payment.log.payment,
                action: 'select',
                where: {
                    orderId,
                },
            });
            if (!(rows === null || rows === void 0 ? void 0 : rows.length)) {
                throw new Error('Log payment not found');
            }
            return rows === null || rows === void 0 ? void 0 : rows[0];
        }
        catch (e) {
            debug.extend('getLogPayment')(e);
            throw e;
        }
    });
}
function removeWorkWebhook(_a) {
    return __awaiter(this, arguments, void 0, function* ({ orderId, }) {
        if (!orderId) {
            return;
        }
        try {
            yield (0, database_1.executeQuery)({
                printName: 'payment.removeWorkWebhook',
                print: true,
                table: tables_1.default.payment.work.webhook,
                action: 'delete',
                where: {
                    orderId,
                },
            });
        }
        catch (e) {
            debug.extend('removeWorkWebhook')(e);
            throw e;
        }
    });
}
//# sourceMappingURL=payment.js.map