import DEBUG from 'debug';
import { Handler } from '../types/Payment';
import { Props } from '../types/props';
import { jsonStringify } from '../tools/common';
import { User } from '../types/tables/user';
import { bulkQueryBuilder, executeQuery } from '../tools/database';
import tables from '../tools/tables';
import {
  LogWebhook,
  Product,
  LogPayment,
  OrderIdWarehouse,
  ProductCoin,
  LogPaymentCoin,
  WorkWebhook,
  StripeCustomer,
} from '../types/tables/payment';
import { dayjs, DATETIME_FORMAT, ORDER_ID_STATUS } from '../constants';
import { StripeProduct, StripePrice } from '../types/tables/payment';

import Stripe from 'stripe';

const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY as string);

const debug = DEBUG('dev:handlers:payment');

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
      const [{ insertId: logId }] = await executeQuery({
        printName: 'payment.addWebhookLog',
        //print: true,
        table: tables.payment.log.webhook,
        action: 'ignore',
        set: {
          pg,
          orderId,
          data,
        },
      });

      // work
      await executeQuery({
        printName: 'payment.addWebhookLog',
        //print: true,
        table: tables.payment.work.webhook,
        action: 'ignore',
        set: {
          logId,
          pg,
          orderId,
          data,
        },
      });

      return logId as LogWebhook['id'] | undefined;
    } catch (e) {
      debug.extend('addWebhookLog')(e);
      throw e;
    }
  }
}

async function updateWebhookLog({
  id,
  status,
  result,
  updatedAt,
}: Partial<LogWebhook>) {
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
        updatedAt,
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
}: Pick<Product, 'productId'>): Promise<Handler.GetProductData> {
  if (!productId) {
    throw new Error('Product ID is required');
  }

  try {
    const [[mainRows], [coinRows], [stripeProductRows], [stripePriceRows]] =
      await Promise.all([
        // main
        executeQuery({
          printName: 'payment.getProductData.main',
          //print: true,
          table: tables.payment.product.main,
          action: 'select',
          where: {
            productId,
          },
        }),

        // coin
        executeQuery({
          printName: 'payment.getProductData.coin',
          //print: true,
          table: tables.payment.product.coin,
          action: 'select',
          where: {
            productId,
          },
        }),

        // stripe product
        executeQuery({
          printName: 'payment.getProductData.stripeProduct',
          //print: true,
          table: tables.payment.stripe.product,
          action: 'select',
          where: {
            productId,
          },
        }),

        // stripe price
        executeQuery({
          printName: 'payment.getProductData.stripePrice',
          //print: true,
          table: tables.payment.stripe.price,
          action: 'select',
          where: {
            productId,
          },
        }),
      ]);

    if (!mainRows?.length || !coinRows?.length) {
      throw new Error('Product not found');
    }

    return {
      ...(mainRows?.[0] as Product),
      coins: coinRows as ProductCoin[],
      stripe: {
        product: stripeProductRows?.[0] as StripeProduct | undefined,
        price: stripePriceRows?.[0] as StripePrice | undefined,
      },
    } as Handler.GetProductData;
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
  updatedAt,
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
        updatedAt,
      },
      duplicate: {
        amount,
        pg,
        method,
        status,
        errorMessage,
        updatedAt,
      },
    });

    return affectedRows;
  } catch (e) {
    debug.extend('setLogPayment')(e);
    throw e;
  }
}

