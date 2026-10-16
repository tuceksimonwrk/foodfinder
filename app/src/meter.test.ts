import { describe, it, expect } from 'vitest';
import { meterScale, meterStatus } from './meter';

describe('meterStatus', () => {
  it('range: ok within ±5 %, low below, high above', () => {
    expect(meterStatus('range', 2100, 2200)).toBe('ok');
    expect(meterStatus('range', 1900, 2200)).toBe('low');
    expect(meterStatus('range', 2500, 2200)).toBe('high');
  });
  it('min: ok when the target is reached', () => {
    expect(meterStatus('min', 150, 150)).toBe('ok');
    expect(meterStatus('min', 160, 150)).toBe('ok');
    expect(meterStatus('min', 120, 150)).toBe('low');
  });
  it('max: ok when the limit is not exceeded', () => {
    expect(meterStatus('max', 70, 70)).toBe('ok');
    expect(meterStatus('max', 40, 70)).toBe('ok');
    expect(meterStatus('max', 80, 70)).toBe('high');
  });
});

describe('meterScale', () => {
  it('puts the target marker at 80 % of the track', () => expect(meterScale(0, 100).targetPct).toBe(80));
  it('fills proportionally and reaches the marker at the target', () => expect(meterScale(100, 100).fillPct).toBeCloseTo(80));
  it('never overflows the track', () => expect(meterScale(500, 100).fillPct).toBe(100));
  it('copes with a zero target', () => expect(meterScale(50, 0).fillPct).toBe(0));
});
