"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.success = success;
exports.error = error;
exports.notValid = notValid;
exports.sendStatus = sendStatus;
const actionWatcher_1 = __importDefault(require("./actionWatcher"));
function success(req, res, data) {
    (0, actionWatcher_1.default)(req, res, undefined, () => {
        var _a;
        res.status(200).json(Object.assign({ uuid: (_a = req.props) === null || _a === void 0 ? void 0 : _a.uuid }, (typeof data === 'object' ? data : { data })));
    });
}
function error(req, res, err) {
    (0, actionWatcher_1.default)(req, res, err, () => {
        var _a;
        console.trace(err);
        res.status(500).json({
            uuid: (_a = req.props) === null || _a === void 0 ? void 0 : _a.uuid,
            error: err.message,
        });
    });
}
function notValid(req, res, errors) {
    (0, actionWatcher_1.default)(req, res, undefined, () => {
        var _a;
        res.status(400).json({
            uuid: (_a = req.props) === null || _a === void 0 ? void 0 : _a.uuid,
            errors: errors.map(error => error.msg),
        });
    });
}
function sendStatus(req, res, status) {
    (0, actionWatcher_1.default)(req, res, undefined, () => {
        res.status(status).send();
    });
}
//# sourceMappingURL=response.js.map