async function setLogPaymentCoin({
  orderId,
  coins,
}: Pick<LogPayment, 'orderId'> & { coins: ProductCoin[] }): Promise<void> {
  if (
    !orderId ||
    !coins?.length ||
    !coins?.[0]?.coin ||
    !coins?.[0]?.coinType
  ) {
    throw new Error('Order ID and coins are required');
  }

  try {
    await Promise.all(
      coins.map(o => {
        return executeQuery({
          printName: 'payment.setLogPaymentCoin',
          print: true,
          table: tables.payment.log.paymentCoin,
          action: 'insert',
          set: {
            orderId,
            coin: o.coin,
            coinType: o.coinType,
            periodValue: o.periodValue,
            periodUnit: o.periodUnit,
          },
        });
      }),
    );
  } catch (e) {
    debug.extend('setLogPaymentCoin')(e);
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

async function getLogPaymentCoin(
  orderId: LogPayment['orderId'],
): Promise<LogPaymentCoin[]> {
  if (!orderId) {
    throw new Error('Order ID is required');
  }

  try {
    const [rows] = await executeQuery({
      printName: 'payment.getLogPaymentCoin',
      // print: true,
      table: tables.payment.log.paymentCoin,
      action: 'select',
      where: {
        orderId,
      },
    });

    if (!rows?.length) {
      throw new Error('Log payment coin not found');
    }

    return rows as LogPaymentCoin[];
  } catch (e) {
    debug.extend('getLogPaymentCoin')(e);
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

async function getWorkWebhookLog(): Promise<WorkWebhook[]> {
  try {
    // 아직 처리중인 로그는 제외하기 위해서 생성된지 2분 지난 로그만 확인
    const createdAt = dayjs().subtract(2, 'minutes').format(DATETIME_FORMAT);
    const [rows] = await executeQuery({
      printName: 'payment.getWorkWebhookLog',
      // print: true,
      table: tables.payment.work.webhook,
      action: 'select',
      where: {
        statement: [`\`createdAt\` <= ${createdAt}`],
      },
    });

    return rows as WorkWebhook[];
  } catch (e) {
    debug.extend('getWorkWebhookLog')(e);
    throw e;
  }
}

const stripe = {
  customer: {
    get: async function (
      userId: User['userId'],
    ): Promise<StripeCustomer | undefined> {
      try {
        const [rows] = await executeQuery({
          printName: 'payment.stripe.customer.get',
          // print: true,
          table: tables.payment.stripe.customer,
          action: 'select',
          where: { userId },
        });

        return rows?.[0] as StripeCustomer | undefined;
      } catch (e) {
        debug.extend('stripe.customer.get')(e);
        throw e;
      }
    },
    create: async function ({
      tokenData,
      clientIp,
    }: Partial<Props>): Promise<StripeCustomer['customerId']> {
      if (!tokenData?.userId || !tokenData?.name || !tokenData?.email) {
        throw new Error('Name and email are required');
      }

      try {
        const result = await stripeClient.customers.create({
          name: tokenData.name,
          email: tokenData.email,
        });

        await executeQuery({
          printName: 'payment.stripe.customer.create',
          // print: true,
          table: tables.payment.stripe.customer,
          action: 'ignore',
          set: {
            userId: tokenData.userId,
            customerId: result.id,
            clientIp,
          },
        });

        return result.id as StripeCustomer['customerId'];
      } catch (e) {
        debug.extend('stripe.customer.create')(e);
        throw e;
      }
    },
  },
  product: {
    get: async function ({
      productId,
    }: Pick<Product, 'productId'>): Promise<StripeProduct | undefined> {
      if (!productId) {
        throw new Error('Product ID is required');
      }

      try {
        const [rows] = await executeQuery({
          printName: 'payment.stripe.product.get',
          // print: true,
          table: tables.payment.stripe.product,
          action: 'select',
          where: { productId },
        });

        return rows?.[0] as StripeProduct | undefined;
      } catch (e) {
        debug.extend('stripe.product.get')(e);
        throw e;
      }
    },
    create: async function ({
      productId,
      name,
    }: Pick<Product, 'productId' | 'name'>): Promise<
      StripeProduct['stripeProductId']
    > {
      if (!productId || !name) {
        throw new Error('Product ID and name are required');
      }

      try {
        const result = await stripeClient.products.create({
          name,
        });

        await executeQuery({
          printName: 'payment.stripe.product.create',
          // print: true,
          table: tables.payment.stripe.product,
          action: 'ignore',
          set: {
            productId,
            stripeProductId: result.id as StripeProduct['stripeProductId'],
          },
        });

        return result.id as StripeProduct['stripeProductId'];
      } catch (e) {
        debug.extend('stripe.product.create')(e);
        throw e;
      }
    },
  },
  price: {
    create: async function ({
      productId,
      price,
      currency,
      stripeProductId,
    }: Pick<Product, 'productId' | 'price' | 'currency'> & {
      stripeProductId: StripeProduct['stripeProductId'];
    }): Promise<StripePrice['priceId']> {
      if (!productId || !price || !currency) {
        throw new Error('Product ID, price and currency are required');
      }

      try {
        const result = await stripeClient.prices.create({
          unit_amount_decimal: price.toString(),
          currency,
          product: stripeProductId,
        });

        await executeQuery({
          printName: 'payment.stripe.price.create',
          // print: true,
          table: tables.payment.stripe.price,
          action: 'ignore',
          set: {
            productId,
            priceId: result.id as StripePrice['priceId'],
            price,
            currency,
          },
        });

        return result.id as StripePrice['priceId'];
      } catch (e) {
        debug.extend('stripe.price.create')(e);
        throw e;
      }
    },
  },
  checkout: {
    create: async function ({
      orderId,
      productId,
      pg,
      method,
      priceId,
      customerId,
      amount,
      userId,
    }: Pick<
      LogPayment,
      'orderId' | 'productId' | 'amount' | 'userId' | 'pg' | 'method'
    > &
      Pick<StripePrice, 'priceId'> &
      Pick<StripeCustomer, 'customerId'>): Promise<
      Stripe.Checkout.Session['url']
    > {
      if (!productId || !priceId || !amount || !userId) {
        throw new Error(
          'Product ID, price ID, amount and user ID are required',
        );
      }

      try {
        const send = {
          success_url: `${process.env.BACKEND_URL}/v1/webhook/${pg}/${orderId}`,
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          mode: 'payment',
          customer: customerId,
          payment_method_types: [method],
          metadata: {
            orderId,
            userId,
          },
        } as Stripe.Checkout.SessionCreateParams;

        const result = await stripeClient.checkout.sessions.create(send);

        await executeQuery({
          printName: 'payment.stripe.checkout.create',
          // print: true,
          table: tables.payment.stripe.checkout,
          action: 'ignore',
          set: {
            orderId,
            send: jsonStringify(send),
            response: jsonStringify(result),
          },
        });

        return result.url as Stripe.Checkout.Session['url'];
      } catch (e) {
        debug.extend('stripe.checkout.create')(e);
        throw e;
      }
    },
  },
};

export {
  generateOrderId,
  getOrderId,
  addWebhookLog,
  updateWebhookLog,
  getProductData,
  setLogPayment,
  setLogPaymentCoin,
  getLogPayment,
  getLogPaymentCoin,
  removeWorkWebhook,
  getWorkWebhookLog,
  stripe,
};
