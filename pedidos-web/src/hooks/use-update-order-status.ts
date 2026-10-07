import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateOrderStatus } from '../lib/orders';
import { toast } from '../lib/toast';

export function useUpdateOrderStatus(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: 'LISTO' | 'ENTREGADO' }) =>
      updateOrderStatus(orderId, status),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['orders', 'by-product', productId] });
      toast.success(
        variables.status === 'LISTO' ? 'Marcado como listo' : 'Marcado como entregado',
      );
    },
    onError: (err) => {
      toast.error(err, { fallback: 'No pudimos actualizar el estado' });
    },
  });
}