import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createIngredient } from '../lib/ingredients';
import type { CreateIngredientInput } from '../lib/ingredients';
import { toast } from '../lib/toast';

export function useCreateIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateIngredientInput) => createIngredient(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ingredients'] });
      toast.success('Insumo creado');
    },
    onError: (err) => {
      toast.error(err, { fallback: 'No pudimos crear el insumo' });
    },
  });
}
