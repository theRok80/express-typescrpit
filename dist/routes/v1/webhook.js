"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const addParamsToProps_1 = __importDefault(require("../../middlewares/addParamsToProps"));
const addWebhookLog_1 = __importDefault(require("../../middlewares/addWebhookLog"));
const payment_1 = require("../../controllers/v1/payment");
const router = express_1.default.Router();
router.post('/:pg/:orderId', addParamsToProps_1.default, addWebhookLog_1.default, payment_1.webhook);
exports.default = router;
//# sourceMappingURL=webhook.js.map