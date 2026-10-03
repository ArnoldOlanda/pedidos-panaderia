import { useQuery } from '@tanstack/react-query';
import { getIngredient } from '../lib/ingredients';

export function useIngredient(id: string | undefined) {
  return useQuery({
    queryKey: ['ingredients', id],
    queryFn: () => getIngredient(id as string),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}
