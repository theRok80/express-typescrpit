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
