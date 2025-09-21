// Canonical inquiry statuses and helpers
export const INQUIRY_STATUSES = [
  'Draft',
  'Sourcing',
  'Quoting',
  'Priced',
  'Quoted',
  'Submitted',
  'Won',
  'Lost'
];

export const NORMALIZED_STAGES = ['draft','sourcing','priced','quoted','won','lost'];

export function normalizeStageForInquiry(s){
  if(!s) return 'draft';
  const t = String(s).toLowerCase();
  if(['quote','quoting','quoted','submit','submitted','sent','quoting'].includes(t)) return 'quoted';
  if(['draft','sourcing','priced','won','lost'].includes(t)) return t;
  return 'draft';
}

// Helper to expose a UI-friendly list (keeps legacy capitalization)
export function inquiryStatusOptions(){ return INQUIRY_STATUSES.slice(); }

// Map an inquiry status string (any case) to normalized stage
export function stageFromStatus(status){ return normalizeStageForInquiry(status); }

// Backwards-compatible alias: some files import `normalizeStage`
export const normalizeStage = normalizeStageForInquiry;

// Quotation defaults (kept here for small shared constants)
export const QUOTATION_DEFAULT_STATUS = 'draft';

// Quotation workflow constants (kept here for reuse)
export const QUOTATION_STATUS_SUBMIT = 'submit';
export const QUOTATION_STATUS_APPROVE = 'approve';
export const QUOTATION_STATUS_REJECT = 'reject';

export const QUOTATION_STATUS_FLOW = {
  draft: [QUOTATION_STATUS_SUBMIT, QUOTATION_STATUS_APPROVE],
  submit: [QUOTATION_STATUS_APPROVE, QUOTATION_STATUS_REJECT],
  approve: [],
  reject: []
};

// Approval / workflow helper constants used by procurement flows
export const APPROVAL_STATUS_NONE = 'none';
export const APPROVAL_STATUS_PENDING = 'pending';
export const APPROVAL_STATUS_AWAITING = 'AWAITING';
export const APPROVAL_STATUS_APPROVED = 'APPROVED';
export const APPROVAL_STATUS_REJECTED = 'REJECTED';
// Explicit draft state used by some procurement screens
export const APPROVAL_STATUS_DRAFT = 'DRAFT';

// Named inquiry status constants for easier reuse
export const INQUIRY_STATUS_DRAFT = INQUIRY_STATUSES[0];
export const INQUIRY_STATUS_SOURCING = INQUIRY_STATUSES[1];
export const INQUIRY_STATUS_QUOTING = INQUIRY_STATUSES[2];
export const INQUIRY_STATUS_PRICED = INQUIRY_STATUSES[3];
export const INQUIRY_STATUS_QUOTED = INQUIRY_STATUSES[4];
export const INQUIRY_STATUS_SUBMITTED = INQUIRY_STATUSES[5];
export const INQUIRY_STATUS_WON = INQUIRY_STATUSES[6];
export const INQUIRY_STATUS_LOST = INQUIRY_STATUSES[7];
