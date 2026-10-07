import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateIngredient } from '../lib/ingredients';
import type { UpdateIngredientInput } from '../lib/ingredients';
import { toast } from '../lib/toast';

export function useUpdateIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateIngredientInput }) =>
      updateIngredient(id, input),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['ingredients'] });
      void qc.invalidateQueries({ queryKey: ['ingredients', variables.id] });
      toast.success('Insumo actualizado');
    },
    onError: (err) => {
      toast.error(err, { fallback: 'No pudimos actualizar el insumo' });
    },
  });
}
