export interface LogWebhook {
  id: number;
  pg: string;
  orderId: string;
  data: string;
  createdAt: Date;
}

export interface Product {
  productId: number;
  name: string;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LogPaymentPrepare {
  uuid: string;
  userId: number;
  orderId: string;
  productId: number;
  pg: string;
  method: string;
  amount: number;
  status: number;
  createdAt: Date;
  updatedAt: Date;
}
