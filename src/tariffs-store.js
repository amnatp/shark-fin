// Centralized tariffs persistence and events for sharing across components
// Stores data in localStorage under 'carrierSurcharges'

const KEY = 'carrierSurcharges';

// Curated standard surcharges (carrier-agnostic). Amounts are indicative.
const STANDARD_SURCHARGES = [
  // Documentation & admin
  { id:'STD-DOC-ALL', carrier:'ALL', tradelane:'ALL/ALL', equipment:'ALL', charge:'Export B/L Fee', basis:'Per B/L', currency:'THB', amount:1400, notes:'Standard documentation fee', active:true },
  { id:'STD-TLX-ALL', carrier:'ALL', tradelane:'ALL/ALL', equipment:'ALL', charge:'Telex Release Fee', basis:'Per B/L', currency:'THB', amount:1500, notes:'Release without originals', active:true },
  { id:'STD-AMD-ALL', carrier:'ALL', tradelane:'ALL/ALL', equipment:'ALL', charge:'Amendment Fee', basis:'Per B/L', currency:'THB', amount:1000, notes:'BL amendment', active:true },

  // Handling (ocean)
  { id:'STD-THC-O', carrier:'ALL', tradelane:'ALL/ALL', equipment:'ALL', charge:'Terminal Handling (Origin)', basis:'Per Container', currency:'USD', amount:85, notes:'Origin THC (indicative)', active:true },
  { id:'STD-THC-D', carrier:'ALL', tradelane:'ALL/ALL', equipment:'ALL', charge:'Terminal Handling (Destination)', basis:'Per Container', currency:'USD', amount:95, notes:'Destination THC (indicative)', active:true },

  // Fuel & seasonal (ocean)
  { id:'STD-BAF', carrier:'ALL', tradelane:'ALL/ALL', equipment:'ALL', charge:'BAF', basis:'Per Container', currency:'USD', amount:150, notes:'Bunker Adjustment Factor (indicative)', active:true },
  { id:'STD-LSS', carrier:'ALL', tradelane:'ALL/ALL', equipment:'ALL', charge:'Low Sulphur Surcharge', basis:'Per Container', currency:'USD', amount:40, notes:'ECA/IMO 2020 (indicative)', active:true },
  { id:'STD-PSS', carrier:'ALL', tradelane:'ALL/ALL', equipment:'ALL', charge:'Peak Season Surcharge', basis:'Per Container', currency:'USD', amount:100, notes:'Applies during peak only', active:true },

  // Security & port (ocean)
  { id:'STD-ISPS', carrier:'ALL', tradelane:'ALL/ALL', equipment:'ALL', charge:'ISPS Security', basis:'Per Container', currency:'USD', amount:15, notes:'Port security', active:true },
  { id:'STD-CIC', carrier:'ALL', tradelane:'ALL/ALL', equipment:'ALL', charge:'CIC Surcharge', basis:'Per Container', currency:'USD', amount:120, notes:'Container imbalance (indicative)', active:true },

  // Regulatory filings by destination (ocean)
  { id:'STD-AMS-US', carrier:'ALL', tradelane:'ALL/US*', equipment:'ALL', charge:'AMS Submission', basis:'Per B/L', currency:'USD', amount:40, notes:'US AMS filing', active:true },
  { id:'STD-ENS-EU', carrier:'ALL', tradelane:'ALL/EU*', equipment:'ALL', charge:'ENS Filing', basis:'Per B/L', currency:'EUR', amount:30, notes:'EU ICS/ENS filing', active:true },
];

function seed() {
  try { localStorage.setItem(KEY, JSON.stringify(STANDARD_SURCHARGES)); } catch { /* ignore */ }
  return [...STANDARD_SURCHARGES];
}

function normalizeEquipment(equipment) {
  if (!equipment) return 'ALL';
  const eq = String(equipment).toUpperCase();
  if (eq === '20GP') return '20DC';
  if (eq === 'ALL') return 'ALL';
  return equipment;
}

function migrate(rows) {
  const legacyIds = new Set([
    'SAMPLE-ALL-ALL',
    'SAMPLE-THLCH-ALL',
    'SAMPLE-ALL-USSTAR',
    'SAMPLE-AMS-ALL-USSTAR',
    'ONE-EXBL-THBKK-USLGB-ALL',
    'EVG-EBL-THBKK-USLAX-ALL',
    'EVG-TLX-THBKK-USLAX-ALL',
    'EVG-AMD-THBKK-USLAX-ALL',
    'EMC-CIC-CNSHA-GBFXT-40HC',
    'ONE-EXBL-THBKK-JPTYO-20DC',
    'MSC-IMDO-THLCH-USEWR-40HC',
  ]);
  let changed = false;
  const filtered = Array.isArray(rows) ? rows.filter(r => !legacyIds.has(r.id)) : [];
  if (filtered.length !== (Array.isArray(rows) ? rows.length : 0)) changed = true;

  const migrated = filtered.map(r => {
    const next = { ...r };
    if (!('equipment' in next) || !next.equipment || next.equipment !== normalizeEquipment(next.equipment)) {
      next.equipment = normalizeEquipment(next.equipment);
    }
    if (!('active' in next)) next.active = true;
    return next;
  });

  return { rows: migrated, changed };
}

function ensurePatterns(list) {
  const ids = new Set(list.map(r => r.id));
  const additions = STANDARD_SURCHARGES.filter(s => !ids.has(s.id));
  if (additions.length === 0) return { rows: list, changed: false };
  return { rows: [...list, ...additions], changed: true };
}

export function loadTariffs() {
  if (typeof window === 'undefined') return [];
  let list = [];
  try {
    const raw = localStorage.getItem(KEY);
    list = raw ? JSON.parse(raw) : [];
  } catch {
    list = [];
  }

  if (!Array.isArray(list) || list.length === 0) {
    return seed();
  }

  let changedAny = false;
  const mig = migrate(list);
  if (mig.changed) { list = mig.rows; changedAny = true; }
  const ens = ensurePatterns(list);
  if (ens.changed) { list = ens.rows; changedAny = true; }

  if (changedAny) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ }
  }
  return list;
}

export function saveTariffs(rows) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(KEY, JSON.stringify(rows || [])); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent('tariffs:updated', { detail: { count: (rows && rows.length) || 0 } })); } catch { /* ignore */ }
}

export function onTariffsChanged(callback) {
  if (typeof window === 'undefined') return () => {};
  const handler = () => {
  try { callback(loadTariffs()); } catch { /* ignore */ }
  };
  const storageHandler = (e) => {
  try { if (e.key === KEY) handler(); } catch { /* ignore */ }
  };
  window.addEventListener('tariffs:updated', handler);
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener('tariffs:updated', handler);
    window.removeEventListener('storage', storageHandler);
  };
}

export const TARIFFS_KEY = KEY;
