import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useAuth } from '../store/auth';
import { api } from '../lib/api';

function isAuthError(err: unknown): boolean {
  if (err instanceof AxiosError) return err.response?.status === 401;
  return false;
}

export function useAuthBootstrap() {
  const setUser = useAuth((s) => s.setUser);
  const setStatus = useAuth((s) => s.setStatus);
  const query = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: ({ signal }) =>
      api
        .get('/auth/me', { signal })
        .then(({ data }) => ({ id: data.id, name: data.name, role: data.role })),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const infrastructureError = query.isError && !isAuthError(query.error);
  useEffect(() => {
    if (query.isSuccess && query.data) {
      setUser(query.data);
    } else if (query.isError && isAuthError(query.error)) {
      setStatus('unauthenticated');
    }
    // For non-401 errors, do NOT touch the auth status — AuthBootstrap will
    // surface the retry panel via the infrastructureError flag.
  }, [query.isSuccess, query.isError, query.data, setUser, setStatus]);
  return { ...query, infrastructureError };
}
