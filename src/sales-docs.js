// Unified Sales Docs utilities:
// Phase 2: support a single collection storage 'salesDocs' behind a feature flag,
// while keeping legacy readers for back-compat during transition.

/*
  Quotation and Inquiry status reference (used across the app):

  Quotation statuses (internal):
  - draft     : Work-in-progress quotation created by Sales (not yet submitted)
  - submit    : Quotation has been submitted to customer (outbound)
  - approve   : Quotation auto-approved (meets ROS guardrail) or approved by approver
  - reject    : Quotation explicitly rejected

  Sales / historical stages (normalized by normalizeStage):
  - quoted    : Generic quoted/submitted state (legacy aliases: quote, quoting, quoted, submit, submitted, sent)
  - sourcing  : Inquiry is in sourcing stage
  - priced    : Inquiry has been priced
  - won/lost  : Outcome states

  ApprovalStatus (separate field on quotations): none | pending | approved | rejected

  Notes:
  - The UI wires specific actions (submit, approve, request approval) to map into these statuses.
  - generateQuotationNo() creates a business-facing quotation number in the format Q-MMYY#### (4-digit monthly counter).
*/

import { INQUIRY_STATUS_QUOTED, QUOTATION_DEFAULT_STATUS } from './inquiry-statuses';

const SINGLE_STORE = true; // flip to false to revert to legacy separate stores

function normalizeStage(s){
  const t = (s||'').toString().toLowerCase();
  if(['quote','quoting','quoted','submit','submitted','sent'].includes(t)) return 'quoted';
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
    for(const q of qts){
      // Prefer explicit quotationNo, otherwise if the legacy id looks like a quotation id (QTN-...) use it
      const qNo = (q && q.quotationNo) ? q.quotationNo : (q && typeof q.id === 'string' && q.id.startsWith('QTN-') ? q.id : null);
      docs.push({ ...q, docType:'quotation', stage: normalizeStage(q.status), quotationNo: qNo });
    }
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
  // canonical normalized stage (shared across doc types). Keep original `status` on the object
  // for doc-specific workflows while exposing `stage` for unified lists/filters.
  stage: normalizeStage(inq.status),
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
  // Keep quotation `status` (draft/submit/approve/reject) for workflow logic,
  // but expose a normalized `stage` value for cross-document queries and listings.
  stage: normalizeStage(q.status),
    quotationNo: q.quotationNo || null,
  approvalStatus: q.approvalStatus || 'none',
  approvalRequestedAt: q.approvalRequestedAt || null,
  approvalDecidedAt: q.approvalDecidedAt || null,
  approvalBy: q.approvalBy || null,
  approvalNote: q.approvalNote || null,
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

export function generateQuotationId(date = new Date()){
  // Create a business-facing quotation id in same format as quotationNo: Q-YYMM####
  return generateQuotationNo(date);
}
export function generateQuotationNo(date = new Date()){
  // Format: Q-YYMM#### where #### is a monthly running number starting from 0001
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth()+1).padStart(2, '0');
  const prefix = `Q-${yy}${mm}`;
  let maxSeq = 0;
  try {
    // Check unified store
    const docs = loadSalesDocsStore();
    for(const d of docs){
      if(d?.docType !== 'quotation') continue;
      const no = d?.quotationNo || '';
      if(typeof no === 'string' && no.startsWith(prefix)){
        // Extract trailing digits after prefix (ignore non-digits)
        const tail = no.slice(prefix.length).replace(/[^0-9]/g,'');
        const n = parseInt(tail || '0', 10);
        if(!isNaN(n) && n > maxSeq) maxSeq = n;
      }
    }
    // Also check legacy quotations if present
    const legacyQs = JSON.parse(localStorage.getItem('quotations')||'[]');
    for(const q of legacyQs){
      const no = q?.quotationNo || q?.id || '';
      if(typeof no === 'string' && no.startsWith(prefix)){
        const tail = no.slice(prefix.length).replace(/[^0-9]/g,'');
        const n = parseInt(tail || '0', 10);
        if(!isNaN(n) && n > maxSeq) maxSeq = n;
      }
    }
  } catch {/* ignore */}
  const next = String(maxSeq + 1).padStart(4,'0');
  return `${prefix}${next}`;
}

