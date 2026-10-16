import { formatNumber } from '../format';
import { meterScale, meterStatus, type MeterKind } from '../meter';

interface Props {
  label: string;
  unit: string;
  kind: MeterKind;
  value: number;
  target: number;
}

const fmt = (n: number, unit: string) => (unit === 'kcal' ? String(Math.round(n)) : formatNumber(n));

const STATUS_TEXT = { ok: 'v cíli', low: 'pod cílem', high: 'nad limitem' } as const;

/** A scoreboard bar: today's total against its target (marker at the target). */
export function Meter({ label, unit, kind, value, target }: Props) {
  const status = meterStatus(kind, value, target);
  const { fillPct, targetPct } = meterScale(value, target);
  return (
    <div className="meter-row">
      <span>{label}</span>
      <div
        className="meter-track"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={target * 1.25}
        aria-valuenow={Math.round(value)}
        aria-valuetext={`${fmt(value, unit)} ${unit} z ${fmt(target, unit)}, ${STATUS_TEXT[status]}`}
      >
        <div className={`meter-fill ${status}`} style={{ ['--w' as string]: `${fillPct}%` }} />
        <div className="meter-mark" style={{ ['--t' as string]: `${targetPct}%` }} />
      </div>
      <span className="meter-value">
        <b>{fmt(value, unit)}</b> / {fmt(target, unit)} {unit}
      </span>
    </div>
  );
}
