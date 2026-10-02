import { api } from './api';

export interface OrderProductSummary {
  id: string;
  name: string;
  price: number;
  availableDate: string;
  closesAt: string;
  closed: boolean;
}

export interface OrderUserSummary {
  id: string;
  dni: string;
  name: string;
  role: 'COMPRADOR' | 'VENDEDOR';
}

export interface Order {
  id: string;
  productId: string;
  userId: string;
  quantity: number;
  status: 'PENDIENTE' | 'LISTO' | 'ENTREGADO';
  createdAt: string;
  product: OrderProductSummary;
  user: OrderUserSummary;
}

export async function listMyOrders(): Promise<Order[]> {
  const { data } = await api.get<Order[]>('/orders/mine');
  return data;
}

export async function placeOrder(productId: string, quantity: number): Promise<Order> {
  const { data } = await api.post<Order>('/orders', { productId, quantity });
  return data;
}