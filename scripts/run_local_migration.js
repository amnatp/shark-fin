/*
  Run this script in Node to apply the same localStorage migration logic to a JSON file exported from the browser.

  Usage (macOS):
    # 1) From browser console: localStorage.getItem('quotations') and save to quotations.json
    # 2) From repo root:
        node scripts/run_local_migration.js quotations.json

  The script will create a timestamped backup file next to the input file and write the migrated output to <input>.migrated.json
*/
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
if(args.length < 1){
  console.error('Usage: node run_local_migration.js <quotations.json>');
  process.exit(2);
}
const inFile = path.resolve(args[0]);
if(!fs.existsSync(inFile)){ console.error('File not found:', inFile); process.exit(2); }
const raw = await fs.promises.readFile(inFile,'utf8');
let list;
try{ list = JSON.parse(raw); } catch{ console.error('Invalid JSON'); process.exit(2); }
const now = Date.now();
const backup = `${inFile}.backup.${now}.json`;
await fs.promises.writeFile(backup, JSON.stringify(list,null,2));
console.log('Backup written to', backup);
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
const out = `${inFile}.migrated.json`;
await fs.promises.writeFile(out, JSON.stringify(list,null,2));
console.log(`Migration complete. ${changed} changed / ${list.length} total.`);
console.log('Migrated file written to', out);
process.exit(0);
