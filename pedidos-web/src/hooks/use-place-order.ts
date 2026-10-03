import { useMutation, useQueryClient } from '@tanstack/react-query';
import { placeOrder, type PlaceOrderInput } from '../lib/orders';

export function usePlaceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PlaceOrderInput) => placeOrder(input),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['orders', 'by-dni', variables.buyerDni] });
    },
  });
}