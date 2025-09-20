import { describe, test, expect } from 'vitest';
import { canViewCost, canViewRos, hideCostFor, hideRosFor } from '../permissions';

describe('permissions helper', ()=>{
  test('Sales cannot view cost or ros', ()=>{
    const user = { username: 'sales.chan', role: 'Sales' };
    expect(canViewCost(user)).toBe(false);
    expect(canViewRos(user)).toBe(false);
    expect(hideCostFor(user)).toBe(true);
    expect(hideRosFor(user)).toBe(true);
  });

  test('SalesManager can view ros but not cost', ()=>{
    const user = { username: 'salesmanager.top', role: 'SalesManager' };
    expect(canViewCost(user)).toBe(false);
    expect(canViewRos(user)).toBe(true);
    expect(hideCostFor(user)).toBe(true);
    expect(hideRosFor(user)).toBe(false);
  });

  test('Pricing can view cost and ros', ()=>{
    const user = { username: 'pricing.pim', role: 'Pricing' };
    expect(canViewCost(user)).toBe(true);
    expect(canViewRos(user)).toBe(true);
  });

  test('Director can view cost and ros', ()=>{
    const user = { username: 'director.dan', role: 'Director' };
    expect(canViewCost(user)).toBe(true);
    expect(canViewRos(user)).toBe(true);
  });

  test('Marketing can view cost and ros', ()=>{
    const user = { username: 'marketing.mary', role: 'Marketing' };
    expect(canViewCost(user)).toBe(true);
    expect(canViewRos(user)).toBe(true);
  });
});