// Migration: normalize existing stored quotation ids and numbers to Q-YYMM#### for a given month.
export function migrateNormalizeQuotationNumbers(date = new Date()){
  try{
    migrateLegacyToSingle();
    const docs = loadSalesDocsStore();
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth()+1).padStart(2,'0');
    const prefix = `Q-${yy}${mm}`;
    // determine current max sequence for prefix
    let maxSeq = 0;
    for(const d of docs){
      if(d?.docType !== 'quotation') continue;
      const no = d?.quotationNo || d?.id || '';
      if(typeof no === 'string' && no.startsWith(prefix)){
        const tail = no.slice(prefix.length).replace(/[^0-9]/g,'');
        const n = parseInt(tail || '0', 10);
        if(!isNaN(n) && n > maxSeq) maxSeq = n;
      }
    }
    const idMap = {};
    // assign new ids for quotations that don't already match the prefix
    for(const d of docs){
      if(d?.docType !== 'quotation') continue;
      const current = d?.quotationNo || d?.id || '';
      if(typeof current === 'string' && current.startsWith(prefix) && current.length >= prefix.length + 4) continue; // already ok
      maxSeq += 1;
      const seq = String(maxSeq).padStart(4,'0');
      const newId = `${prefix}${seq}`;
      idMap[d.id] = newId;
      d.id = newId;
      d.quotationNo = newId;
    }
    // update references across docs
    for(const d of docs){
      if(d.parentId && idMap[d.parentId]) d.parentId = idMap[d.parentId];
      if(d.quotationId && idMap[d.quotationId]) d.quotationId = idMap[d.quotationId];
      if(d.inquiryId && idMap[d.inquiryId]) d.inquiryId = idMap[d.inquiryId];
      // also update any raw fields that may reference old ids
      if(d.raw && typeof d.raw === 'object'){
        if(d.raw.quotationId && idMap[d.raw.quotationId]) d.raw.quotationId = idMap[d.raw.quotationId];
        if(d.raw.id && idMap[d.raw.id]) d.raw.id = idMap[d.raw.id];
      }
    }
    saveSalesDocsStore(docs);
    try{ window.dispatchEvent(new Event('storage')); }catch{/* ignore */}
    return { updated: Object.keys(idMap).length, prefix, mapping: idMap };
  }catch(err){
    console.error('Migration error', err);
    return { error: err?.message || String(err) };
  }
}

export function buildQuotationFromCart({ customer, owner, mode, incoterm }, items, user){
  const now = new Date();
  return {
    id: generateQuotationId(now),
    status: QUOTATION_DEFAULT_STATUS,
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
    // In single-store mode, KEEP the inquiry and CREATE a separate quotation linked back to it.
    migrateLegacyToSingle();
    const docs = loadSalesDocsStore();
    const idx = docs.findIndex(x=> x.id===inquiryId && x.docType==='inquiry');
    if(idx<0) return null;
    const inq = docs[idx];
    // If a quotation already exists for this inquiry, return it
    const existingQuote = docs.find(d => d.docType==='quotation' && (d.inquiryId === inq.id || d.id === inq.quotationId));
    if(existingQuote) return existingQuote;
    const now = new Date();
    const vf = validFrom || now.toISOString().slice(0,10);
    const vt = validTo || new Date(now.getFullYear(), now.getMonth()+2, 0).toISOString().slice(0,10);
  const qId = generateQuotationId(now);
    const quotation = {
      id: qId,
      docType: 'quotation',
      status: QUOTATION_DEFAULT_STATUS,
      stage: normalizeStage(QUOTATION_DEFAULT_STATUS),
      // business-facing quotationNo intentionally omitted for new quotations
      inquiryId: inq.id,
  approvalStatus: 'none', // none | pending | approved | rejected
  approvalRequestedAt: null,
  approvalDecidedAt: null,
  approvalBy: null,
  approvalNote: null,
      salesOwner: inq.owner || inq.salesOwner || (user?.username||''),
      customer: inq.customer,
      mode: inq.mode,
      incoterm: inq.incoterm,
      currency: inq.currency || 'USD',
      validFrom: inq.validFrom || vf,
      validTo: inq.validTo || vt,
      lines: (inq.lines||[]).map(l=> ({
        rateId: l.rateId || l.id,
        vendor: l.procuredVendor || l.vendor || '—',
        carrier: l.carrier || '',
        origin: l.origin,
        destination: l.destination,
        unit: l.unit || l.containerType || l.basis || 'Shipment',
        qty: l.qty || 1,
        sell: Number(l.sell)||0,
        margin: Number(l.margin)||0
      })),
      charges: inq.charges || [],
      tariffs: inq.tariffs || [],
      approvals: [],
      activity: [ ...(inq.activity||[]), { ts: Date.now(), user: user?.username || 'system', action:'convert', note:`Created quotation ${qId} from inquiry ${inq.id}` } ]
    };
    // Update inquiry to reflect linkage and status
    const updatedInquiry = {
      ...inq,
      docType: 'inquiry',
      status: INQUIRY_STATUS_QUOTED,
      stage: normalizeStage(INQUIRY_STATUS_QUOTED),
      // business-facing quotationNo intentionally omitted for converted inquiries
      quotationNo: null,
      quotationId: qId,
    };
    const next = [...docs];
    next[idx] = updatedInquiry;
    next.unshift(quotation); // add new quotation to the front
    saveSalesDocsStore(next);
    try{ window.dispatchEvent(new Event('storage')); }catch{/* ignore */}
    return quotation;
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
    // do not assign a business-facing quotationNo when converting in legacy mode
    status: QUOTATION_DEFAULT_STATUS,
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
