import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Product } from '../lib/products';
import { toast } from '../lib/toast';

export interface PublishProductInput {
  recipeId: string;
  name: string;
  price: number;
  availableDate: string; // 'yyyy-MM-dd'
  closesAt: string; // ISO 8601
}

export function usePublishProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PublishProductInput) => {
      const { data } = await api.post<Product>('/products', input);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['products', 'mine', 'today'] });
      void qc.invalidateQueries({ queryKey: ['products', 'today'] });
      toast.success('Producto publicado');
    },
    onError: (err) => {
      toast.error(err, { fallback: 'No pudimos publicar el producto' });
    },
  });
}