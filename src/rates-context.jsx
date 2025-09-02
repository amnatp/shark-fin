import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { loadAllRates, computeBookingCounts, getRateById } from './rates-store';

const RatesContext = createContext(null);

export function RatesProvider({ children }){
  const [rates, setRates] = useState(()=> loadAllRates());
  const [bookingCounts, setBookingCounts] = useState(()=> computeBookingCounts());
  const refresh = useCallback(()=>{
    setRates(loadAllRates());
    setBookingCounts(computeBookingCounts());
  },[]);

  // Listen to storage + custom events to refresh
  useEffect(()=>{
    function onStorage(e){ if(['airlineRateSheets','dynamicRates','rateIdMap','bookings'].includes(e.key)) refresh(); }
    function onCustom(){ refresh(); }
    window.addEventListener('storage', onStorage);
    window.addEventListener('bookingsUpdated', onCustom);
    window.addEventListener('ratesUpdated', onCustom);
    return ()=>{
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('bookingsUpdated', onCustom);
      window.removeEventListener('ratesUpdated', onCustom);
    };
  },[refresh]);

  const value = {
    rates,
    bookingCounts,
    refresh,
    getRateById
  };
  return <RatesContext.Provider value={value}>{children}</RatesContext.Provider>;
}

export function useRates(){ return useContext(RatesContext); }

export default RatesProvider;
