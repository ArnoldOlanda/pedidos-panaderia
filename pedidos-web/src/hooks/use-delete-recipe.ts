import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteRecipe } from '../lib/recipes';

export function useDeleteRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRecipe(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}