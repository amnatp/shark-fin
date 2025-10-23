// Generic data normalization helpers for localStorage-backed entities
// Also provides unified read models across rates, inquiries, quotations, bookings, and shipments.

// Lightweight imports to compose unified views (no side effects)
import { loadSalesDocs } from './sales-docs';
import { loadAllRates } from './rates-store';

function parseJSON(key, fallback){
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}

function toISODate(input){
  if(!input) return '';
  try {
    const d = new Date(input);
    if(Number.isNaN(d.getTime())) return '';
    return d.toISOString();
  } catch { return ''; }
}

function toISODateOnly(input){
  const iso = toISODate(input);
  return iso ? iso.slice(0,10) : '';
}

function toNum(n, def=0){ const x = Number(n); return Number.isFinite(x) ? x : def; }

function upper(str){ return (str||'').toString().toUpperCase(); }
function title(str){ const s=(str||'').toString().toLowerCase(); return s? s.charAt(0).toUpperCase()+s.slice(1) : ''; }

export function normalizeBooking(b){
  if(!b || typeof b !== 'object') return b;
  const modeRaw = (b.mode||'').toString();
  const modeLC = modeRaw.toLowerCase();
  const mode = modeLC === 'air' ? 'Air' : 'Ocean';
  let serviceType = b.serviceType;
  if(mode === 'Air') serviceType = 'Air';
  else serviceType = upper(serviceType|| (b.containers && Object.values(b.containers).some(c=> Number(c)>0) ? 'FCL' : 'LCL'));

  const origin = b.origin || b.displayOrigin || b.pol || '';
  const destination = b.destination || b.displayDestination || b.pod || '';

  const containers = {
    '20DC': toNum(b.containers?.['20DC']),
    '40DC': toNum(b.containers?.['40DC']),
    '40HC': toNum(b.containers?.['40HC'])
  };

  const lines = Array.isArray(b.lines) ? b.lines.map((l,idx)=> ({
    idx: toNum(l?.idx, idx),
    rateId: l?.rateId || '',
    vendor: l?.vendor || l?.carrier || '',
    carrier: l?.carrier || l?.vendor || '',
    lane: l?.lane || `${b.displayOrigin||origin} → ${b.displayDestination||destination}`,
    unit: l?.unit || (mode==='Air' ? 'KG': (serviceType==='FCL' ? 'CTR':'CBM')),
    qty: toNum(l?.qty, 1),
    sell: toNum(l?.sell),
    discount: toNum(l?.discount),
    margin: toNum(l?.margin),
    ros: toNum(l?.ros)
  })) : [];

  // totals: compute if missing or invalid
  const totSell = lines.reduce((s,l)=> s + (toNum(l.sell)*Math.max(1,toNum(l.qty,1))), 0);
  const totMargin = lines.reduce((s,l)=> s + (toNum(l.margin)*Math.max(1,toNum(l.qty,1))), 0);
  const totRos = totSell ? (totMargin / totSell) * 100 : toNum(b.totals?.ros);

  const transport = {
    pol: b.pol || origin,
    pod: b.pod || destination,
    carrier: b.carrier || (lines[0]?.carrier || ''),
    vessel: b.vessel || '',
    voyage: b.voyage || '',
    etd: toISODateOnly(b.etd),
    eta: toISODateOnly(b.eta)
  };

  const statusRaw = b.status || 'DRAFT';
  const statusNorm = title(statusRaw);

  return {
    ...b,
    id: String(b.id || `B-${Date.now().toString(36)}`),
    mode,
    serviceType,
    displayOrigin: b.displayOrigin || origin,
    displayDestination: b.displayDestination || destination,
    origin,
    destination,
    pol: b.pol || origin,
    pod: b.pod || destination,
    status: upper(statusRaw),
    statusNorm,
    createdAt: toISODate(b.createdAt) || new Date().toISOString(),
    containers,
    transport,
    lines,
    totals: {
      sell: toNum(b.totals?.sell, totSell),
      margin: toNum(b.totals?.margin, totMargin),
      ros: Number.isFinite(Number(b.totals?.ros)) ? toNum(b.totals?.ros) : Math.round(totRos*10)/10
    },
    cargo: {
      ...b.cargo,
      packages: toNum(b.cargo?.packages, b.cargo?.pallets ? b.cargo.pallets*10 : 0),
      pieces: mode==='Air' ? toNum(b.cargo?.pieces || b.pcs) : undefined,
      weightKg: toNum(b.cargo?.weightKg || b.weightKg),
      volumeM3: toNum(b.cargo?.volumeM3 || b.volumeM3)
    }
  };
}

