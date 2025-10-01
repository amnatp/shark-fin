// Charge Code migration/backfill utilities
// Scans localStorage-backed stores for legacy or free-text charge code values and maps them
// to managed charge codes defined under 'chargeCodes'. Produces a report and can apply fixes.

import { loadTariffs, saveTariffs, TARIFFS_KEY } from '../tariffs-store';

function loadManagedCodes() {
  let list = [];
  try { list = JSON.parse(localStorage.getItem('chargeCodes')||'[]'); } catch (e) { console.debug('loadManagedCodes: failed to parse chargeCodes', e); list = []; }
  const codes = (Array.isArray(list)? list: []).map(c => ({
    code: String(c.code||'').trim().toUpperCase(),
    name: String(c.name||'').trim(),
    description: String(c.description||'').trim(),
  })).filter(c => c.code);
  const byCode = new Map(codes.map(c => [c.code, c]));
  const byName = new Map(codes.map(c => [c.name.toLowerCase(), c]));
  return { list: codes, byCode, byName };
}

function findCandidates(value, index) {
  if(!value) return [];
  const v = String(value).trim();
  const upper = v.toUpperCase();
  const lower = v.toLowerCase();
  const out = [];
  // exact code
  const byCode = index.byCode.get(upper);
  if(byCode) out.push(byCode.code);
  // exact name
  const byName = index.byName.get(lower);
  if(byName && !out.includes(byName.code)) out.push(byName.code);
  // prefix code
  for(const c of index.list){ if(c.code.startsWith(upper) && !out.includes(c.code)) out.push(c.code); }
  // prefix name
  for(const c of index.list){ if(c.name.toLowerCase().startsWith(lower) && !out.includes(c.code)) out.push(c.code); }
  return out;
}

function deepClone(x){ return JSON.parse(JSON.stringify(x)); }

