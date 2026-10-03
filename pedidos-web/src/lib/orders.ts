import { api } from './api';

export interface OrderProductSummary {
  id: string;
  name: string;
  price: number;
  availableDate: string;
  closesAt: string;
  closed: boolean;
}

export interface Order {
  id: string;
  productId: string;
  buyerDni: string;
  buyerName: string;
  buyerApellidos: string;
  buyerCarrera: string;
  buyerDeviceId: string;
  quantity: number;
  status: 'PENDIENTE' | 'LISTO' | 'ENTREGADO';
  createdAt: string;
  product: OrderProductSummary;
}

export interface PlaceOrderInput {
  productId: string;
  quantity: number;
  buyerDni: string;
  buyerName: string;
  buyerApellidos: string;
  buyerCarrera: string;
  buyerDeviceId: string;
}

export async function listOrdersByDni(dni: string): Promise<Order[]> {
  const { data } = await api.get<Order[]>('/orders', { params: { dni } });
  return data;
}

export async function placeOrder(input: PlaceOrderInput): Promise<Order> {
  const { data } = await api.post<Order>('/orders', input);
  return data;
}

export async function listOrdersByProduct(productId: string): Promise<Order[]> {
  const { data } = await api.get<Order[]>(`/orders/by-product/${productId}`);
  return data;
}

export async function updateOrderStatus(
  orderId: string,
  status: 'LISTO' | 'ENTREGADO',
): Promise<Order> {
  const { data } = await api.patch<Order>(`/orders/${orderId}/status`, { status });
  return data;
}