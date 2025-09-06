// Centralized tariffs persistence and events for sharing across components
// Stores data in localStorage under 'carrierSurcharges'

const KEY = 'carrierSurcharges';

// No default seeding for surcharges; they must be carrier-specific and created by users.
function seed() { try { localStorage.setItem(KEY, JSON.stringify([])); } catch { /* ignore */ } return []; }

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
  const filtered0 = Array.isArray(rows) ? rows.filter(r => !legacyIds.has(r.id)) : [];
  if (filtered0.length !== (Array.isArray(rows) ? rows.length : 0)) changed = true;

  // Enforce carrier-specific: move/remove any 'ALL' or empty carrier items
  const orphan = [];
  const filtered = filtered0.filter(r => {
    const c = String(r.carrier||'').trim();
    const isAll = !c || c.toUpperCase()==='ALL';
    if (isAll) orphan.push(r);
    return !isAll;
  });
  if (filtered.length !== (Array.isArray(rows) ? rows.length : 0)) changed = true;
  if (orphan.length) {
    try { localStorage.setItem(KEY+':orphanBackup', JSON.stringify(orphan)); } catch { /* ignore */ }
  }

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

// No auto-add patterns now that surcharges must be carrier-specific
function ensurePatterns(list) { return { rows: list, changed: false }; }

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

  // One-time sample: add carrier-wide surcharges applying to all tradelanes
  try {
    const seeded = localStorage.getItem(KEY+':seedSamplesV1');
    if (!seeded) {
      const byId = new Set(list.map(r=> r.id));
      const carriers = ['Evergreen','ONE','Maersk','MSC','Hapag-Lloyd','CMA CGM'];
      const samples = [];
      carriers.forEach(c=>{
        const cc = c.replace(/[^A-Z0-9]/gi,'').toUpperCase();
        const base = { carrier:c, tradelane:'ALL/ALL', equipment:'ALL', basis:'Per Container', currency:'USD', active:true };
        samples.push(
          { id:`SAMP-${cc}-BAF`, charge:'BAF', amount:150, notes:'Sample BAF (all lanes)', ...base },
          { id:`SAMP-${cc}-LSS`, charge:'Low Sulphur Surcharge', amount:40, notes:'Sample LSS (all lanes)', ...base },
          { id:`SAMP-${cc}-PSS`, charge:'Peak Season Surcharge', amount:100, notes:'Sample PSS (all lanes)', ...base },
        );
      });
      const additions = samples.filter(s=> !byId.has(s.id));
      if (additions.length) { list = [...list, ...additions]; changedAny = true; }
      localStorage.setItem(KEY+':seedSamplesV1', '1');
    }
  } catch { /* ignore */ }

  // One-time sample: add carrier-specific surcharges applying to US destinations (ALL/US*)
  try {
    const seededUS = localStorage.getItem(KEY+':seedUSSamplesV1');
    if (!seededUS) {
      const byId = new Set(list.map(r=> r.id));
      const carriers = ['Evergreen','ONE','Maersk','MSC','Hapag-Lloyd','CMA CGM'];
      const samplesUS = [];
      carriers.forEach(c=>{
        const cc = c.replace(/[^A-Z0-9]/gi,'').toUpperCase();
        const base = { carrier:c, tradelane:'ALL/US*', equipment:'ALL', basis:'Per B/L', currency:'USD', active:true };
        samplesUS.push(
          { id:`SAMP-${cc}-AMS-US`, charge:'AMS Submission', amount:40, notes:'US AMS filing (all lanes to US)', ...base },
          { id:`SAMP-${cc}-AMSAMD-US`, charge:'AMS Amendment Fee', amount:30, notes:'US AMS amendment (all lanes to US)', ...base },
        );
      });
      const additionsUS = samplesUS.filter(s=> !byId.has(s.id));
      if (additionsUS.length) { list = [...list, ...additionsUS]; changedAny = true; }
      localStorage.setItem(KEY+':seedUSSamplesV1', '1');
    }
  } catch { /* ignore */ }

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
