import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createIngredient } from '../lib/ingredients';
import type { CreateIngredientInput } from '../lib/ingredients';

export function useCreateIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateIngredientInput) => createIngredient(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });
}
