import { useQuery } from '@tanstack/react-query';
import { fetchUnitPairs } from '../lib/ingredients';

// The allowed usage/purchase unit pairs are static reference data served by
// the backend; caching them for the session avoids refetching the table.
export function useUnitPairs() {
  return useQuery({
    queryKey: ['ingredient-unit-pairs'],
    queryFn: fetchUnitPairs,
    staleTime: Infinity,
  });
}
