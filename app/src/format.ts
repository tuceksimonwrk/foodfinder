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
