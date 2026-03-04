import DEBUG from 'debug';
import { Props } from '../types/props';
import { jsonStringify } from '../tools/common';
import { executeQuery } from '../tools/database';
import tables from '../tools/tables';
import { LogWebhook, Product } from '../types/tables/payment';

const debug = DEBUG('dev.handlers.payment');

async function addWebhookLog(props: Props) {
  const { pg, orderId } = props.requestParams as Pick<LogWebhook, 'pg' | 'orderId'>;
  const data = jsonStringify(props?.body);

  if (pg && orderId) {
    try {
      await executeQuery({
        printName: 'payment.addWebhookLog',
        print: true,
        table: tables.payment.log.webhook,
        action: 'insert',
        set: {
          pg,
          orderId,
          data,
        },
      });
    } catch (e) {
      debug.extend('addWebhookLog')(e);
      throw e;
    }
  }
}

async function getProductData({ productId }: Pick<Product, 'productId'>) {
  if (!productId) {
    throw new Error('Product ID is required');
  }

  try {
    const [rows] = await executeQuery({
      printName: 'payment.getProductData',
      print: true,
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

async function addLogPaymentPrepare(props: Props) {
  const { uuid } = props;
  const {} = props?.requestParams;
}

export { addWebhookLog, getProductData };
