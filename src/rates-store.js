// Centralized rates store utilities (prototype)
// Provides functions to load & normalize rates from localStorage + sample seed
// and ensure stable rateIds consistent across modules.

import sampleRates from './sample-rates.json';

const MODES = ['FCL','LCL','Air','Transport','Customs'];

export function rosFrom(cost, sell){ if(!sell) return 0; return Math.round(((sell - cost)/sell)*100); }

export function ensureRateIds(mode, rows){
  let map = {};
  try { map = JSON.parse(localStorage.getItem('rateIdMap')||'{}'); } catch {/* ignore */}
  let changed = false;
  const withIds = rows.map(r=>{
    if(r.rateId) return r;
    const sig = `${mode}|${r.lane}|${r.vendor||''}|${r.container||r.containerType||r.unit||''}`;
    let id = map[sig];
    if(!id){ id = `RID-${Math.random().toString(36).slice(2,7)}${Date.now().toString(36)}`; map[sig]=id; changed=true; }
    return { ...r, rateId:id };
  });
  if(changed){ try { localStorage.setItem('rateIdMap', JSON.stringify(map)); } catch {/* ignore */} }
  return withIds;
}

export function loadAirlineSheets(){
  try { return JSON.parse(localStorage.getItem('airlineRateSheets')||'[]'); } catch { return []; }
}

export function deriveSimpleAirRates(sheets){
  try {
    return sheets.map(s=>{
      const lane = `${s.route?.origin||''} → ${s.route?.destination||''}`.trim();
      const vendor = s.airline?.iata || s.airline?.name || '-';
      const breaks = (s.general?.breaks||[]);
      if(!breaks.length) return null;
      const prefer = breaks.find(b=> Number(b.thresholdKg)===100) || breaks.slice().sort((a,b)=>a.thresholdKg-b.thresholdKg)[0];
      const baseRate = Number(prefer.ratePerKg)||0;
      const costRate = +(baseRate*0.85).toFixed(4);
      const sellRate = baseRate;
      const minCharge = Number(s.general?.minCharge)||0;
      const minCost = +(minCharge*0.85).toFixed(2);
      const minSell = minCharge;
      const ros = sellRate? Math.round(((sellRate - costRate)/sellRate)*100) : 0;
      return { lane, vendor, sheetId: s.id, ratePerKgCost: costRate, ratePerKgSell: sellRate, minChargeCost: minCost, minChargeSell: minSell, ros, chargeCode: 'FRT-A', rateId: s.id };
    }).filter(Boolean);
  } catch { return []; }
}

export function loadBaseRates(){
  // Start from sample seed each load; dynamic overlays will merge
  const base = {
    FCL: [...sampleRates.FCL],
    LCL: [...sampleRates.LCL],
    Air: [...sampleRates.Air],
    Transport: [...sampleRates.Transport],
    Customs: [...sampleRates.Customs]
  };
  // Merge in dynamicRates if any
  try {
    const dyn = JSON.parse(localStorage.getItem('dynamicRates')||'{}');
    for(const m of MODES){
      if(dyn[m] && Array.isArray(dyn[m]) && dyn[m].length){
        base[m] = mergeByKey(base[m], dyn[m], r=> JSON.stringify([r.lane,r.vendor,r.container||r.unit||'']));
      }
    }
  } catch {/* ignore */}
  return base;
}

function mergeByKey(prev, next, keyFn){
  const map = new Map();
  [...prev, ...next].forEach(r=> map.set(keyFn(r), r));
  return Array.from(map.values());
}

export function loadAllRates(){
  const sheets = loadAirlineSheets();
  const derivedAir = deriveSimpleAirRates(sheets);
  const base = loadBaseRates();
  // Ensure IDs
  for(const m of MODES){ base[m] = ensureRateIds(m, base[m]); }
  // Merge derived air rows (avoid duplicates by sheetId/rateId)
  const existingIds = new Set(base.Air.map(r=> r.rateId));
  derivedAir.forEach(r=> { if(!existingIds.has(r.rateId)) base.Air.push(r); });
  // Attach bookingIds if available
  let rateBookings = {};
  try { rateBookings = JSON.parse(localStorage.getItem('rateBookings')||'{}'); } catch { rateBookings = {}; }
  for(const m of MODES){
    base[m] = base[m].map(r=> ({ ...r, bookingIds: rateBookings[r.rateId] || [] }));
  }
  return { ...base, derivedAir };
}

export function getRateById(rateId){
  if(!rateId) return null;
  try {
    const all = loadAllRates();
    for(const m of MODES){
      const found = all[m].find(r=> r.rateId===rateId);
      if(found) return { ...found, mode:m };
    }
  } catch {/* ignore */}
  return null;
}

export function computeBookingCounts(){
  try {
    const bookings = JSON.parse(localStorage.getItem('bookings')||'[]');
    const counts = {};
    bookings.forEach(b=> (b.lines||[]).forEach(l=>{ if(l.rateId){ counts[l.rateId] = (counts[l.rateId]||0)+1; } }));
    return counts;
  } catch { return {}; }
}
