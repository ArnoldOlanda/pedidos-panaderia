import { useQuery } from '@tanstack/react-query';
import { getRecipe } from '../lib/recipes';

export function useRecipe(id: string | undefined) {
  return useQuery({
    queryKey: ['recipes', id],
    queryFn: () => getRecipe(id as string),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}