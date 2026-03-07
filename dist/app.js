"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ quiet: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const body_parser_1 = __importDefault(require("body-parser"));
const body_parser_xml_1 = __importDefault(require("body-parser-xml"));
const compression_1 = __importDefault(require("compression"));
const i18n_1 = __importDefault(require("./i18n"));
(0, body_parser_xml_1.default)(body_parser_1.default);
const v1_1 = __importDefault(require("./routes/v1"));
const propsInit_1 = __importDefault(require("./middlewares/propsInit"));
const corsOptions = {
    exposedHeaders: [],
};
app.use((0, compression_1.default)());
app.use(i18n_1.default);
app.use(express_1.default.json({
    verify: (req, _res, buf) => {
        req.rawBody = buf;
    },
}));
app.use(body_parser_1.default.xml());
app.use(body_parser_1.default.urlencoded({ extended: false }));
app.use(propsInit_1.default);
app.use('/v1', v1_1.default);
app.use((err, req, res, _next) => {
    res.render('error');
});
exports.default = app;
//# sourceMappingURL=app.js.map