import _ from 'lodash';
import debug from 'debug';
import mysql2 from 'mysql2';
import type { Pool as PromisePool } from 'mysql2/promise';
import { dayjs } from '../constants';
import type {
  BuildConditionArgs,
  ExecuteQueryArgs,
  Join,
  QueryBuilder2Args,
} from '../types/database';

const DEBUG = debug('dev:database');

const sharedConfig = {
  connectTimeout: 60000,
  waitForConnections: true,
  queueLimit: 0,
};

const masterConfig = {
  ...sharedConfig,
  connectionLimit: 10,
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
};

const slaveConfig = {
  ...sharedConfig,
  connectionLimit: 10,
  host: process.env.MYSQL_SALVE_HOST,
  user: process.env.MYSQL_SALVE_USER,
  password: process.env.MYSQL_SALVE_PASSWORD,
  database: process.env.MYSQL_SALVE_DATABASE,
};

const master = mysql2.createPool(masterConfig);
const slave = mysql2.createPool(slaveConfig);
let masterPromise: PromisePool;
let slavePromise: PromisePool;

const connectToDatabase = (): void => {
  masterPromise = master.promise();
  slavePromise = slave.promise();
};

setInterval(connectToDatabase, 60 * 1000);

connectToDatabase();

const indent = '     ';
const newLine = `\n${indent}`;

function escape(value: string): string {
  const conn = mysql2.createConnection(slaveConfig);
  const string = conn.escape(value);
  conn.end();

  return string;
}

function getTableName(table: string): string {
  if (table.indexOf('PARTITION') > 0) {
    return table;
  }
  return `\`${table}\``;
}

function buildCondition(args: BuildConditionArgs): string[] {
  const { table, tableAs, condition, join, isDuplicate = false } = args;
  let array: string[] = [];
  const tableName = join ? tableAs || table : '';
  const tablePrefix = tableName ? `\`${tableName}\`.` : '';

  if (typeof condition === 'object' && Object.keys(condition).length) {
    _.forEach(condition, (value, key) => {
      if (typeof value !== 'undefined') {
        if (key === 'statement') {
          if (Array.isArray(value)) {
            array = _.compact(_.concat(array, value));
          } else if (typeof value === 'string') {
            array.push(value);
          }
        } else if (key === 'bulkWhere') {
          if (
            Array.isArray(value?.columns) &&
            Array.isArray(value?.keys) &&
            value?.data
          ) {
            let string = `(${value.columns.join(',')})`;
            const values = _.compact(
              _.map(value.data, o => {
                const innerValues = _.compact(
                  _.map(o, (p, key) => {
                    if (value.keys.includes(key)) {
                      return p;
                    }
                    return null;
                  }),
                );
                if (innerValues.length) {
                  return `(${_.map(innerValues, o => {
                    return escape(o);
                  }).join(',')})`;
                }
                return null;
              }),
            );
            if (values.length) {
              string += ` IN (${values.join(',')})`;
              array.push(string);
            }
          }
        } else if (Array.isArray(value)) {
          array.push(
            `${tablePrefix}\`${key}\` IN (${_.map(value, o => {
              return escape(o);
            }).join(',')})`,
          );
        } else if (_.isInteger(value)) {
          if (isDuplicate) {
            array.push(`${tablePrefix}\`${key}\` = \`${key}\` + ${value}`);
          } else {
            if (key.match(/.+Bit$/) && typeof value === 'number') {
              array.push(`${tablePrefix}\`${key}\` & ${value}`);
            } else {
              array.push(`${tablePrefix}\`${key}\` = ${value}`);
            }
          }
        } else if (key.match(/.+At$/)) {
          if (typeof value === 'string') {
            array.push(`${tablePrefix}\`${key}\` = ${escape(value)}`);
          } else if (value instanceof Date) {
            array.push(
              `${tablePrefix}\`${key}\` = '${dayjs(value).utc().format('YYYY-MM-DD HH:mm:ss')}'`,
            );
          } else {
            array.push(`${tablePrefix}\`${key}\` = null`);
          }
        } else if (typeof value === 'object' && _.isNull(value)) {
          array.push(`${tablePrefix}\`${key}\` = NULL`);
        } else if (typeof value === 'string' && value === 'is null') {
          array.push(`${tablePrefix}\`${key}\` IS NULL`);
        } else if (typeof value === 'string' && value === 'is not null') {
          array.push(`${tablePrefix}\`${key}\` IS NOT NULL`);
        } else if (typeof value === 'string' && value.length) {
          array.push(`${tablePrefix}\`${key}\` = ${escape(value)}`);
        } else {
          array.push(`${tablePrefix}\`${key}\` = ${escape(value)}`);
        }
      }
    });
  }
  return array;
}

