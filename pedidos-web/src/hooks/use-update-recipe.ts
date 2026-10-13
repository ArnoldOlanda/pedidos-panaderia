import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateRecipe } from '../lib/recipes';
import type { UpdateRecipeInput } from '../lib/recipes';
import { toast } from '../lib/toast';

export function useUpdateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRecipeInput }) =>
      updateRecipe(id, input),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['recipes'] });
      void qc.invalidateQueries({ queryKey: ['recipes', variables.id] });
      toast.success('Receta actualizada');
    },
    onError: (err) => {
      toast.error(err, { fallback: 'No pudimos actualizar la receta' });
    },
  });
}