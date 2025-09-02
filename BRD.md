<!--
 Combined and normalized from initial BRD draft (brd-01.txt dated 2025-08-31) and incremental feature additions.
-->

# SharkFin Operations Portal – Business Requirements Document (BRD)

## 1. Purpose
Provide a consolidated reference of business, functional, and non-functional requirements for the SharkFin prototype that manages freight inquiries, quotations, rates (including airline rate sheets), tariffs, and related workflows with role-based access and margin governance (ROS thresholds).

## 2. Overview
A React-based (Vite) prototype for logistics commercial operations: capturing inquiries, managing multi-mode rates & tariffs, building quotations, and (future) enabling procurement & approvals. Data is stored in browser localStorage; no backend persistence yet. Focus areas: usability (rapid demo), consistent data model, ROS visibility, and auditability foundation.

### 2.1 Prototype Usage Quick Guide (Demo-Oriented)
Goal: Show end-to-end commercial flow with minimal technical distraction.

Primary Personas & Tasks:
- Sales: Create inquiry → view own pipeline → build quotation → observe ROS auto-approve threshold.
- Pricing: Review all inquiries → (future) respond with rates → maintain airline rate sheets.
- Director: View quotations; (future) approve low ROS deals.

Demo Script (Suggested Order ~6–8 minutes):
1. Login as sales.chan (Sales) – point out menu items limited to workflow screens.
2. Create a new Inquiry (auto owner populated) and filter list by customer to show it appears only for this Sales user.
3. Switch to Quotation Templates (optional) to show predefined additional charges.
4. Open Inquiry Cart → add/select sample rates (illustrate unified columns, Charge Code at right). (If needed skip detailed rate editing.)
5. Generate / open a Quotation (new) – show salesOwner auto-assigned, adjust line sell & margin to manipulate ROS (show color change + auto status when ≥15%).
6. Drop ROS below threshold and trigger Request Approval dialog (UI-only placeholder) to evidence governance concept.
7. Export (if relevant) or just highlight local persistence by refreshing the page—data remains.
8. (Optional) Directly navigate to /airline-rate-entry/:id to show sheet editing (emphasize hidden from menu to reduce clutter for demo). Adjust a break, save, and note derived impact conceptually on Air rates.

Key Talking Points (Usage > Tech):
- Ownership filtering: Sales sees only their own inquiries & quotations (privacy & focus).
- Consistent ROS visual feedback guiding pricing decisions quickly.
- Unified rate model enabling cross-mode comparison without extra clicks.
- Quick quotation composition (lines + additional charges + templates) minimizing manual duplication.
- Prototype-limited elements (approval, notifications, audit) shown as conceptual placeholders—not production.

What NOT to Deep Dive (De‑emphasize):
- Internal data structures, normalization code, localStorage mechanics, detailed component architecture.
- Non-implemented backlog (multi-currency, advanced vendor sourcing) beyond briefly acknowledging future path.

Rapid Role Switch:
After Sales demo, login as pricing.pim to show full visibility (inquiry & quotation lists broaden). Then as director.dan to preview eventual approval governance.

Outcome Emphasis:
User can go from receiving an inquiry to a margin-qualified quotation with clear ROS guidance in a few screens, demonstrating requirement coverage for core commercial flow.

## 3. Scope (MVP)
In scope:
1. Multi-mode Rate Management (Sea FCL, Sea LCL, Air, Transport, Customs).
2. Airline Rate Entry (create/edit with deep-link from Rate Management Air tab).
3. Unified rate model consumed by Inquiry Cart, Inquiry Mgmt, Quotation.
4. Inquiry Cart builder (rate selection & normalization) + Cart Detail.
5. Inquiry Management pipeline & filtering.
6. Quotation Management (lines + additional charges + templates + ROS logic).
7. Tariff Library (master tariffs catalogue) – prototype CRUD & import/export.
8. Quotation Additional-Charge Templates.
9. Role-Based Navigation & client-side data visibility (Sales restrictions).
10. Local notifications (rate update mock) & Audit Trail viewer (prototype).

Out of scope (now / future backlog): Real backend, true multi-user concurrency, production security/auth (current auth is a lightweight demo), vendor sourcing APIs, advanced approval workflow persistence, file attachments, currency FX and multi-currency ROS, performance at large data scales.

