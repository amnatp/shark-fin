// Unified Sales Docs utilities:
// Phase 2: support a single collection storage 'salesDocs' behind a feature flag,
// while keeping legacy readers for back-compat during transition.

const SINGLE_STORE = true; // flip to false to revert to legacy separate stores

function normalizeStage(s){
  const t = (s||'').toString().toLowerCase();
  if(['quote','quoting','quoted'].includes(t)) return 'quoted';
  if(['draft','sourcing','priced','won','lost'].includes(t)) return t;
  return t || 'draft';
}

function loadSalesDocsStore(){ try { return JSON.parse(localStorage.getItem('salesDocs')||'[]'); } catch { return []; } }
function saveSalesDocsStore(rows){ try { localStorage.setItem('salesDocs', JSON.stringify(rows)); } catch {/* ignore */} }
function migrateLegacyToSingle(){
  const migrated = localStorage.getItem('salesDocsMigrated')==='1';
  if(migrated) return;
  try{
    const inqs = loadInquiriesLegacy();
    const qts = loadQuotationsLegacy();
    const docs = [];
    for(const inq of inqs){ docs.push({ ...inq, docType:'inquiry', stage: normalizeStage(inq.status) }); }
    for(const q of qts){ docs.push({ ...q, docType:'quotation', stage: normalizeStage(q.status), quotationNo: q.quotationNo||q.id?.startsWith('QTN-')? q.id : (q.quotationNo||null) }); }
    saveSalesDocsStore(docs);
    localStorage.setItem('salesDocsMigrated','1');
  }catch{/* ignore */}
}

// Legacy store accessors (kept private)
function loadQuotationsLegacy(){ try{ return JSON.parse(localStorage.getItem('quotations')||'[]'); }catch{ return []; } }
function saveQuotationsLegacy(rows){ try{ localStorage.setItem('quotations', JSON.stringify(rows)); }catch{/* ignore */} }
function loadInquiriesLegacy(){ try{ return JSON.parse(localStorage.getItem('savedInquiries')||'[]'); }catch{ return []; } }
function saveInquiriesLegacy(rows){ try{ localStorage.setItem('savedInquiries', JSON.stringify(rows)); }catch{/* ignore */} }

// Unified public accessors that route depending on store mode
export function loadQuotations(){
  if(SINGLE_STORE){ migrateLegacyToSingle(); return loadSalesDocsStore().filter(d=> d.docType==='quotation'); }
  return loadQuotationsLegacy();
}
export function saveQuotations(rows){
  if(SINGLE_STORE){
    const all = loadSalesDocsStore();
    const other = all.filter(d=> d.docType!=='quotation');
    const normalized = rows.map(r=> ({ ...r, docType:'quotation', stage: normalizeStage(r.status) }));
    saveSalesDocsStore([...normalized, ...other]);
    return;
  }
  saveQuotationsLegacy(rows);
}
export function loadInquiries(){
  if(SINGLE_STORE){ migrateLegacyToSingle(); return loadSalesDocsStore().filter(d=> d.docType==='inquiry'); }
  return loadInquiriesLegacy();
}
export function saveInquiries(rows){
  if(SINGLE_STORE){
    const all = loadSalesDocsStore();
    const other = all.filter(d=> d.docType!=='inquiry');
    const normalized = rows.map(r=> ({ ...r, docType:'inquiry', stage: normalizeStage(r.status) }));
    saveSalesDocsStore([...other, ...normalized]);
    return;
  }
  saveInquiriesLegacy(rows);
}

export function toSalesDocFromInquiry(inq){
  if(!inq) return null;
  return {
    id: inq.id,
    docType: 'inquiry',
  stage: (inq.status || 'draft').toString().toLowerCase(),
    customer: inq.customer,
    salesOwner: inq.owner,
    mode: inq.mode,
    incoterm: inq.incoterm,
    validFrom: inq.validFrom || null,
    validTo: inq.validTo || null,
    lines: (inq.lines||[]).map(l=>({
      rateId: l.rateId || l.id,
      vendor: l.vendor,
      carrier: l.carrier,
      origin: l.origin,
      destination: l.destination,
      unit: l.containerType || l.basis || l.unit || 'Shipment',
      qty: l.qty || 1,
      sell: Number(l.sell)||0,
      margin: Number(l.margin)||0
    })),
    charges: inq.charges || [],
    tariffs: inq.tariffs || [],
    activity: inq.activity || [],
    raw: inq
  };
}

export function toSalesDocFromQuotation(q){
  if(!q) return null;
  return {
    id: q.id,
    docType: 'quotation',
  stage: (q.status || 'draft').toString().toLowerCase(),
    quotationNo: q.quotationNo || null,
    customer: q.customer,
    salesOwner: q.salesOwner,
    mode: q.mode,
    incoterm: q.incoterm,
    validFrom: q.validFrom,
    validTo: q.validTo,
    lines: (q.lines||[]).map(l=>({
      rateId: l.rateId || l.id,
      vendor: l.vendor,
      carrier: l.carrier,
      origin: l.origin,
      destination: l.destination,
      unit: l.unit || l.containerType || l.basis || 'Shipment',
      qty: l.qty || 1,
      sell: Number(l.sell)||0,
      margin: Number(l.margin)||0
    })),
    charges: q.charges || [],
    tariffs: q.tariffs || [],
    activity: q.activity || [],
    raw: q
  };
}

