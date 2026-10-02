import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateOrderStatus } from '../lib/orders';

export function useUpdateOrderStatus(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: 'LISTO' | 'ENTREGADO' }) =>
      updateOrderStatus(orderId, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['orders', 'by-product', productId] });
    },
  });
}