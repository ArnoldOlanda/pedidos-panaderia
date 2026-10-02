import { api } from './api';

export interface Product {
  id: string;
  name: string;
  price: number;
  availableDate: string;
  closesAt: string;
  closed: boolean;
  createdById: string;
  recipeId: string;
  createdAt: string;
}

export async function listTodayProducts(): Promise<Product[]> {
  const { data } = await api.get<Product[]>('/products/today');
  return data;
}

export async function getProduct(id: string): Promise<Product> {
  const { data } = await api.get<Product>(`/products/${id}`);
  return data;
}