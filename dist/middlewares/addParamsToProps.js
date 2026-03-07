"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = addParamsToProps;
const lodash_1 = __importDefault(require("lodash"));
function addParamsToProps(req, res, next) {
    lodash_1.default.forEach(Object.assign(Object.assign({}, req.params), req.body), (v, k) => {
        if (k.toString().match(/.+Id$/) && !v.toString().match(/[^-+0-9]+/)) {
            req.props.params[k] = +v;
            req.props.requestParams[k] = +v;
        }
        else if (k.toString().match(/.+At$/)) {
            req.props.params[k] = (v === null || v === void 0 ? void 0 : v.length) ? v : null;
            req.props.requestParams[k] = (v === null || v === void 0 ? void 0 : v.length) ? v : null;
        }
        else {
            req.props.params[k] = v;
            req.props.requestParams[k] = v;
        }
    });
    next();
}
//# sourceMappingURL=addParamsToProps.js.map