/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }){
  const [items, setItems] = useState(()=>{
    try { return JSON.parse(localStorage.getItem('cartItems')||'[]'); } catch { return []; }
  }); // each: rate + qty, discount

  const add = useCallback(rate => {
    setItems(prev => [{ ...rate, qty:1, discount:0, special:false }, ...prev]);
  }, []);
  const remove = useCallback(id => setItems(prev => prev.filter(i=> i.id!==id)), []);
  const update = useCallback((id, patch) => setItems(prev => prev.map(i=> i.id===id? { ...i, ...patch }: i)), []);
  const clear = useCallback(()=> setItems([]), []);

  // Persist cart whenever items change
  React.useEffect(()=>{ try { localStorage.setItem('cartItems', JSON.stringify(items)); } catch {/* ignore */} }, [items]);

  const totals = useMemo(()=>{
    const sell = items.reduce((s,i)=> s + (i.sell - (i.discount||0)) * (i.qty||1),0);
    const margin = items.reduce((s,i)=> s + (i.margin - (i.discount||0)) * (i.qty||1),0);
    const ros = sell ? (margin / sell) * 100 : 0;
    // Unit normalization: containers -> TEU, weight (KG) separate
    const teuFactor = (containerType='') => {
      const ct = containerType.toUpperCase();
      if(ct.includes('20')) return 1;
      if(ct.includes('45')) return 2.25;
      if(ct.includes('53')) return 2.65; // seldom but include
      if(ct.includes('40')) return 2;
      return 1; // default
    };
    let containers = 0, teu = 0, kg = 0;
    for(const i of items){
      const basis = (i.basis||'').toLowerCase();
      const qty = i.qty||1;
      if(basis.includes('container')){ containers += qty; teu += teuFactor(i.containerType)*qty; }
      else if(basis.includes('kg')) { kg += qty; }
    }
    const units = { containers, teu, kg };
    return { sell, margin, ros, units };
  }, [items]);

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
