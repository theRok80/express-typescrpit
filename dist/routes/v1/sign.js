"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const common_1 = require("../../tools/common");
const sign_1 = require("../../controllers/v1/sign");
const signThrottle_1 = __importDefault(require("../../middlewares/signThrottle"));
const router = express_1.default.Router();
router.post('/up', (0, express_validator_1.check)('email').isEmail(), (0, express_validator_1.check)('password').isLength({ min: 8 }), common_1.formValidationResult, signThrottle_1.default, sign_1.signUp);
router.post('/in', (0, express_validator_1.check)('email').isEmail(), (0, express_validator_1.check)('password').isLength({ min: 8 }), common_1.formValidationResult, signThrottle_1.default, sign_1.signIn);
exports.default = router;
//# sourceMappingURL=sign.js.map