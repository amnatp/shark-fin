import { describe, it, expect } from 'vitest';
import { teuFactor, computeTotals, computeLineRos } from '../calc-utils';

describe('calc-utils', () => {
  it('teuFactor handles common container types', () => {
    expect(teuFactor('20GP')).toBe(1);
    expect(teuFactor('40GP')).toBe(2);
    expect(teuFactor('40HC')).toBe(2);
    expect(teuFactor('45HC')).toBe(2.25);
    expect(teuFactor('53HQ')).toBe(2.65);
  });

  it('computeLineRos returns 0 when sell is 0', () => {
    expect(computeLineRos(0, 10)).toBe(0);
  });

  it('computeTotals aggregates sell, margin, ros and units', () => {
    const items = [
      { sell: 100, margin: 20, qty: 1, basis: 'Per Container', containerType: '40HC' },
      { sell: 50, margin: 5, qty: 2, basis: 'Per Container', containerType: '20GP' },
      { sell: 2, margin: 0.4, qty: 100, basis: 'Per KG' }
    ];
    const t = computeTotals(items);
    // Sell: 100*1 + 50*2 + 2*100 = 100 + 100 + 200 = 400
    expect(t.sell).toBeCloseTo(400);
    // Margin: 20*1 + 5*2 + 0.4*100 = 20 + 10 + 40 = 70
    expect(t.margin).toBeCloseTo(70);
    expect(t.ros).toBeCloseTo((70/400)*100);
    // Units: containers 1 + 2 = 3; TEU: 40HC(2) + 20GP*2(1 each)=2+2=4; KG: 100
    expect(t.units.containers).toBe(3);
    expect(t.units.teu).toBeCloseTo(4);
    expect(t.units.kg).toBe(100);
  });
});
