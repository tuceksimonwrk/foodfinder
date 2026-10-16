export type MeterKind = 'range' | 'min' | 'max';
export type MeterStatus = 'ok' | 'low' | 'high';

const RANGE_TOLERANCE = 0.05;

/** How a daily total compares with its target: ±5 % (calories), at least (protein) or at most (fat). */
export function meterStatus(kind: MeterKind, value: number, target: number): MeterStatus {
  switch (kind) {
    case 'range':
      if (Math.abs(value - target) <= RANGE_TOLERANCE * target) return 'ok';
      return value < target ? 'low' : 'high';
    case 'min':
      return value >= target ? 'ok' : 'low';
    case 'max':
      return value <= target ? 'ok' : 'high';
  }
}

/** The track is 125 % of the target wide, so the target marker sits at 80 % and overshoot stays visible. */
export function meterScale(value: number, target: number): { fillPct: number; targetPct: number } {
  const targetPct = 80;
  if (!(target > 0)) return { fillPct: 0, targetPct };
  return { fillPct: Math.min(100, Math.max(0, (value / target) * targetPct)), targetPct };
}