// Scan and optionally apply exact, unambiguous mappings.
export function runChargeCodeMigration({ applyExact = true, dryRun = false } = {}){
  const index = loadManagedCodes();
  const report = {
    summary: { localCharges: { scanned:0, applied:0 }, tariffs: { scanned:0, applied:0 }, managedRates: { scanned:0, applied:0 }, quotations: { scanned:0, applied:0 } },
    applied: [],
    ambiguous: [],
    unknown: [],
  };

  // 1) Local Charges (chargesLibrary/localChargesLibrary) — field: code
  let lcRaw = null; try { lcRaw = JSON.parse(localStorage.getItem('localChargesLibrary') || localStorage.getItem('chargesLibrary') || '[]'); } catch (e) { console.debug('migration: failed to parse localChargesLibrary/chargesLibrary', e); lcRaw = []; }
  const lc = Array.isArray(lcRaw)? deepClone(lcRaw) : [];
  lc.forEach((row, idx) => {
    const current = row.code ? String(row.code).trim() : '';
    if(!current) return; // skip empty
    report.summary.localCharges.scanned++;
    const cands = findCandidates(current, index);
    if(cands.length === 1){
      const nextCode = cands[0];
      if(nextCode !== current){
        if(applyExact && !dryRun){ row.code = nextCode; }
        report.summary.localCharges.applied++;
        report.applied.push({ type:'localCharges', index: idx, before: current, after: nextCode });
      }
    } else if(cands.length > 1){
      report.ambiguous.push({ type:'localCharges', index: idx, current, candidates: cands });
    } else {
      report.unknown.push({ type:'localCharges', index: idx, current });
    }
  });
  if(applyExact && !dryRun){
    try { localStorage.setItem('localChargesLibrary', JSON.stringify(lc)); localStorage.setItem('chargesLibrary', JSON.stringify(lc)); } catch (e) { console.debug('migration: failed to persist local charges libraries', e); }
  }

  // 2) Tariffs (carrier surcharges) — field: charge (free text -> managed code)
  let tariffs = loadTariffs();
  let tariffsClone = deepClone(tariffs);
  tariffsClone.forEach((row, idx) => {
    const src = row.code || row.charge || '';
    const current = String(src||'').trim();
    if(!current) return;
    report.summary.tariffs.scanned++;
    const cands = findCandidates(current, index);
    if(cands.length === 1){
      const nextCode = cands[0];
      if(nextCode !== current){
        if(applyExact && !dryRun){ tariffsClone[idx] = { ...row, charge: nextCode }; }
        report.summary.tariffs.applied++;
        report.applied.push({ type:'tariffs', id: row.id, before: current, after: nextCode });
      }
    } else if(cands.length > 1){
      report.ambiguous.push({ type:'tariffs', id: row.id, current, candidates: cands });
    } else {
      report.unknown.push({ type:'tariffs', id: row.id, current });
    }
  });
  if(applyExact && !dryRun){ try { saveTariffs(tariffsClone); } catch (e) { console.debug('migration: failed to save tariffs', e); } }

  // 3) Managed Rates — field: chargeCode
  let managed = {}; try { managed = JSON.parse(localStorage.getItem('managedRates')||'{}'); } catch (e) { console.debug('migration: failed to parse managedRates', e); managed = {}; }
  const RATE_SETS = ['FCL','LCL','Air','Transport','Customs'];
  let managedChanged = false;
  RATE_SETS.forEach(mode => {
    const list = Array.isArray(managed[mode]) ? managed[mode] : [];
    list.forEach((row, idx) => {
      const current = row.chargeCode ? String(row.chargeCode).trim() : '';
      if(!current) return; // skip missing
      report.summary.managedRates.scanned++;
      const cands = findCandidates(current, index);
      if(cands.length === 1){
        const nextCode = cands[0];
        if(nextCode !== current){
          if(applyExact && !dryRun){ row.chargeCode = nextCode; managedChanged = true; }
          report.summary.managedRates.applied++;
          report.applied.push({ type:'managedRates', mode, index: idx, before: current, after: nextCode, id: row.id || row.rateId || null });
        }
      } else if(cands.length > 1){
        report.ambiguous.push({ type:'managedRates', mode, index: idx, id: row.id || row.rateId || null, current, candidates: cands });
      } else {
        report.unknown.push({ type:'managedRates', mode, index: idx, id: row.id || row.rateId || null, current });
      }
    });
  });
  if(applyExact && !dryRun && managedChanged){
    try { localStorage.setItem('managedRates', JSON.stringify(managed)); window.dispatchEvent(new Event('managedRatesUpdated')); } catch (e) { console.debug('migration: failed to persist managedRates', e); }
  }

  // 4) Quotations — lines[].chargeCode
  let quotes = []; try { quotes = JSON.parse(localStorage.getItem('quotations')||'[]'); } catch (e) { console.debug('migration: failed to parse quotations', e); quotes = []; }
  const qClone = deepClone(quotes);
  qClone.forEach((q) => {
    (q.lines||[]).forEach((l, li) => {
      const current = l && l.chargeCode ? String(l.chargeCode).trim() : '';
      if(!current) return; // skip missing — cannot infer
      report.summary.quotations.scanned++;
      const cands = findCandidates(current, index);
      if(cands.length === 1){
        const nextCode = cands[0];
        if(nextCode !== current){
          if(applyExact && !dryRun){ l.chargeCode = nextCode; }
          report.summary.quotations.applied++;
          report.applied.push({ type:'quotations', id: q.id, lineIndex: li, before: current, after: nextCode });
        }
      } else if(cands.length > 1){
        report.ambiguous.push({ type:'quotations', id: q.id, lineIndex: li, current, candidates: cands });
      } else {
        report.unknown.push({ type:'quotations', id: q.id, lineIndex: li, current });
      }
    });
  });
  if(applyExact && !dryRun){ try { localStorage.setItem('quotations', JSON.stringify(qClone)); } catch (e) { console.debug('migration: failed to persist quotations', e); } }

  return report;
}

