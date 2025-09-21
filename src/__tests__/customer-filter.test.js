import { describe, it, expect } from 'vitest';

// Recreate the matching logic used in src/customer-quotation-list.jsx
function normalize(s){ return (s||'').toLowerCase().replace(/[^a-z0-9]/g,''); }
function tokenize(s){ return (s||'').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean); }

function matchesAllowedForRow(r, allowed){
  const custRaw = (r.customer && String(r.customer).trim()) || (r.inquirySnapshot && r.inquirySnapshot.customer) || r.customerName || r.customerCode || '';
  const cust = String(custRaw).toLowerCase();
  const custNorm = normalize(cust);
  const custTokens = tokenize(custRaw);
  return allowed.some(a => {
    if(!a) return false;
    const allow = String(a).toLowerCase();
    const allowNorm = normalize(allow);
    const allowTokens = tokenize(allow);
    if(allow === cust) return true;
    if(allowTokens.some(at => custTokens.includes(at))) return true;
    if(allowNorm && custNorm && custNorm.includes(allowNorm)) return true;
    if((cust).includes(allow)) return true;
    return false;
  });
}

describe('customer matching logic', ()=>{
  it('matches exact customer field', ()=>{
    const row = { id:'Q1', customer: 'CUSTA' };
    expect(matchesAllowedForRow(row, ['custa'])).toBe(true);
  });

  it('matches token-level entry in customerName', ()=>{
    const row = { id:'Q2', customerName: 'ACE Logistics CUSTA' };
    expect(matchesAllowedForRow(row, ['ace'])).toBe(true);
    expect(matchesAllowedForRow(row, ['custa'])).toBe(true);
  });

  it('matches inquirySnapshot.customer fallback', ()=>{
    const row = { id:'Q3', inquirySnapshot: { customer: 'ACE Logistics' } };
    expect(matchesAllowedForRow(row, ['ace'])).toBe(true);
    expect(matchesAllowedForRow(row, ['customer.ace'])).toBe(true);
  });

  it('matches normalized customerCode with punctuation', ()=>{
    const row = { id:'Q4', customerCode: 'CUSTA/001' };
    expect(matchesAllowedForRow(row, ['custa'])).toBe(true);
  });

  it('does not match unrelated customer', ()=>{
    const row = { id:'Q5', customer: 'OTHER' };
    expect(matchesAllowedForRow(row, ['custa'])).toBe(false);
  });

  it('handles empty customer gracefully', ()=>{
    const row = { id:'Q6' };
    expect(matchesAllowedForRow(row, ['custa'])).toBe(false);
  });
});
