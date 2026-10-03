import { useQuery } from '@tanstack/react-query';
import { listIngredients } from '../lib/ingredients';

// The catalog is cached for 60s by default, which is fine for browsing it.
// Callers that reconcile the catalog against server-computed values (the recipe
// form previews `suggestedPrice`) can opt into `refetchOnMount: 'always'` so the
// preview never reads a stale price. React Query v5 accepts 'always' here.
export function useIngredients(options?: {
  refetchOnMount?: boolean | 'always';
}) {
  return useQuery({
    queryKey: ['ingredients'],
    queryFn: listIngredients,
    staleTime: 60_000,
    ...options,
  });
}
