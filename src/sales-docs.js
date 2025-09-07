// Unified Sales Docs utilities: treat Inquiry and Quotation as the same core object
// with type-specific fields. This is a soft-combine adapter to prepare for a future
// single collection if desired.

export function loadQuotations(){ try{ return JSON.parse(localStorage.getItem('quotations')||'[]'); }catch{ return []; } }
export function saveQuotations(rows){ try{ localStorage.setItem('quotations', JSON.stringify(rows)); }catch{/* ignore */} }
export function loadInquiries(){ try{ return JSON.parse(localStorage.getItem('savedInquiries')||'[]'); }catch{ return []; } }
export function saveInquiries(rows){ try{ localStorage.setItem('savedInquiries', JSON.stringify(rows)); }catch{/* ignore */} }

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
  const inquiries = loadInquiries();
  const idx = inquiries.findIndex(x=> x.id === inquiryId);
  if(idx < 0) return null;
  const inq = inquiries[idx];
  const now = new Date();
  const vf = validFrom || now.toISOString().slice(0,10);
  const vt = validTo || new Date(now.getFullYear(), now.getMonth()+2, 0).toISOString().slice(0,10);
  const quotation = {
    id: inq.id, // reuse stable internal id
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
  // Persist quotations
  const qs = loadQuotations();
  qs.unshift(quotation);
  saveQuotations(qs);
  // Remove inquiry from storage
  const remaining = inquiries.filter(x=> x.id !== inquiryId);
  saveInquiries(remaining);
  try{ window.dispatchEvent(new Event('storage')); }catch{/* ignore */}
  return quotation;
}
