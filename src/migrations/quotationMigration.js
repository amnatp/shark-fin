// Lightweight migration helpers for quotations stored in localStorage
export function backupQuotations(){
  const key = 'quotations';
  const now = Date.now();
  const backupKey = `${key}_backup_${now}`;
  try {
    const data = localStorage.getItem(key);
    localStorage.setItem(backupKey, data === null ? '[]' : data);
    return backupKey;
  } catch (err){
    console.error('backupQuotations failed', err);
    throw err;
  }
}

export function migratePopulateCustomerFromFallbacks(){
  const key = 'quotations';
  const raw = localStorage.getItem(key) || '[]';
  let list;
  try { list = JSON.parse(raw); } catch { list = []; }
  let changed = 0;
  for(const q of list){
    const hasCustomer = q.customer && String(q.customer).trim();
    if(hasCustomer) continue;
    const candidate = (q.inquirySnapshot && q.inquirySnapshot.customer) || q.customerName || q.customerCode || null;
    if(candidate && String(candidate).trim()){
      q.customer = candidate;
      changed++;
    }
  }
  if(changed) localStorage.setItem(key, JSON.stringify(list));
  return { changed, total: list.length };
}

// Targeted mapping helper for exact ID -> customer text
export function applyIdMapping(mapping){
  const key = 'quotations';
  const raw = localStorage.getItem(key) || '[]';
  let list;
  try { list = JSON.parse(raw); } catch { list = []; }
  let changed = 0;
  for(const q of list){
    if(mapping[q.id] && (!q.customer || !String(q.customer).trim())){
      q.customer = mapping[q.id];
      changed++;
    }
  }
  if(changed) localStorage.setItem(key, JSON.stringify(list));
  return { changed, total: list.length };
}
