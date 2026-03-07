import DEBUG from 'debug';
import { Props } from '../types/props';
import { jsonStringify } from '../tools/common';
import { bulkQueryBuilder, executeQuery } from '../tools/database';
import tables from '../tools/tables';
import {
  LogWebhook,
  Product,
  LogPayment,
  OrderIdWarehouse,
} from '../types/tables/payment';
import { ORDER_ID_STATUS } from '../constants';

const debug = DEBUG('dev.handlers.payment');

const orderIdMinimumCount = 100;

/**
 * 미리 주문번호를 생성해서 저장해놓고 사용
 * 같은 주문번호가 재사용되는 것을 방지하고, 같은 주문번호 생성 시 발생하는 오류 방지
 *
 * @description Generate order ID for payment
 * @returns {Promise<void>}
 */
async function generateOrderId(): Promise<void> {
  try {
    const [rows] = await executeQuery({
      printName: 'payment.generateOrderId',
      //print: true,
      table: tables.payment.orderIdWarehouse,
      action: 'select',
      where: {
        status: 0,
      },
    });

    if (rows.length < orderIdMinimumCount) {
      const orderIds = [];
      for (let i = 0; i < orderIdMinimumCount; i += 1) {
        const orderId = Math.random().toString(36).substring(2).toUpperCase();
        orderIds.push([orderId, 0]);
      }

      await executeQuery({
        printName: 'payment.generateOrderId',
        //print: true,
        table: tables.payment.orderIdWarehouse,
        action: 'insert',
        query: bulkQueryBuilder({
          table: tables.payment.orderIdWarehouse,
          columns: ['orderId', 'status'],
          values: orderIds,
        }),
      });
    }
  } catch (e) {
    // 해당 프로세스는 메인 프로세스와 상관이 없으므로 오류 발생해도 무시
    // 다만 지속적으로 발생하여 주문번호 여분이 없어지면 안되므로 로깅처리하여 확인할 수 있도록
    debug.extend('generateOrderId')(e);
  }
}

async function getOrderId(
  uuid: Props['uuid'],
): Promise<OrderIdWarehouse['orderId']> {
  // Request 에 부여하는 UUID 를 필수로 처리하여 어떤 Request 에서 사용되었는지 같이 기록
  if (!uuid) {
    throw new Error('UUID is required');
  }

  try {
    const [rows] = await executeQuery({
      printName: 'payment.getOrderId.select',
      //print: true,
      table: tables.payment.orderIdWarehouse,
      action: 'select',
      where: {
        status: ORDER_ID_STATUS.AVAILABLE,
      },
      conditions: 'ORDER BY `createdAt` ASC LIMIT 10',
    });

    let orderId: OrderIdWarehouse['orderId'] | undefined;
    let i = 0;
    do {
      // 같은 주문번호가 동시에 사용될 경우 처리하기 위해서 반복처리
      const orderIdInRow = rows?.[i]?.orderId;
      if (!orderIdInRow) {
        throw new Error('Order ID not found');
      }

      const [{ affectedRows }] = await executeQuery({
        printName: 'payment.getOrderId.update',
        //print: true,
        table: tables.payment.orderIdWarehouse,
        action: 'update',
        set: {
          uuid,
          status: ORDER_ID_STATUS.USED,
        },
        where: {
          orderId: orderIdInRow,
        },
      });

      if (affectedRows) {
        orderId = orderIdInRow;
      }

      i += 1;
    } while (!orderId?.length);

    if (!orderId?.length) {
      throw new Error('Order ID not found');
    }

    return orderId;
  } catch (e) {
    debug.extend('getOrderId')(e);
    throw e;
  }
}

