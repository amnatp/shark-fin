// Utility to seed sample Sea Shipments into localStorage ('seaShipments')
// Shape aligns with sea-shipment.jsx

function safeJSON(key, fallback){
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}

function toISO(dateStr){
  // Accepts 'YYYY-MM-DD' or locale-like; returns ISO substring YYYY-MM-DD for consistency
  try {
    if(!dateStr) return '';
    const d = new Date(dateStr);
    if(Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0,10);
  } catch { return ''; }
}

function buildFromBooking(bk){
  return {
    id: `SEA-${bk.id}`,
    bookingId: bk.id,
    status: 'Draft',
    parties: {
      shipper: { name: bk.customerName || bk.customer || '', address: '' },
      consignee: { name: bk.consignee?.name || bk.customer || '', address: '' }
    },
    transport: {
      carrier: bk.carrier || '',
      vessel: bk.vessel || '',
      voyage: bk.voyage || '',
      pol: bk.pol || bk.origin || bk.displayOrigin || '',
      pod: bk.pod || bk.destination || bk.displayDestination || '',
      etd: toISO(bk.etd) || '',
      eta: toISO(bk.eta) || '',
      refNo: bk.bookingNo || bk.id
    },
    containers: {
      '20DC': bk.containers?.['20DC'] || 0,
      '40DC': bk.containers?.['40DC'] || 0,
      '40HC': bk.containers?.['40HC'] || 0
    },
    notes: bk.notes || '',
    isDG: !!bk.dg,
    isReefer: !!bk.reefer
  };
}

function standaloneSamples(){
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const pad = (n)=> String(n).padStart(2,'0');
  const day = pad(now.getUTCDate());
  const month = pad(now.getUTCMonth()+1);
  const baseDate = `${yyyy}-${month}-${day}`;
  return [
    { id:'SEA-DEMO-001', pol:'BKK', pod:'LAX', carrier:'ONE', vessel:'ONE IBIS', voyage:'NV123', etd:baseDate, eta:baseDate, c20:1, c40:1, c40hc:0, flags:{ dg:false, rf:false } },
    { id:'SEA-DEMO-002', pol:'SHA', pod:'NYC', carrier:'CMA CGM', vessel:'CMA GEMINI', voyage:'GM456', etd:baseDate, eta:baseDate, c20:0, c40:2, c40hc:1, flags:{ dg:true, rf:false } },
    { id:'SEA-DEMO-003', pol:'HKG', pod:'LHR', carrier:'MSC', vessel:'MSC AURORA', voyage:'MS789', etd:baseDate, eta:baseDate, c20:3, c40:0, c40hc:0, flags:{ dg:false, rf:true } },
  ].map(s=> ({
    id: s.id,
    bookingId: '',
    status: 'Draft',
    parties: { shipper:{ name:'Demo Shipper', address:'' }, consignee:{ name:'Demo Consignee', address:'' } },
    transport: { carrier:s.carrier, vessel:s.vessel, voyage:s.voyage, pol:s.pol, pod:s.pod, etd:s.etd, eta:s.eta, refNo:s.id },
    containers: { '20DC': s.c20, '40DC': s.c40, '40HC': s.c40hc },
    notes: '', isDG: s.flags.dg, isReefer: s.flags.rf
  }));
}

export function seedSampleSeaShipments(options={}){
  const { maxFromBookings = 5, includeStandalone = true } = options;
  const existing = safeJSON('seaShipments', []);
  const existingIds = new Set(existing.map(s=> s.id));

  // From bookings (ocean only)
  const bookings = safeJSON('bookings', []);
  const oceans = bookings.filter(b=> ['ocean','sea'].includes(String(b.mode||'').toLowerCase()));
  const picked = oceans.slice(0, maxFromBookings).map(buildFromBooking);

  // Standalone samples
  const extras = includeStandalone ? standaloneSamples() : [];

  const merged = [...existing];
  for(const s of [...picked, ...extras]){
    if(!existingIds.has(s.id)) merged.push(s);
  }
  try { localStorage.setItem('seaShipments', JSON.stringify(merged)); } catch(e){ console.warn('Failed to seed seaShipments:', e); }
  // Notify listeners (if any)
  try { window.dispatchEvent(new Event('storage')); } catch{/* ignore */}
  return merged;
}

export default seedSampleSeaShipments;
