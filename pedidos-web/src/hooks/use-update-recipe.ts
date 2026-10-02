import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateRecipe } from '../lib/recipes';
import type { UpdateRecipeInput } from '../lib/recipes';

export function useUpdateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRecipeInput }) =>
      updateRecipe(id, input),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['recipes'] });
      void qc.invalidateQueries({ queryKey: ['recipes', variables.id] });
    },
  });
}