// Create timestamped backups of relevant stores. Returns a map of { key: backupKey }
export function backupChargeCodeStores(){
  const ts = new Date().toISOString().replace(/[:.]/g,'-');
  const keys = [
    'localChargesLibrary',
    'chargesLibrary',
    'managedRates',
    TARIFFS_KEY,
    'quotations',
  ];
  const out = {};
  keys.forEach(k => {
    try{
      const raw = localStorage.getItem(k);
      const bkey = `${k}:backup:${ts}`;
      localStorage.setItem(bkey, raw ?? 'null');
      out[k] = bkey;
    } catch (e) { console.debug('backupChargeCodeStores: failed for key', k, e); }
  });
  return out;
}

// Apply selections for ambiguous items. selections: Array of { type, key..., chosen }
export function applyChargeCodeMappings(selections){
  const index = loadManagedCodes();
  const valid = (code) => !!index.byCode.get(String(code||'').toUpperCase());
  let applied = 0;

  // Local Charges
  const lcSel = selections.filter(s=> s.type==='localCharges' && s.chosen && valid(s.chosen));
  if(lcSel.length){
    let lc = []; try { lc = JSON.parse(localStorage.getItem('localChargesLibrary')||localStorage.getItem('chargesLibrary')||'[]'); } catch (e) { console.debug('apply mappings: failed to parse local charges', e); lc = []; }
    lcSel.forEach(s => { const row = lc[s.index]; if(row) row.code = s.chosen; });
    try { localStorage.setItem('localChargesLibrary', JSON.stringify(lc)); localStorage.setItem('chargesLibrary', JSON.stringify(lc)); } catch (e) { console.debug('apply mappings: failed to persist local charges', e); }
    applied += lcSel.length;
  }

  // Tariffs
  const tSel = selections.filter(s=> s.type==='tariffs' && s.chosen && valid(s.chosen));
  if(tSel.length){
    let tariffs = loadTariffs();
    const byId = new Map(tariffs.map(r=> [r.id, r]));
    tSel.forEach(s => { const row = byId.get(s.id); if(row) row.charge = s.chosen; });
    try { saveTariffs(Array.from(byId.values())); } catch (e) { console.debug('apply mappings: failed to persist tariffs', e); }
    applied += tSel.length;
  }

  // Managed Rates
  const mrSel = selections.filter(s=> s.type==='managedRates' && s.chosen && valid(s.chosen));
  if(mrSel.length){
    let managed = {}; try { managed = JSON.parse(localStorage.getItem('managedRates')||'{}'); } catch (e) { console.debug('apply mappings: failed to parse managedRates', e); managed = {}; }
    mrSel.forEach(s => { const arr = Array.isArray(managed[s.mode])? managed[s.mode]: null; if(arr && arr[s.index]) arr[s.index].chargeCode = s.chosen; });
    try { localStorage.setItem('managedRates', JSON.stringify(managed)); window.dispatchEvent(new Event('managedRatesUpdated')); } catch (e) { console.debug('apply mappings: failed to persist managedRates', e); }
    applied += mrSel.length;
  }

  // Quotations
  const qSel = selections.filter(s=> s.type==='quotations' && s.chosen && valid(s.chosen));
  if(qSel.length){
    let quotes = []; try { quotes = JSON.parse(localStorage.getItem('quotations')||'[]'); } catch (e) { console.debug('apply mappings: failed to parse quotations', e); quotes = []; }
    const byId = new Map(quotes.map(q=> [q.id, q]));
    qSel.forEach(s => { const q = byId.get(s.id); if(q && q.lines && q.lines[s.lineIndex]) q.lines[s.lineIndex].chargeCode = s.chosen; });
    try { localStorage.setItem('quotations', JSON.stringify(Array.from(byId.values()))); } catch (e) { console.debug('apply mappings: failed to persist quotations', e); }
    applied += qSel.length;
  }

  return { applied, total: selections.length };
}