## 4. Actors & Roles
| Role | Description | Key Permissions (MVP) |
|------|-------------|------------------------|
| Sales | Frontline commercial user creating inquiries & quotations. | Create/Edit own inquiries & quotations; view/create airline rates; view rate management; limited pricing requests. |
| Pricing | Pricing/procurement analyst. | Full view/edit of all inquiries & quotations; manage all rate sheets & pricing requests. |
| Director | Oversight & approval (future). | Full read; (future) approve low ROS quotations. |
| Vendor | Placeholder for future sourcing portal. | None in MVP. |
| Guest | Not logged in. | Redirected to login. |

## 5. Functional Requirements

### 5.1 Inquiry Management
FR-INQ-001 Create, edit, list customer inquiries.
FR-INQ-002 Inquiry fields: id (auto), customer, sales owner (owner), mode, origin, destination, volume, weight, incoterm, validityTo, customerTargetPrice (formerly rosTarget), notes, creditOk flag, cargoReadyDate, timeFrame (optional), lines[].
FR-INQ-003 Inquiry ID auto-generated; intended future rule ties to user/location (draft content); current implementation uses random prefixed IDs (gap noted).
FR-INQ-004 Pipeline statuses (current implementation constant): Draft → Sourcing → Quoting → Priced → Quoted → Won / Lost. (Quoting state added for quotation-building phase.)
FR-INQ-005 Filtering by customer, mode, owner, status, origin, destination; export filtered set to JSON.
FR-INQ-006 Sales role: New Inquiry form pre-populates owner with logged-in Sales user.
FR-INQ-007 View dialog shows line snapshots if present.
FR-INQ-008 Request Better Rate action (bulk & per-line) available only in Draft status; on submit auto-transition inquiry.status = Sourcing (no navigation away from edit screen).
FR-INQ-009 Need Better Rate per-line button auto-selects the line and opens dialog; disabled if status ≠ Draft.
FR-INQ-010 Rate ID column hidden in Inquiry Edit lines table (UI simplification); status column added per line.

### 5.2 Inquiry Cart / Cart Detail
FR-CART-001 Select/compose rates (all modes) into a cart for inquiry/quotation building.
FR-CART-002 Normalization: All selected rates mapped to unified line model (mode-agnostic fields).
FR-CART-003 Charge Code column placed at rightmost (UI alignment rule UI-004).
FR-CART-004 Airfreight normalization aligned with Airline Rate Entry model.
FR-CART-005 Persist cart contents in localStorage and restore on reload.
FR-CART-006 Inline editable Sell & Margin per cart line with ROS recalculation.
FR-CART-007 Auto-approve visual indicator when line ROS ≥ settings.autoApproveMin.
FR-CART-008 ROS Bands legend driven by configurable settings.rosBands.
FR-CART-009 Helper buttons: (T) set Sell to achieve auto-approve ROS with current Margin; (A) set Margin to reach threshold with current Sell; (R) reset line to original values.
FR-CART-010 Track original sell/margin snapshot (_origSell/_origMargin) for reset behavior.
FR-CART-011 (UI Simplification – Sales) Hide Cost and ROS columns in Inquiry Cart matched rates table (show only selling-facing figures) and hide Rate # column when cart is used for inquiry building.
### 5.11 Pricing Requests (Rate Improvement)
FR-PRREQ-001 Generate per-line Rate Improvement Requests from an Inquiry (Need Better Rate) – one request per selected line.
FR-PRREQ-002 Request ID format: REQ-YYMM-#### (sequential per month, zero-padded to 4 digits).
FR-PRREQ-003 Captured fields: id, type, inquiryId, customer, owner (inquiry owner at creation), status, createdAt, urgency, remarks, customerTargetPrice (rosTarget legacy), inquirySnapshot (origin, destination, notes, customerTargetPrice), totals (sell, margin, ros), lines[{ id, origin, destination, basis/containerType, vendor (or procuredVendor), carrier, qty, sell, margin, ros }].
FR-PRREQ-004 Status tabs (inbox): NEW → RFQ SENT → QUOTES IN → PRICED → REPLIED (see §17.1 for transitions).
FR-PRREQ-005 Sales visibility restriction: Sales users only see requests where request.owner === logged-in sales username (Pricing sees all; Vendors see only RFQ-related data per existing vendor isolation rules).
FR-PRREQ-006 On Request creation, associated Inquiry auto-updated: status=Sourcing and stored customerTargetPrice if provided.
FR-PRREQ-007 Pricing can manage RFQ cycle (select vendors, send RFQ, import quotes, save progress, mark priced, publish to Sales) producing rate version history back into Inquiry.
FR-PRREQ-008 Request submission does not redirect away from Inquiry Edit (remain in context).
FR-PRREQ-009 UI hides internal Rate IDs within Inquiry Edit; versioning tracked in background when pricing publishes improvements.


