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
exports.slavePromise = exports.slave = exports.masterPromise = exports.master = void 0;
exports.escape = escape;
exports.executeQuery = executeQuery;
exports.bulkQueryBuilder = bulkQueryBuilder;
const lodash_1 = __importDefault(require("lodash"));
const debug_1 = __importDefault(require("debug"));
const mysql2_1 = __importDefault(require("mysql2"));
const constants_1 = require("../constants");
const DEBUG = (0, debug_1.default)('dev:database');
const sharedConfig = {
    connectTimeout: 60000,
    waitForConnections: true,
    queueLimit: 0,
};
const masterConfig = Object.assign(Object.assign({}, sharedConfig), { connectionLimit: 10, host: process.env.MYSQL_HOST, user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, database: process.env.MYSQL_DATABASE });
const slaveConfig = Object.assign(Object.assign({}, sharedConfig), { connectionLimit: 10, host: process.env.MYSQL_SALVE_HOST, user: process.env.MYSQL_SALVE_USER, password: process.env.MYSQL_SALVE_PASSWORD, database: process.env.MYSQL_SALVE_DATABASE });
const master = mysql2_1.default.createPool(masterConfig);
exports.master = master;
const slave = mysql2_1.default.createPool(slaveConfig);
exports.slave = slave;
let masterPromise;
let slavePromise;
const connectToDatabase = () => {
    exports.masterPromise = masterPromise = master.promise();
    exports.slavePromise = slavePromise = slave.promise();
};
setInterval(connectToDatabase, 60 * 1000);
connectToDatabase();
const indent = '     ';
const newLine = `\n${indent}`;
function escape(value) {
    const conn = mysql2_1.default.createConnection(slaveConfig);
    const string = conn.escape(value);
    conn.end();
    return string;
}
function getTableName(table) {
    if (table.indexOf('PARTITION') > 0) {
        return table;
    }
    return `\`${table}\``;
}
function buildCondition(args) {
    const { table, tableAs, condition, join, isDuplicate = false } = args;
    let array = [];
    const tableName = join ? tableAs || table : '';
    const tablePrefix = tableName ? `\`${tableName}\`.` : '';
    if (typeof condition === 'object' && Object.keys(condition).length) {
        lodash_1.default.forEach(condition, (value, key) => {
            if (typeof value !== 'undefined') {
                if (key === 'statement') {
                    if (Array.isArray(value)) {
                        array = lodash_1.default.compact(lodash_1.default.concat(array, value));
                    }
                    else if (typeof value === 'string') {
                        array.push(value);
                    }
                }
                else if (key === 'bulkWhere') {
                    if (Array.isArray(value === null || value === void 0 ? void 0 : value.columns) &&
                        Array.isArray(value === null || value === void 0 ? void 0 : value.keys) &&
                        (value === null || value === void 0 ? void 0 : value.data)) {
                        let string = `(${value.columns.join(',')})`;
                        const values = lodash_1.default.compact(lodash_1.default.map(value.data, o => {
                            const innerValues = lodash_1.default.compact(lodash_1.default.map(o, (p, key) => {
                                if (value.keys.includes(key)) {
                                    return p;
                                }
                                return null;
                            }));
                            if (innerValues.length) {
                                return `(${lodash_1.default.map(innerValues, o => {
                                    return escape(o);
                                }).join(',')})`;
                            }
                            return null;
                        }));
                        if (values.length) {
                            string += ` IN (${values.join(',')})`;
                            array.push(string);
                        }
                    }
                }
                else if (Array.isArray(value)) {
                    array.push(`${tablePrefix}\`${key}\` IN (${lodash_1.default.map(value, o => {
                        return escape(o);
                    }).join(',')})`);
                }
                else if (lodash_1.default.isInteger(value)) {
                    if (isDuplicate) {
                        array.push(`${tablePrefix}\`${key}\` = \`${key}\` + ${value}`);
                    }
                    else {
                        if (key.match(/.+Bit$/) && typeof value === 'number') {
                            array.push(`${tablePrefix}\`${key}\` & ${value}`);
                        }
                        else {
                            array.push(`${tablePrefix}\`${key}\` = ${value}`);
                        }
                    }
                }
                else if (key.match(/.+At$/)) {
                    if (typeof value === 'string') {
                        array.push(`${tablePrefix}\`${key}\` = ${escape(value)}`);
                    }
                    else if (value instanceof Date) {
                        array.push(`${tablePrefix}\`${key}\` = '${(0, constants_1.dayjs)(value).utc().format('YYYY-MM-DD HH:mm:ss')}'`);
                    }
                    else {
                        array.push(`${tablePrefix}\`${key}\` = null`);
                    }
                }
                else if (typeof value === 'object' && lodash_1.default.isNull(value)) {
                    array.push(`${tablePrefix}\`${key}\` = NULL`);
                }
                else if (typeof value === 'string' && value === 'is null') {
                    array.push(`${tablePrefix}\`${key}\` IS NULL`);
                }
                else if (typeof value === 'string' && value === 'is not null') {
                    array.push(`${tablePrefix}\`${key}\` IS NOT NULL`);
                }
                else if (typeof value === 'string' && value.length) {
                    array.push(`${tablePrefix}\`${key}\` = ${escape(value)}`);
                }
                else {
                    array.push(`${tablePrefix}\`${key}\` = ${escape(value)}`);
                }
            }
        });
    }
    return array;
}
function queryBuilder(table, action, params, secParams, conditions, select, index, join, tableAs, isSubQuery = false) {
    let query = '';
    let arrQuery = [];
    let arrSecQuery = [];
    const selectQuery = [];
    switch (action) {
        case 'insert':
            if (!params) {
                throw new Error('params is undefined');
            }
            query += `INSERT INTO${newLine}${indent}${getTableName(table)}${newLine}SET${newLine}${indent}`;
            arrQuery = buildCondition({ condition: params });
            if (secParams) {
                arrSecQuery = buildCondition({ condition: secParams });
            }
            if (arrQuery.length) {
                query += arrQuery.join(`,${newLine}${indent}`);
                if (arrSecQuery.length) {
                    query += ' ON DUPLICATE KEY UPDATE ';
                    query += arrSecQuery.join(`,${newLine}${indent}`);
                }
            }
            else {
                query = '';
            }
            break;
        case 'ignore':
            if (!params) {
                throw new Error('params is undefined');
            }
            query += `INSERT IGNORE INTO${newLine}${indent}${getTableName(table)}${newLine}SET${newLine}${indent}`;
            arrQuery = buildCondition({ condition: params });
            if (secParams) {
                arrSecQuery = buildCondition({ condition: secParams });
            }
            if (arrQuery.length) {
                query += arrQuery.join(`,${newLine}${indent}`);
                if (arrSecQuery.length) {
                    query += ' ON DUPLICATE KEY UPDATE ';
                    query += arrSecQuery.join(`,${newLine}${indent}`);
                }
            }
            else {
                query = '';
            }
            break;
        case 'update':
            if (!params) {
                throw new Error('params is undefined');
            }
            if (!secParams) {
                throw new Error('second params is undefined');
            }
            arrQuery = buildCondition({ condition: params });
            arrSecQuery = buildCondition({ condition: secParams });
            if (!arrQuery.length || !arrSecQuery.length) {
            }
            else {
                query += `UPDATE${newLine}${indent}${getTableName(table)}${newLine}SET${newLine}${indent}`;
                query += `${newLine}${indent}${arrQuery.join(`,${newLine}${indent}`)} `;
                query += `${newLine}WHERE${newLine}${indent}${arrSecQuery.join(`${newLine}${indent}AND `)}`;
            }
            break;
        case 'delete':
            if (!params) {
                throw new Error('params is undefined');
            }
            arrQuery = buildCondition({ condition: params });
            if (!arrQuery.length) {
            }
            else {
                query += `DELETE FROM ${getTableName(table)} `;
                query += ` WHERE${newLine}${indent}${arrQuery.join(`${newLine}${indent}AND `)}`;
            }
            break;
        case 'select':
            if (!params) {
                throw new Error('params is undefined');
            }
            lodash_1.default.forEach(select, v => {
                if (typeof v === 'object') {
                    const [columnName] = Object.keys(v);
                    const [columnAlias] = Object.values(v);
                    selectQuery.push(`\`${columnName}\` AS \`${columnAlias}\``);
                }
                else if (v.indexOf(' AS ') >= 0 || v === '*' || v.includes('.')) {
                    selectQuery.push(v);
                }
                else {
                    selectQuery.push(`\`${v}\``);
                }
            });
            arrQuery = buildCondition({ table, tableAs, condition: params, join });
            if (!arrQuery.length) {
            }
            else {
                query += `SELECT ${newLine}${indent}${select && select.length > 0 ? selectQuery.join(', ') : '*'} ${newLine}FROM ${getTableName(table)} ${tableAs ? `AS ${tableAs}` : ''}`;
                if (index) {
                    query += ` USE INDEX (\`${index}\`) `;
                }
                if (Array.isArray(join)) {
                    lodash_1.default.forEach(join, v => {
                        if (!v) {
                            return;
                        }
                        const { table, tableAs, type, on, where, index } = v;
                        query += `${newLine}${type} JOIN ${getTableName(table)} ${tableAs ? ` AS ${tableAs} ` : ''} `;
                        if (index) {
                            query += ` USE INDEX (\`${index}\`) `;
                        }
                        query += `${newLine}${indent}ON ${on} `;
                        if (where) {
                            const joinWhere = buildCondition({
                                table,
                                tableAs,
                                condition: where,
                                join,
                            });
                            if (joinWhere === null || joinWhere === void 0 ? void 0 : joinWhere.length) {
                                query += `${newLine}${indent}AND ${joinWhere.join(`${newLine}${indent}AND `)} `;
                            }
                        }
                    });
                }
                query += `${newLine}WHERE${newLine}${indent}${arrQuery.join(`${newLine}${indent}AND `)}`;
            }
            break;
        case 'duplicate':
            if (!params) {
                throw new Error('params is undefined');
            }
            query += `INSERT INTO${newLine}${indent}${getTableName(table)}${newLine}SET${newLine}${indent}`;
            arrQuery = buildCondition({ condition: params });
            if (secParams) {
                arrSecQuery = buildCondition({ condition: secParams });
            }
            if (arrQuery.length && arrSecQuery.length) {
                query += arrQuery.join(`,${newLine}${indent}`);
                query += `${newLine}ON DUPLICATE KEY UPDATE${newLine}${indent}`;
                query += arrSecQuery.join(`,${newLine}${indent}`);
            }
            else {
                query = '';
            }
            break;
        default:
            break;
    }
    const endQuery = isSubQuery ? '' : ';';
    if (isSubQuery) {
        return `(${query}${conditions ? `${newLine}${conditions}${endQuery}` : `${endQuery}`})`;
    }
    return `${query}${conditions ? `${newLine}${conditions}${endQuery}` : `${endQuery}`}`;
}
function queryBuilderV2(args) {
    const { table, tableAs, action, where, set, duplicate, conditions, select, index, join, isSubQuery = false, } = args;
    let params;
    let secParams;
    switch (action) {
        case 'update': {
            params = set;
            secParams = where;
            break;
        }
        case 'ignore':
        case 'insert': {
            params = set;
            break;
        }
        case 'duplicate': {
            params = set;
            secParams = duplicate;
            break;
        }
        case 'select':
        case 'delete':
        default: {
            params = where;
            break;
        }
    }
    return queryBuilder(table, action, params, secParams, conditions, select, index, join, tableAs, isSubQuery);
}
function executeQuery(args) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const tryCount = (args === null || args === void 0 ? void 0 : args.tryCount) || 1;
        const errorMessage = (args === null || args === void 0 ? void 0 : args.errorMessage) ? [...args === null || args === void 0 ? void 0 : args.errorMessage] : [];
        const { slaveConn, masterConn, action, printName = null, print = false, printTag, query: propsQuery, console: consoleLog = false, mute = false, } = args;
        const debug = DEBUG.extend('executeQuery');
        const isPrint = print;
        const newConnectionCount = 2;
        let checkMaster = false;
        const verbose = false;
        const checkName = false;
        if (tryCount > newConnectionCount + 2) {
            const msg = `too many execute query count: [${printName}] errors[${errorMessage.join(', ')}]`;
            if (!mute) {
                console.log(msg);
            }
            throw new Error(msg);
        }
        try {
            const query = propsQuery || queryBuilderV2(args);
            if (query) {
                let db;
                if (['insert', 'ignore', 'duplicate', 'update', 'delete'].includes(action) ||
                    masterConn) {
                    checkMaster = true;
                    db =
                        masterConn &&
                            ((_a = masterConn === null || masterConn === void 0 ? void 0 : masterConn.connection) === null || _a === void 0 ? void 0 : _a.connectionId) &&
                            tryCount < newConnectionCount
                            ? masterConn
                            : master.promise();
                }
                else {
                    db =
                        slaveConn &&
                            ((_b = slaveConn === null || slaveConn === void 0 ? void 0 : slaveConn.connection) === null || _b === void 0 ? void 0 : _b.connectionId) &&
                            tryCount < newConnectionCount
                            ? slaveConn
                            : slave.promise();
                }
                const printDescription = [
                    checkMaster ? 'MASTER' : 'SLAVE',
                    `connectionId: ${(_c = db === null || db === void 0 ? void 0 : db.connection) === null || _c === void 0 ? void 0 : _c.connectionId}`,
                    printTag || '',
                ];
                if (isPrint || checkName) {
                    DEBUG('%O', printName || '', lodash_1.default.compact(printDescription).join(', '), 'BEGIN', `${newLine}${query}${newLine}`);
                }
                if (consoleLog) {
                    console.log(printName, query);
                }
                const queryResult = yield (db === null || db === void 0 ? void 0 : db.query(query));
                if (isPrint) {
                    DEBUG('%O', printName || '', lodash_1.default.compact(printDescription).join(', '), 'DONE');
                }
                return queryResult;
            }
            else {
                return undefined;
            }
        }
        catch (e) {
            if (e instanceof Error) {
                debug.extend('executeQuery:error')('', printName || '', e.message, tryCount);
                if (!(e === null || e === void 0 ? void 0 : e.message.includes('connection is in closed state'))) {
                }
                errorMessage.push(e === null || e === void 0 ? void 0 : e.message);
                return yield executeQuery(Object.assign(Object.assign({}, args), { tryCount: (e === null || e === void 0 ? void 0 : e.message.includes('connection is in closed state'))
                        ? newConnectionCount + 1
                        : tryCount + 1, errorMessage }));
            }
            else {
                console.trace('executeQuery.error', e);
                throw e;
            }
        }
    });
}
function bulkQueryBuilder({ table, columns, values, ignore = false, }) {
    const query = `INSERT ${ignore ? 'IGNORE' : ''} INTO \`${table}\` (\`${columns.join('`,`')}\`) VALUES `;
    const valuesQuery = lodash_1.default.map(values, v => {
        return `(${lodash_1.default.map(v, (c) => {
            switch (typeof c) {
                case 'string':
                    return c.toUpperCase() === 'NULL' ? 'NULL' : `'${c}'`;
                case 'undefined':
                    return 'NUll';
                default:
                    return c;
            }
        }).join(',')})`;
    });
    return query + valuesQuery.join(',');
}
//# sourceMappingURL=database.js.map