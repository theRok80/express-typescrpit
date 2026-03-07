"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const i18n_1 = __importDefault(require("i18n"));
i18n_1.default.configure({
    locales: ['en', 'ko', 'ja'],
    directory: `${__dirname}/locales`,
    defaultLocale: 'en',
    cookie: 'lang',
    header: 'language',
});
const middleware = (req, res, next) => {
    i18n_1.default.init(req, res);
    res.locals.__ = res.__;
    return next();
};
exports.default = middleware;
//# sourceMappingURL=i18n.js.map