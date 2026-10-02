import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../store/auth';
import { toApiError } from '../lib/auth';
import { api } from '../lib/api';

const BOOTSTRAP_TIMEOUT_MS = 5_000;

export function useAuthBootstrap() {
  const setUser = useAuth((s) => s.setUser);
  const setStatus = useAuth((s) => s.setStatus);
  const [showRetry, setShowRetry] = useState(false);
  const query = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), BOOTSTRAP_TIMEOUT_MS);
      return api
        .get('/auth/me', { signal: controller.signal })
        .then(({ data }) => ({ id: data.id, name: data.name, role: data.role }))
        .finally(() => clearTimeout(timer));
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  useEffect(() => {
    if (query.isSuccess && query.data) {
      setUser(query.data);
    } else if (query.isError) {
      const status = toApiError(query.error).status;
      if (status !== 401) {
        console.warn('[auth-bootstrap] /auth/me failed', { status });
      }
      setStatus('unauthenticated');
    } else if (query.isLoading) {
      setStatus('loading');
    }
  }, [query.isSuccess, query.isError, query.isLoading, query.data, setUser, setStatus]);
  useEffect(() => {
    if (!query.isLoading) {
      setShowRetry(false);
      return;
    }
    const id = window.setTimeout(() => setShowRetry(true), BOOTSTRAP_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [query.isLoading]);
  return { ...query, showRetry };
}