import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createRecipe } from '../lib/recipes';
import type { CreateRecipeInput } from '../lib/recipes';
import { toast } from '../lib/toast';

export function useCreateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRecipeInput) => createRecipe(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['recipes'] });
      toast.success('Receta creada');
    },
    onError: (err) => {
      toast.error(err, { fallback: 'No pudimos crear la receta' });
    },
  });
}