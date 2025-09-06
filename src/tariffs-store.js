// Centralized tariffs persistence and events for sharing across components
// Stores data in localStorage under 'carrierSurcharges'

const KEY = 'carrierSurcharges';

// Initialize storage (samples added conditionally below for demo carriers)
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

  // If empty, initialize but continue so sample/demo data can be seeded
  if (!Array.isArray(list) || list.length === 0) {
    list = seed();
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

  // One-time sample: specific documentation/handling fees in THB by carrier (tradelane left blank to show as '—')
  try {
    const seededDoc = localStorage.getItem(KEY+':seedDocFeesV1');
    if (!seededDoc) {
      const byId = new Set(list.map(r=> r.id));
      const items = [
        { carrier:'Maersk', charge:'Export B/L Fee', amount:1400, notes:'Documentation fee', code:'EXBL' },
        { carrier:'CMA CGM', charge:'Import D/O Fee', amount:1400, notes:'Delivery Order issuance', code:'IMDO' },
        { carrier:'Hapag-Lloyd', charge:'Switch B/L Fee', amount:3000, notes:'Replacement B/L', code:'SWBL' },
        { carrier:'ONE', charge:'Telex Release Fee', amount:1500, notes:'Release without original', code:'TLX' },
        { carrier:'Evergreen', charge:'Amendment Fee', amount:1000, notes:'Documentation change', code:'AMD' },
        { carrier:'MSC', charge:'Correction Fee', amount:1500, notes:'Error correction', code:'CORR' },
      ];
      const additions = items.map(it => {
        const cc = it.carrier.replace(/[^A-Z0-9]/gi,'').toUpperCase();
        return {
          id: `SAMP-${cc}-${it.code}-THB`,
          carrier: it.carrier,
          tradelane: '',
          equipment: 'ALL',
          charge: it.charge,
          basis: 'Per B/L',
          currency: 'THB',
          amount: it.amount,
          notes: it.notes,
          active: true,
        };
      }).filter(s=> !byId.has(s.id));
      if (additions.length) { list = [...list, ...additions]; changedAny = true; }
      localStorage.setItem(KEY+':seedDocFeesV1', '1');
    }
  } catch { /* ignore */ }

  // One-time sample: THB documentation-style fees similar to screenshot
  try {
    const seededDoc = localStorage.getItem(KEY+':seedTHBDocFeesV1');
    if (!seededDoc) {
      const byId = new Set(list.map(r=> r.id));
      const items = [
        { id:'SAMP-DOC-MSK-EXBL-THB', carrier:'Maersk', charge:'Export B/L Fee', amount:1400, notes:'Documentation fee' },
        { id:'SAMP-DOC-CMA-IMDO-THB', carrier:'CMA CGM', charge:'Import D/O Fee', amount:1400, notes:'Delivery Order issuance' },
        { id:'SAMP-DOC-HPL-SWBL-THB', carrier:'Hapag-Lloyd', charge:'Switch B/L Fee', amount:3000, notes:'Replacement B/L' },
        { id:'SAMP-DOC-ONE-TELX-THB', carrier:'ONE', charge:'Telex Release Fee', amount:1500, notes:'Release without original' },
        { id:'SAMP-DOC-EVG-AMDT-THB', carrier:'Evergreen', charge:'Amendment Fee', amount:1000, notes:'Documentation change' },
        { id:'SAMP-DOC-MSC-CORR-THB', carrier:'MSC', charge:'Correction Fee', amount:1500, notes:'Error correction' },
      ];
      const base = { tradelane:'', equipment:'ALL', basis:'Per B/L', currency:'THB', active:true };
      const additionsDoc = items
        .map(it => ({ ...base, ...it }))
        .filter(it => !byId.has(it.id));
      if (additionsDoc.length) { list = [...list, ...additionsDoc]; changedAny = true; }
      localStorage.setItem(KEY+':seedTHBDocFeesV1', '1');
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

// Programmatic seeding helper: add sample demo surcharges and persist.
// opts: { force?: boolean } — if force, clears seed flags and re-adds samples (dedup by id still applies)
export function seedSampleSurcharges(opts = {}) {
  const force = !!opts.force;
  if (typeof window === 'undefined') return [];
  if (force) {
    try {
      localStorage.removeItem(KEY+':seedSamplesV1');
      localStorage.removeItem(KEY+':seedUSSamplesV1');
  localStorage.removeItem(KEY+':seedTHBDocFeesV1');
    } catch { /* ignore */ }
  }
  // Load will apply sample seeds if flags are absent; then persist if new rows were added
  // Call load twice to ensure seeding logic runs and final list is returned
  loadTariffs();
  const after = loadTariffs();
  try { window.dispatchEvent(new CustomEvent('tariffs:updated', { detail: { count: after.length } })); } catch { /* ignore */ }
  return after;
}
