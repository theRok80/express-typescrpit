"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const sign_1 = __importDefault(require("./sign"));
const webhook_1 = __importDefault(require("./webhook"));
const payment_1 = __importDefault(require("./payment"));
const userValidation_1 = __importDefault(require("../../middlewares/userValidation"));
const userIdRequired_1 = __importDefault(require("../../middlewares/userIdRequired"));
const router = express_1.default.Router();
router.use('/sign', sign_1.default);
router.use('/webhook', webhook_1.default);
router.use('/payment', userValidation_1.default, userIdRequired_1.default, payment_1.default);
router.get('/', (req, res) => {
    res.send(res.__('Hello World'));
});
exports.default = router;
//# sourceMappingURL=index.js.map