export function loadSalesDocs(){
  if(SINGLE_STORE){
    migrateLegacyToSingle();
    const docs = loadSalesDocsStore();
    return docs.map(d=> d.docType==='quotation' ? toSalesDocFromQuotation(d) : toSalesDocFromInquiry(d)).filter(Boolean);
  }
  const inquiries = loadInquiries().map(toSalesDocFromInquiry).filter(Boolean);
  const quotes = loadQuotations().map(toSalesDocFromQuotation).filter(Boolean);
  return [...quotes, ...inquiries];
}

export function generateQuotationId(){ return `Q-${Date.now().toString(36).toUpperCase()}`; }
export function generateQuotationNo(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  const t = String(d.getHours()).padStart(2,'0')+String(d.getMinutes()).padStart(2,'0')+String(d.getSeconds()).padStart(2,'0');
  return `QTN-${y}${m}${day}-${t}`;
}

export function buildQuotationFromCart({ customer, owner, mode, incoterm }, items, user){
  const now = new Date();
  return {
    id: generateQuotationId(),
    status: 'draft',
    version: 1,
    parentId: null,
    salesOwner: owner || user?.username || '',
    customer,
    mode,
    incoterm,
    currency: 'USD',
    validFrom: now.toISOString().slice(0,10),
    validTo: new Date(now.getFullYear(), now.getMonth()+2, 0).toISOString().slice(0,10),
    lines: (items||[]).map(i=> ({
      rateId: i.rateId || i.id,
      vendor: i.vendor || i.airlineName || '—',
      carrier: i.carrier || '',
      origin: i.origin,
      destination: i.destination,
      unit: i.containerType || i.basis || 'Shipment',
      qty: i.qty || 1,
      sell: Number(i.sell)||0,
      margin: Number(i.margin)||0
    })),
    charges: [],
    tariffs: [],
    activity: [{ ts: Date.now(), user: user?.username || 'system', action:'create', note:'Created from Inquiry Cart' }]
  };
}

// Convert an existing inquiry into a quotation reusing the same internal id.
// Removes the inquiry from savedInquiries, creates a quotation with quotationNo and default validity.
export function convertInquiryToQuotation(inquiryId, { user, validFrom, validTo } = {}){
  if(SINGLE_STORE){
    migrateLegacyToSingle();
    const docs = loadSalesDocsStore();
    const idx = docs.findIndex(x=> x.id===inquiryId && x.docType==='inquiry');
    if(idx<0) return null;
    const inq = docs[idx];
    const now = new Date();
    const vf = validFrom || now.toISOString().slice(0,10);
    const vt = validTo || new Date(now.getFullYear(), now.getMonth()+2, 0).toISOString().slice(0,10);
    const q = {
      ...inq,
      docType: 'quotation',
      quotationNo: generateQuotationNo(),
      status: 'draft',
      stage: 'draft',
      salesOwner: inq.owner || inq.salesOwner || (user?.username||''),
      validFrom: vf,
      validTo: vt,
      approvals: inq.approvals || [],
      activity: [ ...(inq.activity||[]), { ts: Date.now(), user: user?.username || 'system', action:'convert', note:`Converted inquiry ${inq.id} to quotation ${inq.id}` } ]
    };
    docs[idx] = q;
    saveSalesDocsStore(docs);
    try{ window.dispatchEvent(new Event('storage')); }catch{/* ignore */}
    return q;
  }
  // Legacy path
  const inquiries = loadInquiries();
  const idx = inquiries.findIndex(x=> x.id === inquiryId);
  if(idx < 0) return null;
  const inq = inquiries[idx];
  const now = new Date();
  const vf = validFrom || now.toISOString().slice(0,10);
  const vt = validTo || new Date(now.getFullYear(), now.getMonth()+2, 0).toISOString().slice(0,10);
  const quotation = {
    id: inq.id,
    quotationNo: generateQuotationNo(),
    status: 'draft',
    version: 1,
    parentId: null,
    salesOwner: inq.owner || inq.salesOwner || (user?.username||''),
    customer: inq.customer,
    mode: inq.mode,
    incoterm: inq.incoterm,
    currency: 'USD',
    validFrom: vf,
    validTo: vt,
    lines: (inq.lines||[]).map(l=> ({
      rateId: l.rateId || l.id,
      vendor: l.procuredVendor || l.vendor || '—',
      carrier: l.carrier || '',
      origin: l.origin,
      destination: l.destination,
      unit: l.containerType || l.basis || 'Shipment',
      qty: l.qty || 1,
      sell: Number(l.sell)||0,
      margin: Number(l.margin)||0
    })),
    charges: inq.charges || [],
    tariffs: inq.tariffs || [],
    approvals: [],
    activity: [ ...(inq.activity||[]), { ts: Date.now(), user: user?.username || 'system', action:'convert', note:`Converted inquiry ${inq.id} to quotation ${inq.id}` } ]
  };
  const qs = loadQuotations();
  qs.unshift(quotation);
  saveQuotations(qs);
  const remaining = inquiries.filter(x=> x.id !== inquiryId);
  saveInquiries(remaining);
  try{ window.dispatchEvent(new Event('storage')); }catch{/* ignore */}
  return quotation;
}
