import { QUOTATION_DEFAULT_STATUS } from './inquiry-statuses';
import { loadQuotations, saveQuotations, generateQuotationId } from './sales-docs';

export function seedCustomerDemoQuotation({ customerCode, customerName }){
  try{
    const code = String(customerCode||'').toUpperCase();
    const name = customerName || customerCode || 'Customer';
    if(!code) return loadQuotations();

    // Prevent duplicate seeding for this customer
    const seededKey = `seededQuotation:${code}`;
    if(localStorage.getItem(seededKey)==='1') return loadQuotations();

    const qs = loadQuotations();
    const hasForCustomer = qs.some(q=> {
      const c = (q.customer||q.customerName||q.customerCode||'').toString().toUpperCase();
      return c.includes(code) || c.includes(name.toString().toUpperCase());
    });
    if(hasForCustomer) { localStorage.setItem(seededKey,'1'); return qs; }

    const now = new Date();
    const validFrom = now.toISOString().slice(0,10);
    const validTo = new Date(now.getFullYear(), now.getMonth()+2, 0).toISOString().slice(0,10);
    const id = generateQuotationId(now);
    const quotation = {
      id,
      status: QUOTATION_DEFAULT_STATUS,
      version: 1,
      parentId: null,
      salesOwner: 'Demo Sales',
      customer: name,
      customerCode: code,
      mode: 'Sea LCL',
      incoterm: 'FOB',
      currency: 'USD',
      validFrom,
      validTo,
      lines: [{
        rateId: 'R-DEMO-HKG-LAX',
        vendor: 'Evergreen',
        carrier: 'Evergreen',
        origin: 'HKG',
        destination: 'LAX',
        unit: 'CBM',
        qty: 18,
        sell: 70,
        margin: 10
      }],
      charges: [{ id:'C-DEMO-DOC', name:'Documentation', basis:'Per Shipment', qty:1, sell:45, margin:25 }],
      tariffs: [],
      activity: [{ ts: Date.now(), user: 'system', action: 'seed', note:`Seeded demo quotation for ${code}` }]
    };
    const next = [quotation, ...qs];
    saveQuotations(next);
    localStorage.setItem(seededKey,'1');
    try{ window.dispatchEvent(new Event('storage')); }catch{/* ignore */}
    return next;
  }catch{
    return loadQuotations();
  }
}
