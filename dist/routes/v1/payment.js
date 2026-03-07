"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const common_1 = require("../../tools/common");
const express_validator_1 = require("express-validator");
const payment_1 = require("../../controllers/v1/payment");
const addParamsToProps_1 = __importDefault(require("../../middlewares/addParamsToProps"));
const constants_1 = require("../../constants");
const router = (0, express_1.Router)();
router.post('/prepare/:productId', (0, express_validator_1.check)('pg').isIn(constants_1.AVAILABLE_PAYMENT_PG), (0, express_validator_1.check)('method').isString(), common_1.formValidationResult, addParamsToProps_1.default, payment_1.prepare);
exports.default = router;
//# sourceMappingURL=payment.js.map