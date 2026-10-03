import { useQuery } from '@tanstack/react-query';
import { listIngredients } from '../lib/ingredients';

export function useIngredients() {
  return useQuery({
    queryKey: ['ingredients'],
    queryFn: listIngredients,
    staleTime: 60_000,
  });
}
