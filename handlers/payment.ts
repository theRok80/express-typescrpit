import DEBUG from 'debug';
import { Props } from '../types/props';
import { jsonStringify } from '../tools/common';
import { executeQuery } from '../tools/database';
import tables from '../tools/tables';

const debug = DEBUG('dev.handlers.payment');

async function addWebhookLog(props: Props) {
  const { pg, orderId } = props.requestParams as { pg: string; orderId: string };
  const data = jsonStringify(props.requestParams?.body);

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

export { addWebhookLog };
