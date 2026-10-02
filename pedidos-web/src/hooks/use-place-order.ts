import { useMutation, useQueryClient } from '@tanstack/react-query';
import { placeOrder } from '../lib/orders';

export function usePlaceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      placeOrder(productId, quantity),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['orders', 'mine'] });
    },
  });
}