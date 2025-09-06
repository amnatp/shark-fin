// Minimal file persistence helpers using File System Access API + IndexedDB
// Note: Works best in Chromium-based browsers. Provides safe fallbacks when unavailable.

const DB_NAME = 'sharkfin-store';
const STORE = 'kv';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbSet(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbDel(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function fsApiAvailable() {
  return typeof window !== 'undefined' && (!!window.showOpenFilePicker || !!window.showSaveFilePicker);
}

export async function ensurePermission(handle, mode = 'readwrite') {
  if (!handle) return false;
  if (!handle.queryPermission || !handle.requestPermission) return true;
  const opts = { mode };
  const q = await handle.queryPermission(opts);
  if (q === 'granted') return true;
  const r = await handle.requestPermission(opts);
  return r === 'granted';
}

export async function pickJsonFile({ create = false } = {}) {
  if (!fsApiAvailable()) throw new Error('File System Access API not available in this browser');
  if (create && window.showSaveFilePicker) {
    return window.showSaveFilePicker({
      suggestedName: 'carrier_surcharges.json',
      types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
    });
  }
  const pick = await window.showOpenFilePicker({ multiple: false, types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }] });
  return pick && pick[0];
}

export async function readJSONFile(handle) {
  if (!handle) throw new Error('No file handle');
  const ok = await ensurePermission(handle, 'read');
  if (!ok) throw new Error('Permission denied');
  const file = await handle.getFile();
  const text = await file.text();
  return JSON.parse(text || '[]');
}

export async function writeJSONFile(handle, data) {
  if (!handle) throw new Error('No file handle');
  const ok = await ensurePermission(handle, 'readwrite');
  if (!ok) throw new Error('Permission denied');
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(data ?? [], null, 2));
  await writable.close();
}

export const SURCHARGES_HANDLE_KEY = 'carrierSurcharges:fileHandle';
