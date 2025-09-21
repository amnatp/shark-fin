// Vendor / RFQ canonical statuses and helpers
export const VENDOR_STATUSES = [
  'NEW',
  'RFQ SENT',
  'QUOTES IN',
  'PRICED',
  'REPLIED'
];

export const VENDOR_STATUS_COLOR = {
  'NEW': 'default',
  'RFQ SENT': 'info',
  'QUOTES IN': 'primary',
  'PRICED': 'warning',
  'REPLIED': 'success'
};

// Named constants for convenience
export const VENDOR_STATUS = {
  NEW: 'NEW',
  RFQ_SENT: 'RFQ SENT',
  QUOTES_IN: 'QUOTES IN',
  PRICED: 'PRICED',
  REPLIED: 'REPLIED'
};

// Defensive mapping of common legacy variants to canonical values
const _MAP = {
  'NEW':'NEW',
  'RFQ SENT':'RFQ SENT','RFQ_SENT':'RFQ SENT','RFQ':'RFQ SENT',
  'QUOTES IN':'QUOTES IN','QUOTES_IN':'QUOTES IN','QUOTE IN':'QUOTES IN','QUOTE_IN':'QUOTES IN','quote in':'QUOTES IN','quotes in':'QUOTES IN',
  'PRICED':'PRICED','priced':'PRICED',
  'REPLIED':'REPLIED','replied':'REPLIED'
};

export function canonicalVendorStatus(s){ if(!s) return 'NEW'; if(_MAP[s]) return _MAP[s]; const up = String(s).toUpperCase(); return _MAP[up] || up; }
