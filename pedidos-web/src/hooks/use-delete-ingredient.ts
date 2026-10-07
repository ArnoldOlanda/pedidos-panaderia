import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteIngredient } from '../lib/ingredients';
import { toast } from '../lib/toast';

export function useDeleteIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteIngredient(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ingredients'] });
      toast.success('Insumo eliminado');
    },
    onError: (err) => {
      toast.error(err, { fallback: 'No pudimos eliminar el insumo' });
    },
  });
}
