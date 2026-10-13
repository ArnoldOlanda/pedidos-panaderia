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

/**
 * A product counts as closed when the stored flag is set OR its close time has
 * already passed.
 *
 * The flag alone is not enough: AutoCloseService flips it from a 5-minute
 * cron, so for up to five minutes a product whose closesAt elapsed still
 * arrives as closed:false. Both the Cierre label and the Estado badge derive
 * from this predicate so the two columns can never disagree.
 */
export function isProductClosed(closesAtIso: string, closed: boolean, now = Date.now()): boolean {
  return closed || new Date(closesAtIso).getTime() <= now;
}

export function closesInLabel(closesAtIso: string, closed: boolean, now = Date.now()): string {
  if (isProductClosed(closesAtIso, closed, now)) return 'cerrado';
  const diff = new Date(closesAtIso).getTime() - now;
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `cierra en ${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `cierra en ${h} h` : `cierra en ${h} h ${m} min`;
}

// A recipe response may omit the labor column an older backend does not return.
// Rendering must survive that (there is no error boundary around this route), so
// a non-finite value shows the neutral placeholder instead of throwing on
// value.toFixed(2). Never fabricate a default percentage here.
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(2)}%`;
}