### 5.3 Rate Management (Multi-Mode)
FR-RATE-001 Maintain rate tables for Sea FCL, Sea LCL, Air, Transport, Customs.
FR-RATE-002 Unified column ordering; Charge Code rightmost (UI-004).
FR-RATE-003 Air tab Edit action deep-links to Airline Rate Entry screen with selected rate.
FR-RATE-004 Air tab Add action navigates directly to blank Airline Rate Entry form (no inline dialog).
FR-RATE-005 (Draft/backlog) Import/export (CSV/JSON) – partially documented in earlier draft; not implemented yet.
FR-RATE-006 Core data fields (per original draft + alignment): port pair (origin/destination), service, contract service, vendor, carrier, cost, at-cost flag, rate (sell), currency, equipment/containerType or unit/basis, validity, notes, chargeCode. (Implemented subset: origin, destination, vendor, carrier, buy/sell/margin, currency, chargeCode, validity, containerType/basis.)

### 5.4 Airline Rate Entry
FR-AIR-001 Create & edit airline rate sheets (supports param ID load).
FR-AIR-002 Persist changes to unified Air rate dataset consumed by Rate Management & Inquiry Cart.
FR-AIR-003 Shares unified rate model (fields: id, carrier, vendor, origin, destination, chargeCode, currency, buy, sell, margin, validityFrom/To, unit/container basis, notes optional).

### 5.5 Tariff Library
FR-TAR-001 CRUD & duplicate tariffs; import/export JSON (prototype seed reload manual).
FR-TAR-002 Tariff fields (as draft): code, name, category (Origin/Destination/Freight/Optional), mode, unit, currency, rate, vendor, cost, at-cost flag, country, port, equipment, VAT %, validity dates, active status, notes.
FR-TAR-003 Unified table with filters/search.
(Implementation note: Some draft fields may be placeholders until UI built; status tracked in backlog.)

### 5.6 Quotation Management
FR-QUOTE-001 Create, edit, list quotations.
FR-QUOTE-002 Header fields: id, inquiryId (optional), customer, salesOwner, mode, incoterm, currency, validity (from/to), notes, status.
FR-QUOTE-003 Lines: rateId, vendor, carrier, origin, destination, unit/containerType/basis, qty, sell, discount, margin, computed ROS line%.
FR-QUOTE-004 Additional charges: name, basis (Per Shipment/Container/Unit), qty, sell, margin, notes.
FR-QUOTE-005 ROS calculation and color thresholds: ≥20% success, 12–19.99% warning, <12% error.
FR-QUOTE-006 Auto status rule: If total ROS ≥15% → status=approve on save; else remain draft unless approval path invoked.
FR-QUOTE-007 "Request Approval" button visible when ROS <15% (Director approval future workflow stub).
FR-QUOTE-008 New quotation auto assigns salesOwner when user is Sales.
FR-QUOTE-009 Lines & charges aggregated into totals object (sell, margin, ros).

### 5.7 Quotation Templates (Additional Charges)
FR-TPL-001 Store reusable sets of additional charges.
FR-TPL-002 Apply mode: replace or append.
FR-TPL-003 Provide feedback (snackbar) after applying.

### 5.8 Notifications (Prototype)
FR-NOTIF-001 Local (localStorage) notification list filtered for current user (display or id) & unread.
FR-NOTIF-002 Badge count on header; mark all read action.

### 5.9 Audit Trail (Prototype)
FR-AUDIT-001 Viewer accessible from top bar.
FR-AUDIT-002 (Future) Log create/update actions for inquiries, quotations, rates; current implementation placeholder (partial coverage to be expanded).

