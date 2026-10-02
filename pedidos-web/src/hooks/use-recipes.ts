import { useQuery } from '@tanstack/react-query';
import { listRecipes } from '../lib/recipes';

export function useRecipes() {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: listRecipes,
    staleTime: 60_000,
  });
}