export function normalizeSeaShipment(s){
  if(!s || typeof s !== 'object') return s;
  const c20 = toNum(s.containers?.['20DC']);
  const c40 = toNum(s.containers?.['40DC']);
  const c40h = toNum(s.containers?.['40HC']);
  const totalCtr = c20 + c40 + c40h;
  const statusNorm = title(s.status || 'Draft');
  return {
    ...s,
    id: String(s.id || `SEA-${Date.now().toString(36)}`),
    status: s.status || 'Draft',
    statusNorm,
    mode: 'Ocean',
    serviceType: totalCtr>0 ? 'FCL' : 'LCL',
    containers: {
      '20DC': toNum(s.containers?.['20DC']),
      '40DC': toNum(s.containers?.['40DC']),
      '40HC': toNum(s.containers?.['40HC'])
    },
    transport: {
      ...s.transport,
      etd: toISODateOnly(s.transport?.etd),
      eta: toISODateOnly(s.transport?.eta)
    }
  };
}

export function normalizeShippingInstruction(sli){
  if(!sli || typeof sli !== 'object') return sli;
  const statusNorm = title(sli.status || 'Draft');
  const mode = sli.transport?.mode ? (String(sli.transport.mode).toLowerCase()==='air' ? 'Air':'Ocean') : undefined;
  return {
    ...sli,
    id: String(sli.id || `SLI-${Date.now().toString(36)}`),
    status: sli.status || 'Draft',
    statusNorm,
    mode: mode || sli.mode,
    transport: {
      ...sli.transport,
      exportDate: toISODateOnly(sli.transport?.exportDate)
    },
    commodities: Array.isArray(sli.commodities) ? sli.commodities.map((c)=> ({
      ...c,
      qty: toNum(c.qty),
      weight: toNum(c.weight),
      valueUsd: toNum(c.valueUsd)
    })) : []
  };
}

export function normalizeAllData(){
  // Bookings
  const bookings = parseJSON('bookings', []);
  const normBookings = Array.isArray(bookings) ? bookings.map(normalizeBooking) : [];
  try { localStorage.setItem('bookings', JSON.stringify(normBookings)); } catch(e){ console.warn('Failed to write normalized bookings', e); }

  // Sea Shipments
  const seaShipments = parseJSON('seaShipments', []);
  const normSea = Array.isArray(seaShipments) ? seaShipments.map(normalizeSeaShipment) : [];
  try { localStorage.setItem('seaShipments', JSON.stringify(normSea)); } catch(e){ console.warn('Failed to write normalized seaShipments', e); }

  // Shipping Instructions
  const slis = parseJSON('shippingInstructions', []);
  const normSlis = Array.isArray(slis) ? slis.map(normalizeShippingInstruction) : [];
  try { localStorage.setItem('shippingInstructions', JSON.stringify(normSlis)); } catch(e){ console.warn('Failed to write normalized SLIs', e); }

  try { window.dispatchEvent(new Event('storage')); window.dispatchEvent(new Event('bookingsUpdated')); } catch{/* ignore */}
  return { bookings: normBookings.length, seaShipments: normSea.length, shippingInstructions: normSlis.length };
}

