import type { ComponentProps } from 'react';
import { Badge } from '@/components/ui/badge';
import type { Order } from './orders';

export const TIME_FORMAT = new Intl.DateTimeFormat('es-PE', {
  timeStyle: 'short',
  dateStyle: 'short',
  timeZone: 'America/Lima',
});

export const STATUS_LABEL: Record<Order['status'], string> = {
  PENDIENTE: 'Pendiente',
  LISTO: 'Listo',
  ENTREGADO: 'Entregado',
};

// Token utilities instead of literal colours: the primary/amber variant for
// pending, the success token for ready, the muted secondary variant for
// delivered. Keyed by Order['status'] so TypeScript still enforces
// exhaustiveness. Shared by the buyer and vendor order screens.
export const STATUS_BADGE: Record<Order['status'], ComponentProps<typeof Badge>> = {
  PENDIENTE: { variant: 'default' },
  LISTO: { className: 'bg-success text-success-foreground' },
  ENTREGADO: { variant: 'secondary' },
};