### 5.10 Navigation & UI
FR-UI-001 Responsive layout (drawer + main content) using MUI.
FR-UI-002 Menu ordering: Core workflow first; Rate Management near bottom; Tariff Library last.
FR-UI-003 Role-based conditional menu entries (Pricing Requests, Approvals, Airline Rate Entry).
FR-UI-004 Charge Code column positioned at rightmost across relevant tables (Rate, Inquiry Cart, etc.).
FR-UI-005 Sorting buttons in Inquiry list (customer, origin, destination).

## 6. Business Logic & Rules
BL-001 ROS (Return on Sales) threshold gates approval state (≥15%).
BL-002 Sales visibility restriction: Sales can only see their own inquiries & quotations (owner matching username or display) (RBAC-007) AND only their own pricing requests (request.owner match) (FR-PRREQ-005).
BL-003 Inquiry and Quotation IDs unique; future format tie to user/location (not yet implemented – backlog BL-004).
BL-004 (Backlog) Structured numbering scheme per location (e.g., BKK-YYYYMM-####) replacing random IDs.
BL-005 Rate normalization ensures consistent downstream consumption (lines & cart).
BL-006 Discount subtracts from both sell and margin for ROS calculations.
BL-007 Request ID numbering scheme implemented (REQ-YYMM-#### sequential per month) – replaces earlier ad-hoc IDs for rate improvement requests.
BL-008 Auto transition: Inquiry status set to Sourcing upon submitting any Rate Improvement Request (FR-INQ-008 / FR-PRREQ-006).
BL-009 Customer Target Price (formerly rosTarget) stored distinct from ROS%; displayed without % symbol; persisted on inquiry when provided in request dialog.
BL-010 Rate ID standardization (RID-* mapping) partially implemented in normalization layer (cart) — full cross-module standardization remains backlog.

## 7. Access Control (RBAC)
Client-side enforcement only (prototype). Route guard + in-component data filtering.

| Resource / View | Sales | Pricing | Director | Notes |
|-----------------|:-----:|:-------:|:--------:|-------|
| Rate Management | R | R/W | R | Sales currently allowed edit Air via Airline Rate Entry. |
| Airline Rate Entry | R/W | R/W | R/W | |
| Inquiry Management (list) | Own only | All | All | Owner filter enforced in-memory. |
| Inquiry Detail/Edit | Own only | All | All | |
| Quotations (list) | Own only | All | All | salesOwner filter. |
| Quotation Edit | Own only | All | All | Auto-assign owner for Sales. |
| Pricing Requests Inbox | R | R/W | (Future) | |
| Tariff Library | R | R | R | Prototype. |
| Audit Trail Viewer | R | R | R | Placeholder implementation. |

Legend: R = Read, W = Write.

RBAC-007 (Implemented): Sales users MUST only see inquiries & quotations they own.

## 8. Data Model Overview
### 8.1 Rate (Unified)
id, mode, vendor, carrier, origin, destination, chargeCode, containerType / basis / unit, currency, buy, sell, margin, validityFrom, validityTo, notes (optional), service (future), contractService (future), cost/atCostFlag (future backlog alignment with draft fields).

### 8.2 Inquiry
id, customer, owner, mode, origin, destination, volume, weight, incoterm, validityTo, status, customerTargetPrice, notes, creditOk, cargoReadyDate, timeFrame, lines? (snapshot lines referencing rate fields at capture time).
### 8.5 Pricing Request (Rate Improvement)
id, type ('rateImprovementRequest'), inquiryId, customer, owner, status (NEW/RFQ SENT/QUOTES IN/PRICED/REPLIED), createdAt, urgency, remarks, customerTargetPrice, inquirySnapshot{ origin, destination, notes, customerTargetPrice }, totals{ sell, margin, ros }, lines[{ id (rateId at time of request), origin, destination, basis/containerType, vendor, carrier, qty, sell, margin, ros, chosenVendor?, chosenPrice?, vendorQuotes? }], rfq{ vendors[], sentAt }, pricedSnapshot[], history (implicit in line.vendorQuotes history arrays).

### 8.3 Quotation
id, inquiryId?, customer, salesOwner, mode, incoterm, currency, validFrom, validTo, status, lines[], charges[], totals{ sell, margin, ros }, notes.

### 8.4 Tariff (Planned / Partial)
code, name, category, mode, unit, currency, rate, vendor, cost, atCostFlag, country, port, equipment, vatPercent, validityFrom, validityTo, active, notes.

## 9. Calculations (ROS & Financial)
- Line Effective Sell = sell - discount.
- Line Effective Margin = margin - discount.
- Line ROS% = Effective Margin / Effective Sell (if >0).
- Quotation Sell = Σ((line eff sell * qty)) + Σ(charges.sell * qty).
- Quotation Margin = Σ((line eff margin * qty)) + Σ(charges.margin * qty).
- Quotation ROS% = Total Margin / Total Sell.
- Color thresholds: success ≥20%, warning 12–19.99%, error <12%.

## 10. Non-Functional Requirements (Prototype Level)
NFR-001 Persistence: localStorage only; clearing storage resets dataset.
NFR-002 Performance: Instant client operations for small datasets (<5k rows anticipated). No pagination yet.
NFR-003 UX: Minimal clicks to build inquiry & quotation; consistent column ordering.
NFR-004 Technology: React 19, Vite, MUI, react-router-dom; (draft mention of recharts reserved for future visualization – not yet integrated).
NFR-005 Extensibility: Modular components to allow backend substitution later.
NFR-006 Security: Demo-only; client-side role assumption (no server validation).

## 11. Assumptions
AS-001 Single-user per browser session; no real-time multi-user sync.
AS-002 Random IDs acceptable until numbering scheme implemented.
AS-003 User roles derived from username prefix (sales./pricing./director.).
AS-004 Local time zone acceptable for date display (no UTC normalization yet).

## 12. Status Summary
| Requirement | Key ID | Status | Notes |
|-------------|--------|--------|-------|
| Airline rate deep-link edit | REQ-RATE-002 | Implemented | Air tab → entry screen. |
| Air Add navigates to entry page | REQ-RATE-003 | Implemented | Replaces inline dialog. |
| Unified rate data model | REQ-DATA-001 | Implemented | Normalization across modules. |
| Inquiry owner auto for Sales | REQ-INQ-005 | Implemented | Prefilled in dialog. |
| Sales visibility restriction (inquiries) | RBAC-007 | Implemented | Filter in list. |
| Sales visibility restriction (quotations) | RBAC-007 | Implemented | Filter in list. |
| Charge Code rightmost in tables | UI-004 | Implemented | Rate & cart tables. |
| Quotation ROS auto status threshold | REQ-QUOTE-006 | Implemented | ≥15% approve. |
| Request Approval button for low ROS | REQ-QUOTE-007 | Implemented | Dialog placeholder. |
| Auto-assign salesOwner (new quotation) | REQ-QUOTE-008 | Implemented | Creation logic updated. |
| Tariff extended field set | FR-TAR-002 | Partial | Some fields pending UI. |
| Inquiry ID location-based format | BL-004 | Backlog | Current random ID. |
| Rate import/export | FR-RATE-005 | Backlog | Not yet built. |
| Cost / at-cost flag in rate model | FR-RATE-006 | Backlog | Fields not persisted yet. |
| Full audit logging persistence | FR-AUDIT-002 | Backlog | Viewer stub only. |
| Director approval workflow | Future | Backlog | ROS gating only now. |

## 13. Future Enhancements (Backlog)
FE-001 Server-side authentication (SSO/JWT) & authorization service.
FE-002 Concurrency & optimistic locking / versioning.
FE-003 Vendor portal & automated RFQ sourcing API integration.
FE-004 Advanced approval workflow with audit & escalation.
FE-005 Rate & tariff versioning, effective dating & supersession.
FE-006 Currency conversion engine (FX rates) & multi-currency ROS.
FE-007 Attachment handling (documents, PDFs, rate sheets).
FE-008 Pagination & virtualized tables for large datasets.
FE-009 Analytics dashboards (recharts integration) for win rates & margin trends.
FE-010 Export/Import (CSV/XLSX) for rates, inquiries, quotations.
FE-011 Structured ID generator per entity (configurable patterns).

## 14. Glossary
ROS: Return on Sales (Margin / Sell * 100%).
Customer Target Price: Numeric target price provided by customer (currency amount, not a %). Former label rosTarget; no longer shown with '%' symbol.
RBAC: Role-Based Access Control.
Inquiry: Customer request initiating pricing workflow.
Quotation: Commercial offer built from selected rates & charges.
At-Cost Flag: Indicator a cost is passed through without margin uplift.

## 15. Revision History
| Date | Version | Author | Summary |
|------|---------|--------|---------|
| 2025-08-31 | Draft 0.1 | Prototype Team | Initial BRD draft (brd-01.txt). |
| 2025-09-01 | 0.2 | Prototype Team | Added airline rate integration, RBAC, ROS logic refinements. |
| 2025-09-01 | 0.3 | Prototype Team | Merged draft with implemented RBAC filtering & structured sections. |
| 2025-09-01 | 0.4 | Prototype Team | Added User View & Prototype Disclaimer section. |
| 2025-09-01 | 0.5 | Prototype Team | Added cart persistence, inline sell/margin editing, ROS bands legend, auto-approve helper buttons & reset, updated requirements FR-CART-005..010. |

---
Document Owner: Product / Ops (prototype)
Last Updated: 2025-09-03

## 16. User View & Prototype Disclaimer
Purpose: Clarify that current implementation is a demonstration prototype to evidence requirement coverage, not a production-ready system.

### 16.1 What End Users Can Do Now
* Sales User:
	- Create inquiries (owner auto-filled) and view ONLY own inquiries & quotations.
	- Build quotations (auto salesOwner) and view ROS & status auto-approval logic; create revisions.
	- Browse multi‑mode rates (read) and, if routed, view airline rate sheets.
* Pricing User:
	- Full Pricing Request lifecycle: NEW → RFQ SENT → QUOTES IN → PRICED → REPLIED.
	- Send RFQ (select vendors), import / ingest vendor quotes, Save Progress, Mark Priced (snapshot), Publish to Sales (rate version creation + notification).
	- Maintain airline rate sheets & all rates.
* Director:
	- Observe all data; adjust Settings (ROS bands, guardrails, auto-approve threshold) – if settings page included.
	- Future approval workflow (placeholder only).
* Vendor:
	- View only RFQs involving their carrier (tabs by status) and only their own vendorQuotes per line.
	- Accept RFQ, Upload file with quotes (CSV), Close (after upload) marking vendor completion.
	- Trigger auto-creation / update of a vendor-specific Quotation record for internal reference upon upload.

### 16.2 Demonstrated Requirement Coverage
- RBAC filtering for Sales visibility (inquiries, quotations) implemented.
- Unified rate → inquiry cart → pricing request → quotation data flow established.
-- Vendor RFQ workflow separated: vendor cannot see competing vendor data or internal selling/margin.
-- Pricing can persist iterative quote selection via Save Progress (draft) and freeze a pricedSnapshot via Mark Priced.
-- Uploading vendor quotes updates Pricing Request state and auto-creates a quotation record for traceability.
- ROS computation + threshold-based status change (approve vs draft) visible to user.
- Airline rate sheet create/edit and derivation into simplified Air rate list powering downstream views.
- Column ordering and UI consistency (Charge Code placement) visible across tables.

### 16.3 Intentional Prototype Limitations
- Persistence: Browser localStorage only; clearing storage erases data.
- Security: No real authentication, authorization enforcement is client-side & bypassable.
- Data Integrity: Minimal validation (e.g., IDs random, no collision prevention, dates not range-validated extensively).
- Concurrency: No multi-user conflict handling; last write wins locally.
- Auditing: Viewer placeholder; not all events captured; no tamper resistance.
- Performance: Not tuned for large datasets (> a few thousand rows) or pagination.
- Import/Export: Limited to JSON export for airline sheet; other import/export flows are backlog.
- Workflow Gaps: Director approval does not persist or change state beyond UI feedback; vendor close action does not enforce completeness across all lines; no SLA timers.
- Numbering: No location-based structured ID scheme yet (random IDs used).

### 16.4 Items Shown As UI Controls But Not Production-Complete
- Approval request dialog (no backend route or audit persistence).
- Notifications (local ephemeral list; not role-secure or push-based).
- Tariff extended attributes (some fields not persisted or enforced).

### 16.5 Guidance For Reviewers
When evaluating requirement coverage, focus on:
1. Presence of feature pathway (navigation + basic data flow).
2. Data model alignment (fields propagate through modules consistently).
3. Role-based visibility behavior for Sales vs non-Sales.
4. ROS logic & Pricing Request status transitions (including persistence after refresh).
5. Vendor isolation (navigation + filtered quotes + rate management scoping).

---
## 17. New Sections (Sept 02 Additions)
### 17.1 Pricing Request Status Logic (Implemented)
| Transition | Trigger | Persistence Artifacts |
|------------|---------|-----------------------|
| NEW → RFQ SENT | Send RFQ (vendors selected) | request.status, rfq.vendors, rfq.sentAt |
| RFQ SENT → QUOTES IN | First vendor quote upload or manual import | status update, vendorQuotes merged into lines |
| QUOTES IN → PRICED | Mark Priced (at least one selection) | pricedAt, pricedBy, pricedSnapshot[], persisted vendorQuotes & selections |
| (QUOTES IN or PRICED) → REPLIED | Publish to Sales | Rate versions created in linked Inquiry; notification generated |

### 17.2 Mark Priced Snapshot
Stores: selectedVendors, chosenVendor, chosenPrice, proposedSell, vendorQuotes per line to pricedSnapshot[] enabling future compare / revert (revert not yet implemented).

### 17.3 Save Progress
Captures working vendorQuotes & selections without changing status; timestamp draftSavedAt; reload reconstructs quoteRows from persisted line data (no synthetic regeneration).

### 17.4 Vendor Upload → Quotation Auto-Creation
Upon CSV upload on Vendor Landing: creates/updates quotation with id pattern Q-{requestId}-{VENDOR}, mapping vendorQuotes into quotation lines (sell = vendor provided sell or price). Activity log entries 'import' / 'update' appended.

### 17.5 Data Persistence Enhancements
* Pricing Request line preserves: vendorQuotes[], selectedVendors[], chosenVendor, chosenPrice, proposedSell, note, history.
* Reopen logic reads persisted vendorQuotes instead of synthesizing mock quotes (ensures Sell values survive reload & after Mark Priced).

### 17.6 Vendor Isolation Rules
* Navigation trimmed to Vendor RFQs + Rate Management (filtered to carrierLink).
* In Pricing Request detail (vendor route) only that vendor's quote visible; no sell columns or selection controls.

### 17.7 Settings Influence
* ROS bands & guardrails annotate quotation lines (chip + background) and not block saving.
* autoApproveMin sets quotation status=approve on save if ROS >= threshold.

---
## 18. Updated Revision History (Addendum)
| Date | Version | Changes |
|------|---------|---------|
| 2025-09-02 | 0.6 | Added Pricing Request lifecycle, Vendor Landing, Save Progress, Mark Priced snapshot, vendor quotation auto-create, persistence fixes, vendor navigation restrictions. |
| 2025-09-02 | 0.7 | Added Better Rate Request workflow (per-line + bulk), auto inquiry status transition to Sourcing, Request ID format REQ-YYMM-####, Customer Target Price terminology (replacing rosTarget), hidden rateId/cost/ROS columns in relevant Inquiry & Cart views for Sales, Sales visibility restriction extended to pricing requests, stay-on-page post submission. |
| 2025-09-03 | 0.8 | Added managedRates canonical store + real-time event sync, unified rate source across Inquiry Cart & Rate Management, booking count tracking & display, Pricing Request SLA KPI (3-day) tracking & overdue flag, vendor quote list gating (hidden until RFQ Sent), persistent selected vendors filtering with original vendor always included, default containerType fallback (40HC), settings-driven ROS gating refactor, Pricing inline Buy/Sell edit enablement in requests, vendor quote filtering & persistence improvements. |


## 19. Sept 03 Additions

### 19.1 Unified Rate Source & Real-Time Sync
FR-RATE-007 A single canonical managedRates store (localStorage key) serves Rate Management, Inquiry Cart, and related components.
FR-RATE-008 Dispatch custom event 'managedRatesUpdated' (and utilize 'storage' event) on any rate CRUD to propagate updates without page reload.
BL-014 Event-driven synchronization ensures Inquiry Cart & other consumers rehydrate from managedRates on update (no duplicated normalization state).
NFR-007 Front-end event bus pattern (CustomEvent) adopted for lightweight real-time sync (single‑tab and multi‑tab via storage event).

### 19.2 Booking Count Tracking
FR-BOOK-001 System computes bookingCount per rate based on related bookings referencing a rateId.
FR-BOOK-002 Display bookingCount column in Inquiry Cart, Rate Management, and Quotation List where relevant (read-only).
FR-BOOK-003 Persist booking linkage (relatedBookings array or equivalent) and update counts when bookings created/removed.
BL-015 Booking count recalculated on 'bookingsUpdated' or 'managedRatesUpdated'.

### 19.3 Pricing Request SLA & KPI
FR-PRREQ-010 Track turnaround KPI: NEW to REPLIED target ≤3 calendar days (SLA 3-day).
BL-011 SLA fields: createdAt, repliedAt, turnaroundDays (float), slaMet (boolean), overdue (boolean when >3 days and status < REPLIED).
FR-PRREQ-011 Visual indicators (e.g., chip/color) for overdue requests in inbox list (implementation note: color coding applied in component logic).

### 19.4 Vendor Quote List Gating & Persistence Enhancements
FR-PRREQ-011 (Renumbered internally to avoid clash; prior FR-PRREQ-011 becomes FR-PRREQ-016) Hide vendor quote table until RFQ Sent (status ≥ 'RFQ SENT').
FR-PRREQ-012 Persist selected vendors at Send RFQ; subsequent loads filter vendorQuotes display to this subset.
FR-PRREQ-013 Always include original/base vendor in vendor quote list even if not selected during RFQ vendor selection.
FR-PRREQ-014 After RFQ Sent, vendor quote ingestion restricted to selected vendors plus original vendor (validation/backlog for enforcement).
FR-PRREQ-015 Vendor quote table dynamically filters to selectedVendors to prevent leakage of non-invited vendor data.
FR-PRREQ-016 (Former) Save Progress behavior unchanged; numbering shifted to accommodate new gating requirement.
BL-016 Vendor isolation updated: pre-RFQ no quotes visible; post-RFQ only invited vendors + original vendor.

### 19.5 Inline Pricing Edits & ROS Gating
FR-PRREQ-017 Pricing role can directly edit Buy (cost) and Sell fields for request lines once quotes are in (status ≥ QUOTES IN) to model scenario pricing.
BL-013 ROS gating now references settings context (rosTargetByMode / autoApproveMin) rather than customerTargetPrice.
FR-PRREQ-018 Default containerType fallback set to '40HC' when inbound data lacks equipment value (replacing prior generic fallback 'GEN').
BL-012 Container type standardization ensures consistent equipment basis for FCL comparisons.

### 19.6 Data Model Adjustments
DM-019 Added derived fields to Pricing Request: turnaroundDays, slaMet, overdue (non-persistent or recomputed on load as optimization allowed).
DM-020 managedRates persists unified rate objects with consistent IDs and bookingCount (computed, not permanently stored, to avoid stale counts).

### 19.7 Non-Functional Updates
NFR-008 Event-based refresh avoids redundant polling; complexity kept minimal (no external libraries).
NFR-009 SLA computation lightweight (O(n) over requests) executed on inbox render; acceptable for prototype scale (<1k requests).

### 19.8 Backlog Additions (New)
FE-012 SLA dashboard & aging buckets (0-1d, 1-2d, 2-3d, >3d) with trend chart.
FE-013 Vendor selection audit log & change history.
FE-014 Rate change provenance (which user edited Buy/Sell) with diff snapshots.
FE-015 Multi-leg rate aggregation (future consolidation for door-door offers).

### 19.9 Updated Requirement Cross-References
Previous requirement IDs retained; new IDs (FR-RATE-007..FR-RATE-008, FR-BOOK-001..003, FR-PRREQ-010..018) appended without altering earlier numbering to preserve traceability.

## 20. Summary of Sept 03 Changes
Implemented real-time synchronization of unified rate data; introduced booking utilization visibility; enforced KPI tracking for Pricing responsiveness; tightened vendor quote lifecycle security (visibility gating + selection persistence + original vendor inclusion); empowered Pricing with inline economic adjustments; standardized container equipment fallback; and decoupled ROS gating from customer-provided target price by routing through settings-managed thresholds.

Stability, security, scalability, and compliance concerns are explicitly deferred to a future implementation phase.