function queryBuilder(
  table: string,
  action: string,
  params: Record<string, any>,
  secParams?: Record<string, any>,
  conditions?: string | string[],
  select?: string[],
  index?: string,
  join?: Join,
  tableAs?: string,
  isSubQuery = false,
) {
  let query = '';
  let arrQuery: string[] = [];
  let arrSecQuery: string[] = [];
  const selectQuery: string[] = [];

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
      } else {
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
      } else {
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
        // query = '';
      } else {
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
        // query = '';
      } else {
        query += `DELETE FROM ${getTableName(table)} `;
        query += ` WHERE${newLine}${indent}${arrQuery.join(`${newLine}${indent}AND `)}`;
      }
      break;
    case 'select':
      if (!params) {
        throw new Error('params is undefined');
      }

      _.forEach(select, v => {
        if (typeof v === 'object') {
          const [columnName] = Object.keys(v);
          const [columnAlias] = Object.values(v);
          selectQuery.push(`\`${columnName}\` AS \`${columnAlias}\``);
        } else if (v.indexOf(' AS ') >= 0 || v === '*' || v.includes('.')) {
          selectQuery.push(v);
        } else {
          selectQuery.push(`\`${v}\``);
        }
      });

      arrQuery = buildCondition({ table, tableAs, condition: params, join });

      if (!arrQuery.length) {
        // query = '';
      } else {
        query += `SELECT ${newLine}${indent}${
          select && select.length > 0 ? selectQuery.join(', ') : '*'
        } ${newLine}FROM ${getTableName(table)} ${tableAs ? `AS ${tableAs}` : ''}`;
        if (index) {
          query += ` USE INDEX (\`${index}\`) `;
        }

        if (Array.isArray(join)) {
          _.forEach(join, v => {
            if (!v) {
              return;
            }

            const { table, tableAs, type, on, where, index } = v;
            query += `${newLine}${type} JOIN ${getTableName(table)} ${
              tableAs ? ` AS ${tableAs} ` : ''
            } `;

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

              if (joinWhere?.length) {
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
      } else {
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

function queryBuilderV2(args: QueryBuilder2Args): string {
  const {
    table,
    tableAs,
    action,
    where,
    set,
    duplicate,
    conditions,
    select,
    index,
    join,
    isSubQuery = false,
  } = args;

  let params: QueryBuilder2Args['where'] | QueryBuilder2Args['set'];
  let secParams: QueryBuilder2Args['where'] | QueryBuilder2Args['set'];

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

  return queryBuilder(
    table,
    action,
    params as Record<string, any>,
    secParams,
    conditions,
    select,
    index,
    join,
    tableAs,
    isSubQuery,
  );
}

async function executeQuery(args: ExecuteQueryArgs) {
  const tryCount = args?.tryCount || 1;
  const errorMessage = args?.errorMessage ? [...args?.errorMessage] : [];
  const {
    slaveConn,
    masterConn,
    action,
    printName = null,
    print = false,
    printTag,
    query: propsQuery,
    console: consoleLog = false,
    mute = false,
  } = args;
  const debug = DEBUG.extend('executeQuery');
  const isPrint = print;
  const newConnectionCount = 2;
  let checkMaster = false;
  // const verbose = process.env.ENVIRONMENT === 'development';
  const verbose = false;
  // const checkName = true;
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
      if (
        ['insert', 'ignore', 'duplicate', 'update', 'delete'].includes(
          action,
        ) ||
        masterConn
      ) {
        checkMaster = true;

        db =
          masterConn &&
          masterConn?.connection?.connectionId &&
          tryCount < newConnectionCount
            ? masterConn
            : master.promise();
      } else {
        db =
          slaveConn &&
          slaveConn?.connection?.connectionId &&
          tryCount < newConnectionCount
            ? slaveConn
            : slave.promise();
      }

      const printDescription = [
        checkMaster ? 'MASTER' : 'SLAVE',
        `connectionId: ${db?.connection?.connectionId}`,
        printTag || '',
      ];

      if (isPrint || checkName) {
        DEBUG(
          '%O',
          printName || '',
          _.compact(printDescription).join(', '),
          'BEGIN',
          `${newLine}${query}${newLine}`,
        );
      }

      if (consoleLog) {
        console.log(printName, query);
      }

      const queryResult = await db?.query(query);

      if (isPrint) {
        DEBUG(
          '%O',
          printName || '',
          _.compact(printDescription).join(', '),
          'DONE',
        );
      }

      return queryResult;
    } else {
      return undefined;
    }
  } catch (e) {
    if (e instanceof Error) {
      debug.extend('executeQuery:error')(
        '',
        printName || '',
        e.message,
        tryCount,
      );

      if (!e?.message.includes('connection is in closed state')) {
        // console.trace('executeQuery.error', e.message);
      }

      errorMessage.push(e?.message);

      // await msleep(500);
      return await executeQuery({
        ...args,
        tryCount: e?.message.includes('connection is in closed state') // connection 이 이미 비활성화 상태
          ? newConnectionCount + 1
          : tryCount + 1,
        errorMessage,
      });
    } else {
      console.trace('executeQuery.error', e);
      throw e;
    }
  }
}

function bulkQueryBuilder({
  table,
  columns,
  values,
  ignore = false,
}: {
  table: string;
  columns: string[];
  values: (string | number | Record<string, any>)[][];
  ignore?: boolean;
}): string {
  const query = `INSERT ${ignore ? 'IGNORE' : ''} INTO \`${table}\` (\`${columns.join('`,`')}\`) VALUES `;
  const valuesQuery = _.map(values, v => {
    return `(${_.map(v, (c: string | number | unknown) => {
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

export {
  master,
  masterPromise,
  slave,
  slavePromise,
  escape,
  executeQuery,
  bulkQueryBuilder,
};
