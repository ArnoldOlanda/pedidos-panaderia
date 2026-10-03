import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteIngredient } from '../lib/ingredients';

export function useDeleteIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteIngredient(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });
}
