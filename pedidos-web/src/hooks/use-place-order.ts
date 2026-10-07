import { useMutation, useQueryClient } from '@tanstack/react-query';
import { placeOrder, type PlaceOrderInput } from '../lib/orders';
import { toast } from '../lib/toast';

export function usePlaceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PlaceOrderInput) => placeOrder(input),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['orders', 'by-dni', variables.buyerDni] });
      toast.success('Pedido enviado');
    },
    onError: (err) => {
      toast.error(err, { fallback: 'No pudimos enviar el pedido' });
    },
  });
}