async function addWebhookLog(
  props: Props,
): Promise<LogWebhook['id'] | undefined> {
  const { pg, orderId } = props.requestParams as Pick<
    LogWebhook,
    'pg' | 'orderId'
  >;
  const data = jsonStringify(props?.body);

  if (pg && orderId) {
    try {
      const [[{ insertId: logId }]] = await Promise.all([
        // log
        await executeQuery({
          printName: 'payment.addWebhookLog',
          //print: true,
          table: tables.payment.log.webhook,
          action: 'ignore',
          set: {
            pg,
            orderId,
            data,
          },
        }),

        // work
        await executeQuery({
          printName: 'payment.addWebhookLog',
          //print: true,
          table: tables.payment.work.webhook,
          action: 'ignore',
          set: {
            pg,
            orderId,
            data,
          },
        }),
      ]);

      return logId as LogWebhook['id'] | undefined;
    } catch (e) {
      debug.extend('addWebhookLog')(e);
      throw e;
    }
  }
}

async function updateWebhookLog({ id, status, result }: Partial<LogWebhook>) {
  if (!id || !status) {
    return;
  }

  try {
    await executeQuery({
      printName: 'payment.updateWebhookLog',
      // print: true,
      table: tables.payment.log.webhook,
      action: 'update',
      set: {
        status,
        result,
      },
      where: {
        id,
      },
    });
  } catch (e) {
    debug.extend('updateWebhookLog')(e);
    throw e;
  }
}

async function getProductData({
  productId,
}: Pick<Product, 'productId'>): Promise<Product | undefined> {
  if (!productId) {
    throw new Error('Product ID is required');
  }

  try {
    const [rows] = await executeQuery({
      printName: 'payment.getProductData',
      //print: true,
      table: tables.payment.product,
      action: 'select',
      where: {
        productId,
      },
    });

    return rows?.[0] as Product | undefined;
  } catch (e) {
    debug.extend('getProductData')(e);
    throw e;
  }
}

async function setLogPayment({
  uuid,
  orderId,
  userId,
  productId,
  price,
  amount,
  pg,
  method,
  status,
  errorMessage,
}: Partial<LogPayment>): Promise<number> {
  if (!uuid || !userId) {
    throw new Error('UUID and User ID are required');
  }

  try {
    const [{ affectedRows }] = await executeQuery({
      printName: 'payment.setLogPayment',
      // print: true,
      table: tables.payment.log.payment,
      action: 'duplicate',
      set: {
        uuid,
        userId,
        orderId,
        productId,
        price,
        amount,
        pg,
        method,
        status,
        errorMessage,
      },
      duplicate: {
        amount,
        pg,
        method,
        status,
        errorMessage,
      },
    });

    return affectedRows;
  } catch (e) {
    debug.extend('setLogPayment')(e);
    throw e;
  }
}

async function getLogPayment(
  orderId: LogPayment['orderId'],
): Promise<LogPayment> {
  if (!orderId) {
    throw new Error('Order ID is required');
  }

  try {
    const [rows] = await executeQuery({
      printName: 'payment.getLogPayment',
      // print: true,
      table: tables.payment.log.payment,
      action: 'select',
      where: {
        orderId,
      },
    });

    if (!rows?.length) {
      throw new Error('Log payment not found');
    }

    return rows?.[0] as LogPayment;
  } catch (e) {
    debug.extend('getLogPayment')(e);
    throw e;
  }
}

async function removeWorkWebhook({
  orderId,
}: Pick<LogWebhook, 'orderId'>): Promise<void> {
  if (!orderId) {
    return; // 주문번호가 없으면 처리하지 않음
  }

  try {
    await executeQuery({
      printName: 'payment.removeWorkWebhook',
      print: true,
      table: tables.payment.work.webhook,
      action: 'delete',
      where: {
        orderId,
      },
    });
  } catch (e) {
    debug.extend('removeWorkWebhook')(e);
    throw e;
  }
}

export {
  generateOrderId,
  getOrderId,
  addWebhookLog,
  updateWebhookLog,
  getProductData,
  setLogPayment,
  getLogPayment,
  removeWorkWebhook,
};
