import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getOrCreateDeviceId } from './device';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.headers = config.headers ?? {};
  config.headers['X-Device-Id'] = getOrCreateDeviceId();
  return config;
});

export interface ApiError {
  status: number;
  message: string;
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof AxiosError) {
    return {
      status: err.response?.status ?? 0,
      message: (err.response?.data as { message?: string })?.message ?? err.message,
    };
  }
  return { status: 0, message: String(err) };
}