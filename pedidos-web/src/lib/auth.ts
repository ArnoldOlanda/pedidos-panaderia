import { api, toApiError } from './api';
import type { AuthUser } from '../store/auth';

interface MeResponse {
  id: string;
  dni: string;
  name: string;
  role: 'VENDEDOR' | 'COMPRADOR';
  createdAt: string;
  updatedAt: string;
}

interface LoginResponse {
  user: MeResponse;
}

export async function loginRequest(dni: string, name: string): Promise<AuthUser> {
  const { data } = await api.post<LoginResponse>('/auth/login', { dni, name });
  return { id: data.user.id, name: data.user.name, role: data.user.role };
}

export async function meRequest(): Promise<AuthUser> {
  const { data } = await api.get<MeResponse>('/auth/me');
  return { id: data.id, name: data.name, role: data.role };
}

export async function logoutRequest(): Promise<void> {
  await api.post('/auth/logout');
}

export { toApiError };