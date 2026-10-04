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

// Cost per usage unit is often far below one sol (S/ 0.004 per gram on a 4.00/kg
// insumo), and formatPrice caps at 2 decimals, so it would render as S/ 0.00 and
// hide the arithmetic the recipe form is trying to show. A line subtotal
// (cantidad × precio) can fall below one cent the same way, so both the
// per-usage-unit price and the row subtotal use this formatter. Allow up to 4
// decimals while keeping the currency style and the trailing cents of normal
// prices.
export function formatPrecisePrice(price: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
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