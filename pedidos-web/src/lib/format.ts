export function formatCloseTimeLima(iso: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Lima',
  }).format(new Date(iso));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(price);
}

export function closesInLabel(closesAtIso: string, closed: boolean, now = Date.now()): string {
  if (closed) return 'cerrado';
  const diff = new Date(closesAtIso).getTime() - now;
  if (diff <= 0) return 'cerrado';
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `cierra en ${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `cierra en ${h} h` : `cierra en ${h} h ${m} min`;
}