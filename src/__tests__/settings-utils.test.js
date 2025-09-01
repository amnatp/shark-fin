import { describe, it, expect } from 'vitest';
import { getRosBand } from '../settings-utils';

const mockSettings = {
  rosBands: [
    { id: 'low', max: 12 },
    { id: 'mid', min: 12, max: 20 },
    { id: 'high', min: 20 }
  ]
};

describe('getRosBand', () => {
  it('returns low band when below first threshold', () => {
    expect(getRosBand(mockSettings, 5).id).toBe('low');
  });
  it('returns mid band within middle range inclusive lower bound', () => {
    expect(getRosBand(mockSettings, 12).id).toBe('mid');
    expect(getRosBand(mockSettings, 19.99).id).toBe('mid');
  });
  it('returns high band at or above upper threshold', () => {
    expect(getRosBand(mockSettings, 20).id).toBe('high');
  });
  it('returns null when value missing', () => {
    expect(getRosBand(mockSettings, null)).toBeNull();
  });
  it('returns null when settings missing', () => {
    expect(getRosBand(null, 10)).toBeNull();
  });
});
