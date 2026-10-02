import axios, { AxiosError } from 'axios';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
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