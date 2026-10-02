import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuth } from '../store/auth';
import { meRequest, toApiError } from '../lib/auth';

export function useAuthBootstrap() {
  const setUser = useAuth((s) => s.setUser);
  const setStatus = useAuth((s) => s.setStatus);
  const query = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: meRequest,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  useEffect(() => {
    if (query.isSuccess && query.data) {
      setUser(query.data);
    } else if (query.isError) {
      const status = toApiError(query.error).status;
      if (status === 401) {
        setStatus('unauthenticated');
      } else {
        setStatus('unauthenticated');
      }
    } else if (query.isLoading) {
      setStatus('loading');
    }
  }, [query.isSuccess, query.isError, query.isLoading, query.data, setUser, setStatus]);
  return query;
}