// Optional: provide a unified read model across entities for analytics or cross-listing
export function getUnifiedRecords(){
  const bookings = parseJSON('bookings', []).map(normalizeBooking).map(b=> ({
    type:'Booking', id:b.id, bookingId:b.id, customer:b.customer||b.customerName||'',
    mode:b.mode, serviceType:b.serviceType, status:b.statusNorm||b.status,
    transport:b.transport, containers:b.containers, createdAt:b.createdAt
  }));
  const seas = parseJSON('seaShipments', []).map(normalizeSeaShipment).map(s=> ({
    type:'SeaShipment', id:s.id, bookingId:s.bookingId||'', customer:'',
    mode:s.mode, serviceType:s.serviceType, status:s.statusNorm||s.status,
    transport:s.transport, containers:s.containers, createdAt: s.createdAt || ''
  }));
  const slis = parseJSON('shippingInstructions', []).map(normalizeShippingInstruction).map(si=> ({
    type:'ShippingInstruction', id:si.id, bookingId:si.bookingId||'', customer:'',
    mode:si.mode||si.transport?.mode||'', serviceType: (si.mode==='Air'?'Air':undefined), status:si.statusNorm||si.status,
    transport:{ pol: si.transport?.pol, pod: si.transport?.pod, carrier: si.transport?.exportingCarrier, etd: si.transport?.exportDate, eta: '' },
    containers: undefined, createdAt: ''
  }));
  // Sales docs (Inquiry/Quotation)
  let docs = [];
  try {
    docs = loadSalesDocs().map(d=>{
      const type = d.docType === 'quotation' ? 'Quotation' : 'Inquiry';
      const lines = Array.isArray(d.lines)? d.lines: [];
      const origin = lines[0]?.origin || d.origin || '';
      const destination = lines[0]?.destination || d.destination || '';
      const lane = (origin||destination) ? `${origin}  ${destination}` : (d.lane||'');
      const sell = lines.reduce((s,l)=> s + (Number(l.sell)||0)*(Number(l.qty)||1), 0);
      const margin = lines.reduce((s,l)=> s + (Number(l.margin)||0)*(Number(l.qty)||1), 0);
      const ros = sell ? Math.round((margin/sell)*1000)/10 : 0;
      return {
        type, id: d.id, docType: d.docType, customer: d.customer||'',
        mode: d.mode || '', serviceType: undefined, status: d.stage || d.status || 'draft',
        transport: { pol: origin, pod: destination, carrier: lines[0]?.carrier || lines[0]?.vendor || '' },
        containers: undefined, createdAt: d.validFrom || '', totals: { sell, margin, ros }
      };
    });
  } catch {/* ignore */}
  // Rates (from rates-store)
  let rates = [];
  try {
    const all = loadAllRates();
    const modes = ['FCL','LCL','Air','Transport','Customs'];
    for(const m of modes){
      const arr = Array.isArray(all[m]) ? all[m] : [];
      for(const r of arr){
        const laneStr = r.lane || '';
        const [orig, dest] = laneStr.includes('→') ? laneStr.split('→').map(s=>s.trim()) : [laneStr.split(/\s*[-–>]\s*/)[0]||'', laneStr.split(/\s*[-–>]\s*/)[1]||''];
        const sell = Number(r.sell ?? r.ratePerKgSell ?? r.minChargeSell ?? r.price ?? 0) || 0;
        const cost = Number(r.cost ?? r.ratePerKgCost ?? r.minChargeCost ?? 0) || 0;
        const margin = r.margin != null ? Number(r.margin) : (sell && cost ? +(sell - cost).toFixed(2) : 0);
        const ros = sell ? Math.round(((sell - cost)/sell)*1000)/10 : (r.ros||0);
        rates.push({
          type:'Rate', id:r.rateId || r.id, customer:'', mode: m==='Air'?'Air':'Ocean', serviceType: m, status:'Active',
          transport:{ pol: orig, pod: dest, carrier: r.carrier || r.vendor || '' },
          containers: undefined, createdAt:'', unit: r.container || r.containerType || r.unit || '',
          totals:{ sell, margin, ros }
        });
      }
    }
  } catch {/* ignore */}

  return [...rates, ...docs, ...bookings, ...seas, ...slis];
}

export default normalizeAllData;
