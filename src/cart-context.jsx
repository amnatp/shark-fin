/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { computeTotals } from './calc-utils';

const CartContext = createContext(null);

export function CartProvider({ children }){
  const [items, setItems] = useState(()=>{
    try { return JSON.parse(localStorage.getItem('cartItems')||'[]'); } catch { return []; }
  }); // each: rate + qty

  const add = useCallback(rate => {
    const qty = rate.qty != null ? rate.qty : 1;
    // Preserve stable rateId if provided (align with RateTable and rate-management linkage)
    const rateId = rate.rateId || rate.id;
  setItems(prev => [{ ...rate, rateId, _origSell: rate.sell, _origMargin: rate.margin, qty, timeFrame: rate.timeFrame || 'week', special:false }, ...prev]);
  }, []);
  const remove = useCallback(id => setItems(prev => prev.filter(i=> i.id!==id)), []);
  const update = useCallback((id, patch) => setItems(prev => prev.map(i=> i.id===id? { ...i, ...patch }: i)), []);
  const clear = useCallback(()=> setItems([]), []);

  // Persist cart whenever items change
  React.useEffect(()=>{ try { localStorage.setItem('cartItems', JSON.stringify(items)); } catch {/* ignore */} }, [items]);

  const totals = useMemo(()=> computeTotals(items), [items]);

  const grouped = useMemo(()=>{
    const map = new Map();
    for(const i of items){
      const key = `${i.origin}→${i.destination}`;
      if(!map.has(key)) map.set(key, []);
      map.get(key).push(i);
    }
    return Array.from(map.entries()).map(([key,list])=> ({ key, list }));
  }, [items]);

  const value = { items, add, remove, update, clear, totals, grouped };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// Hook consumer
export function useCart(){
  const ctx = useContext(CartContext);
  if(!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
