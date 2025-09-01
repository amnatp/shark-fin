import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from '../cart-context';

function wrapper({ children }){ return <CartProvider>{children}</CartProvider>; }

describe('cart-context totals', () => {
  it('computes sell, margin, ros for single line', () => {
    const { result } = renderHook(()=> useCart(), { wrapper });
    act(()=> result.current.add({ id:'R1', sell:100, margin:20, origin:'A', destination:'B', basis:'Per Container', containerType:'40HC', mode:'Sea FCL' }));
    const { totals } = result.current;
    expect(totals.sell).toBeCloseTo(100);
    expect(totals.margin).toBeCloseTo(20);
    expect(totals.ros).toBeCloseTo(20);
  });
  it('applies discount to sell & margin in totals', () => {
    const { result } = renderHook(()=> useCart(), { wrapper });
    act(()=> result.current.add({ id:'R2', sell:200, margin:50, discount:0, origin:'A', destination:'B', basis:'Per Container', containerType:'40HC', mode:'Sea FCL' }));
    act(()=> result.current.update('R2',{ discount:10 }));
    const { totals } = result.current;
    expect(totals.sell).toBeCloseTo(190);
    expect(totals.margin).toBeCloseTo(40);
    expect(totals.ros).toBeCloseTo(40/190*100);
  });
  it('accumulates container units and TEU correctly', () => {
    const { result } = renderHook(()=> useCart(), { wrapper });
    act(()=> result.current.add({ id:'R3', sell:100, margin:10, qty:2, origin:'A', destination:'B', basis:'Per Container', containerType:'20GP', mode:'Sea FCL' }));
    act(()=> result.current.update('R3',{ qty:3 }));
    const { totals } = result.current;
    expect(totals.units.containers).toBe(3);
    expect(totals.units.teu).toBe(3); // 20GP factor 1
  });
});
