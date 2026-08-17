/**
 * Null/empty/locale-tolerant money parsing. Matches Android PriceUtil.parsePrice.
 * Never throws; unparseable input returns 0.
 */
export function parsePrice(raw: string | number | null | undefined): number {
  if (raw == null) return 0;
  const asString = typeof raw === 'number' ? String(raw) : raw;
  const cleaned = asString.replace(/[^0-9.,-]/g, '');
  if (cleaned === '' || cleaned === '-') return 0;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normalized: string;
  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = cleaned.replace(/,/g, '');
    }
  } else if (lastComma >= 0) {
    normalized = cleaned.replace(',', '.');
  } else {
    normalized = cleaned;
  }

  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : 0;
}

export function formatEuro(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}
