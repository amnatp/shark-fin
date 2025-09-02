import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from '../cart-context';

function wrapper({ children }){ return <CartProvider>{children}</CartProvider>; }

describe('cart-context totals', () => {
  // Ensure isolation (cart-context persists to localStorage)
  beforeEach(()=> { try { localStorage.clear(); } catch {/* ignore */} });
  it('computes sell, margin, ros for single line', () => {
    const { result } = renderHook(()=> useCart(), { wrapper });
    act(()=> result.current.add({ id:'R1', sell:100, margin:20, origin:'A', destination:'B', basis:'Per Container', containerType:'40HC', mode:'Sea FCL' }));
    const { totals } = result.current;
    expect(totals.sell).toBeCloseTo(100);
    expect(totals.margin).toBeCloseTo(20);
    expect(totals.ros).toBeCloseTo(20);
  });
  // Discount test removed (discount feature deprecated)
  it('applies 1 TEU per 20GP container', () => {
    const { result } = renderHook(()=> useCart(), { wrapper });
    act(()=> result.current.add({ id:'R3', sell:100, margin:10, origin:'A', destination:'B', basis:'Per Container', containerType:'20GP', mode:'Sea FCL', qty:3 }));
    const { totals, items } = result.current;
    // Compute expected TEU from items for 20GP (factor 1)
    const expectedTeu = items
      .filter(i=> (i.basis||'').toLowerCase().includes('container') && (i.containerType||'').toUpperCase().includes('20'))
      .reduce((s,i)=> s + (i.qty||1)*1,0);
    expect(totals.units.teu).toBe(expectedTeu);
  });
});
