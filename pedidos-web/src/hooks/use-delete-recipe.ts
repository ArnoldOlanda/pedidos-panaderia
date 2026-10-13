import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteRecipe } from '../lib/recipes';
import { toast } from '../lib/toast';

export function useDeleteRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRecipe(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['recipes'] });
      toast.success('Receta eliminada');
    },
    onError: (err) => {
      toast.error(err, { fallback: 'No pudimos eliminar la receta' });
    },
  });
}