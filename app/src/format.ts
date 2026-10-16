export function formatNumber(n: number): string {
  return (Math.round(n * 10) / 10).toString().replace('.', ',');
}

export function formatPrice(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace('.', ',');
  return `${text} Kč`;
}

export function formatValidTo(iso: string): string {
  const [, month, day] = iso.split('-').map(Number);
  return `do ${day}. ${month}.`;
}

/** "do 20. 10." for a running offer, "od 22. 10. do 25. 10." for one that has not started yet. */
export function formatValidity(o: { validFrom: string; validTo: string }, today: string): string {
  if (o.validFrom <= today) return formatValidTo(o.validTo);
  const [, month, day] = o.validFrom.split('-').map(Number);
  return `od ${day}. ${month}. ${formatValidTo(o.validTo)}`;
}

/** Portion factor, e.g. "1,25" (up to two decimals). */
export function formatScale(scale: number): string {
  return String(Math.round(scale * 100) / 100).replace('.', ',');
}
