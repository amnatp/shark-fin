<!--
 Combined and normalized from initial BRD draft (brd-01.txt dated 2025-08-31) and incremental feature additions.
-->

# SharkFin – Freight Sales Platform – Business Requirements Document (BRD)

## 1. Purpose
Provide a consolidated reference of business, functional, and non-functional requirements for the SharkFin prototype that manages freight inquiries, quotations, rates (including airline rate sheets), tariffs, and related workflows with role-based access and margin governance (ROS thresholds).

## 2. Overview
A React-based (Vite) prototype for logistics commercial operations: capturing inquiries, managing multi-mode rates & tariffs, building quotations, and (future) enabling procurement & approvals. Data is stored in browser localStorage; no backend persistence yet. Focus areas: usability (rapid demo), consistent data model, ROS visibility, and auditability foundation.

### 2.1 Prototype Usage Quick Guide (Demo-Oriented)
For a concise, step-by-step demo script and a short QA checklist intended for a ~6–8 minute live demo, see `DEMO.md` in the repository root. That document contains a tested walkthrough, persona-specific talking points, verification steps, and quick troubleshooting notes useful for presenters and reviewers.

## 3. Scope (MVP)
In scope:
1. Multi-mode Rate Management (Sea FCL, Sea LCL, Air, Transport, Customs).
2. Airline Rate Entry (create/edit with deep-link from Rate Management Air tab).
3. Unified rate model consumed by Inquiry Cart, Inquiry Mgmt, Quotation.
4. Inquiry Cart builder (rate selection & normalization) + Cart Detail.
5. Inquiry Management pipeline & filtering.
6. Quotation Management (lines + additional charges + templates + ROS logic).
7. Tariff Library (master tariffs catalogue) – prototype CRUD & import/export.
8. Tariff Surcharges (Carrier-linked) – maintain carrier-specific surcharges separate from local charges; pattern-based tradelane support.
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

### 5.5.1 Tariff Surcharges (Carrier-linked)
FR-SUR-001 Maintain a list of surcharges that are explicitly linked to a carrier; generic fees belong in Tariff Library (Local Charges), not here.
FR-SUR-002 Required fields: id, carrier (specific; no 'ALL'), charge, basis, currency, amount, active; optional: tradelane pattern (supports ORG/DST with '*' wildcard on either side) and equipment ('ALL' allowed), notes.
FR-SUR-003 Matching logic: a surcharge applies to a rate row only when carrier matches exactly AND tradelane pattern (e.g., ALL/US*, THBKK → USLAX, THLCH/ALL) and equipment match.
FR-SUR-004 UI label uses the term “Tariff Surcharge (Carrier-linked only)”; consistent across screens.
FR-SUR-005 Import/export JSON for surcharges supported via the Surcharges screen.
FR-SUR-006 Cross-screen convenience: Rate Table can create a draft surcharge prefilled from a rate; navigating opens the Surcharges screen.
FR-SUR-007 Event sync: Any change to surcharges dispatches 'tariffs:updated' and leverages 'storage' for multi-tab updates.
FR-SUR-008 Demo seeding: One-time sample seeds added automatically on first load when empty.
	- For carriers Evergreen, ONE, Maersk, MSC, Hapag-Lloyd, CMA CGM:
		- ALL/ALL, equipment ALL, USD: BAF 150, Low Sulphur Surcharge 40, Peak Season Surcharge 100 (Per Container).
		- ALL/US*, equipment ALL, USD: AMS Submission 40, AMS Amendment Fee 30 (Per B/L).
	- Carrier-specific THB documentation fees (tradelane blank "—", equipment ALL, Per B/L):
		- Maersk: Export B/L Fee 1,400; CMA CGM: Import D/O Fee 1,400; Hapag-Lloyd: Switch B/L Fee 3,000; ONE: Telex Release Fee 1,500; Evergreen: Amendment Fee 1,000; MSC: Correction Fee 1,500.
	- Seeding is idempotent via one-time flags; a "Seed Samples" and "Reset & Seed" control is available on the Surcharges screen.
FR-SUR-009 File persistence option: Users can Link a JSON file (File System Access API) and Save/Load/Autosave surcharges to disk for durability and sharing.

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
FR-UI-006 Navigation simplification: "Rate Management 2" entry removed from the menu (route can remain for direct/internal access).

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
BL-023 Surcharges must be carrier-specific; entries with carrier 'ALL' or blank are disallowed and migrated out (backed up to localStorage key carrierSurcharges:orphanBackup).
BL-024 Surcharge matching uses exact carrier match; no wildcard carrier; tradelane patterns support 'ALL/ALL', 'ALL/US*', 'THLCH/ALL', and explicit 'ORIGIN → DESTINATION'.
BL-011 (Superseded numbering reused earlier) Pricing Request SLA turnaround 3-day target (see §19.3) – implemented fields for computation.
## 20. SysFreight Integration (RFP / Quotation Export)

This section documents how SharkFin prepares quotation and RFP payloads for downstream consumption by the SysFreight accounting/booking system. It focuses on the canonical use of managed Charge Codes (the centralized Charge Codes catalogue) and the expected data shape for quotation lines in export/RFP flows.

20.1 Purpose
- Ensure exported RFP/quotation payloads contain canonical accounting charge codes matching SysFreight's chart of accounts.
- Prevent free-text charge descriptions from leaking into external systems by requiring selection from the managed `chargeCodes` store prior to export.

20.2 Charge Code Source of Truth
- Charge Codes are stored centrally in browser localStorage under the `chargeCodes` key as an array of objects: { code, name, description, active }.
- The UI exposes a `ChargeCodeAutocomplete` control that forces selection from this managed list (no free-text). The `ChargeCodeLabel` component renders combined display `CODE — Name` in lists and tables.

20.3 Validation Rules
- Every quotation line included in an RFP or export MUST have a non-empty `chargeCode` that matches one of the `code` values in the managed `chargeCodes` list (case-insensitive match).
- The Quotation editor enforces this at UI-level: Save and Submit actions are disabled when any line has a missing or unrecognized `chargeCode`. Submission routines additionally validate server-side (defensive) where applicable.

20.4 Quotation / RFP JSON Line Shape
When exporting a quotation (download, email payload or an API post), each line is emitted with a canonical structure. Minimal important fields are shown below; implementers may extend with additional fields as required by SysFreight.

Example exported line object:

```json
{
	"rateId": "RID-XYZ-123",
	"origin": "BKK",
	"destination": "USLAX",
	"unit": "Per Container",
	"qty": 2,
	"sell": 1200.00,
	"margin": 300.00,
	"ros": 25.0,
	"chargeCode": "CARGO01"
}
```

Notes:
- `chargeCode` is the canonical code string (example: `CARGO01`), not the human-friendly name. The receiving system (SysFreight) will map this to its accounting or booking code table as needed.
- If a line does not have `chargeCode`, the exporter will set `chargeCode: null` (legacy data) but the UI prevents submitting quotations with null/invalid `chargeCode` when SysFreight export is the target.

20.5 Migration and Backfill
- Existing stored quotations (created before enforcement) may contain free-text or absent chargeCode values. Recommended options:
	1. Best-effort backfill: match free-text against the managed `chargeCodes` list using exact code match or case-insensitive name match; where multiple matches occur, flag for manual review.
	2. Manual review UI: provide a maintenance view listing quotations with missing/invalid `chargeCode` so a user can open and correct lines.

20.6 Integration Patterns
- Pull pattern (Batch): SharkFin writes an exported JSON file (example filename `quotation_<id>.json`) that is picked up by an integration process and posted to SysFreight.
- Push pattern (API): SharkFin POSTs the export payload to a SysFreight endpoint; the payload must conform to SysFreight's API schema (map `chargeCode` to the expected field name if different).

20.7 Security & Error Handling
- Export operations should log failures and surface user-friendly messages. If SysFreight rejects a line due to an unknown `chargeCode`, the integration layer should return a structured error enabling SharkFin to re-map or flag specific lines for correction.

20.8 Example: Full Quotation Payload (excerpt)

```json
{
	"type": "quotationSubmission",
	"id": "Q-XXXX",
	"customer": "ACME CORP",
	"totals": { "sell": 2400.00, "margin": 600.00, "ros": 25.0 },
	"lines": [ /* array of line objects as above */ ]
}
```

20.9 Operational Notes
- The UI shows `CODE — Name` for clarity, but only the `code` is transmitted in export payloads.
- If you plan to integrate directly with SysFreight, confirm the exact field mappings and any additional required metadata (e.g., accounting departments, project codes) and extend the payload accordingly.

BL-017 Hierarchical Data Visibility: User may access an inquiry if any of the following is true: (a) user is the direct owner, (b) user appears in the owner's supervisor chain (is above), (c) owner appears in the viewer's supervisor chain (is above viewer), (d) both share the exact team & location, (e) both share the same location, (f) both share the same region. Otherwise hidden.
BL-018 Supervisor Chain (“Fishhook”) Resolution: Each user record includes optional supervisor username; system precomputes upward chain (excluding cycles). Used for visibility checks and future approval routing.
BL-019 Organization Taxonomy: region → location → team → members tree materialized at auth context load for rapid in‑memory evaluation (no runtime recomputation per filter pass).
BL-020 Dual Manager Support (Extensible): Multiple sales managers (e.g., salesmanager.top, salesmanager.mike) can report to a single region manager; subordinate assignment determined per member.supervisor field, enabling split location oversight within a single region.
BL-021 Escalation Path Integrity: Cycle prevention enforced by ignoring any supervisor already visited during chain build (defensive loop break).
BL-022 Data Minimization: Visibility filter operates post user-entered UI filters to avoid unnecessary evaluation on rows already excluded, preserving client performance.

## 7. Access Control (RBAC)
Client-side enforcement only (prototype). Route guard + in-component data filtering.

| Resource / View | Sales | Pricing | Director | Notes |
|-----------------|:-----:|:-------:|:--------:|-------|
| Rate Management | R | R/W | R | Sales currently allowed edit Air via Airline Rate Entry. |
| Airline Rate Entry | R/W | R/W | R/W | |
| Inquiry Management (list) | Own only | All | All | Owner filter enforced in-memory. |
| Inquiry Detail/Edit | Hierarchical (BL-017) | All | All | Sales now inherit via supervisor/location/region chain (BL-017). |
| Quotations (list) | Own only | All | All | salesOwner filter. |
| Quotation Edit | Own only | All | All | Auto-assign owner for Sales. |
| Pricing Requests Inbox | R | R/W | (Future) | |
| Tariff Library | R | R | R | Prototype. |
| Audit Trail Viewer | R | R | R | Placeholder implementation. |

Legend: R = Read, W = Write.

RBAC-007 (Implemented): Sales users MUST only see inquiries & quotations they own.
RBAC-012 (Enhanced Visibility Model Implemented): Inquiry list now applies hierarchical visibility (BL-017) – supersedes strict owner-only rule for non-owner stakeholders within same managerial / geographic structure (while still restricting unrelated peers).

## 8. Data Model Overview
### 8.1 Rate (Unified)
id, mode, vendor, carrier, origin, destination, chargeCode, containerType / basis / unit, currency, buy, sell, margin, validityFrom, validityTo, notes (optional), service (future), contractService (future), cost/atCostFlag (future backlog alignment with draft fields).

### 8.2 Inquiry
id, customer, owner, mode, origin, destination, volume, weight, incoterm, validityTo, status, customerTargetPrice, notes, creditOk, cargoReadyDate, timeFrame, lines? (snapshot lines referencing rate fields at capture time).
Org visibility helper fields (derived at runtime, not persisted): ownerUser.region, ownerUser.location, ownerUser.team, ownerSupervisorChain[].
### 8.5 Pricing Request (Rate Improvement)
id, type ('rateImprovementRequest'), inquiryId, customer, owner, status (NEW/RFQ SENT/QUOTES IN/PRICED/REPLIED), createdAt, urgency, remarks, customerTargetPrice, inquirySnapshot{ origin, destination, notes, customerTargetPrice }, totals{ sell, margin, ros }, lines[{ id (rateId at time of request), origin, destination, basis/containerType, vendor, carrier, qty, sell, margin, ros, chosenVendor?, chosenPrice?, vendorQuotes? }], rfq{ vendors[], sentAt }, pricedSnapshot[], history (implicit in line.vendorQuotes history arrays).

### 8.3 Quotation
id, inquiryId?, customer, salesOwner, mode, incoterm, currency, validFrom, validTo, status, lines[], charges[], totals{ sell, margin, ros }, notes.

### 8.4 Tariff (Planned / Partial)
code, name, category, mode, unit, currency, rate, vendor, cost, atCostFlag, country, port, equipment, vatPercent, validityFrom, validityTo, active, notes.

### 8.6 Tariff Surcharge (Carrier-linked)
id, carrier (required; specific), charge, basis, currency, amount, notes, active, tradelane (pattern string OR explicit 'ORG → DEST'), equipment ('ALL' allowed for equipment only).

## 9. Calculations (ROS & Financial)
- Line Effective Sell = sell - discount.
- Line Effective Margin = margin - discount.
- Line ROS% = Effective Margin / Effective Sell (if >0).
- Quotation Sell = Σ((line eff sell * qty)) + Σ(charges.sell * qty).
- Quotation Margin = Σ((line eff margin * qty)) + Σ(charges.margin * qty).
- Quotation ROS% = Total Margin / Total Sell.
- Color thresholds: success ≥20%, warning 12–19.99%, error <12%.

## 10. Non-Functional Requirements (Prototype Level)
NFR-001 Persistence: localStorage primary; clearing storage resets dataset for that origin.
NFR-002 Performance: Instant client operations for small datasets (<5k rows anticipated). No pagination yet.
NFR-003 UX: Minimal clicks to build inquiry & quotation; consistent column ordering.
NFR-004 Technology: React 19, Vite, MUI, react-router-dom, recharts (integrated for lane price trend sparklines – lightweight deterministic demo data).
NFR-005 Extensibility: Modular components to allow backend substitution later.
NFR-006 Security: Demo-only; client-side role assumption (no server validation).
NFR-011 Optional file persistence (Surcharges): When browser supports File System Access API, user may link a JSON file to persist surcharges (manual Save or Autosave). This enables durability across origins/hosts and easy backup/restore.

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
| Carrier-linked Surcharges screen | FR-SUR-001..007 | Implemented | Separate from Tariff Library. Carrier exact match enforced. |
| Surcharge demo seeding & file persistence | FR-SUR-008..009, NFR-011 | Implemented | One-time seeds + UI controls (Seed/Reset, Link/Save/Load/Autosave). |
| Hide Rate Management 2 menu entry | FR-UI-006 | Implemented | Route may still be reachable by direct link. |
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
Last Updated: 2025-09-03 (post v0.9 branding & visualization enhancements)

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
| 2025-09-03 | 0.8 | Added managedRates canonical store + real-time event sync, unified rate source across Inquiry Cart & Rate Management, booking count tracking & display, Pricing Request SLA KPI (3-day) tracking & overdue flag, vendor quote list gating (hidden until RFQ Sent), persistent selected vendors filtering with original vendor always included, settings-driven ROS gating refactor, Pricing inline Buy/Sell edit enablement in requests, vendor quote filtering & persistence improvements. (Note: Removed earlier provisional containerType fallback to 40HC – container must originate from selected rate data.) |
| 2025-09-03 | 0.9 | Branding refresh (site title “SharkFin - Freight Sales Platform”, logo integration, gradient AppBar), global MUI theme (typography, table density, header gradient), lane price trend sparkline visualization (Inquiry Cart Detail & Pricing Request lines), inline vendor Transit & Remark editing in vendor quote table, minor layout height adjustments for improved readability. |
| 2025-09-06 | 1.0 | Introduced Carrier-linked Tariff Surcharges (separate from Local Charges); enforced carrier-specific rule (no 'ALL'); exact carrier matching in Rate Table; pattern-based tradelane matching; equipment normalization; centralized surcharges store with events; removed default seeding of generic surcharges; added one-time sample seeding for per-carrier ALL/ALL and ALL/US* patterns for demo. |
| 2025-09-06 | 1.1 | Added exact sample seeds (incl. THB doc fees) with UI seed/reset controls; file-based persistence for surcharges (Link/Save/Load/Autosave); Azure Static Web Apps SPA routing config; environment-driven base path; removed Rate Management 2 from menu. |


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
FR-PRREQ-018 (Revised) ContainerType MUST be sourced from underlying rate data; no implicit fallback applied. Offers lacking container size are excluded from selection to prevent data contamination.
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

## 21. Gap Analysis – Missing / Not Yet Covered Capabilities
Purpose: Enumerate notable capability gaps in SharkFin as of v0.8 relative to (a) stated vision in earlier drafts/backlog and (b) commonly expected features in a mature commercial freight rate & quotation platform. This list explicitly avoids speculative claims about the Rate Runner manual where wording was not provided; items marked "Unknown" require manual confirmation.

### 21.1 Core Data & Domain Model
| Gap | Description | Current Status | Notes |
|-----|-------------|----------------|-------|
| Contract Tiers / Breakpoints | Weight / volume / quantity tiered pricing per lane | Missing | Needed for air & LCL scalability. |
| Surcharges Catalog (Standardized) | Fuel, BAF, CAF, PSS, THC, etc. structured with auto-apply rules | Missing | Tariff library only partially covers. |
| Effective Dating & Supersession | Future/next rate version queued with automatic activation | Missing | Backlog FE-005 covers concept. |
| Multi-Currency Fields & FX | Store native currency + base currency with FX snapshots | Missing | No currency conversion; ROS single-currency assumption. |
| Accessorial Rule Logic | Conditional application (min, max, thresholds) | Missing | Flat additional charges only. |
| Structured Equipment Catalog | Full list (e.g., 20GP/40GP/40HC/45HC/REEFER) with validation | Partial | Fallback logic only, no enforced taxonomy. |
| Service / Contract Attributes | Contract owner, award %, free time, transit days | Missing | Fields hinted but not stored. |
| Vendor Performance Metrics | Quote response time, win ratio | Missing | Requires events & time stamps beyond current. |

### 21.2 Workflow & Governance
| Gap | Description | Current Status | Notes |
|-----|-------------|----------------|-------|
| Multi-Step Approval Workflow | Role-sequenced approvals (Sales → Pricing → Director) | Missing | UI stub for low ROS only. |
| Exception Handling & Justification | Capture rationale for margin override / discount | Missing | Would extend audit trail. |
| Quotation Revisions / Version History | Incremental version ladder (Q-001, Q-001R1...) | Missing | Snapshots not stored; overwrite in-place. |
| Inquiry to Booking Conversion Flow | Formal transition to booking entity with status sync | Missing | bookingCount only derived concept. |
| Negotiation Rounds (RFQ) | Iterative vendor quote rounds with status per round | Missing | Single lifecycle state path only. |
| SLA Dashboard | SLA aging buckets & trend charts | Missing | Just per-request fields. |
| Bulk Actions (Mass RFQ) | Send RFQ to multiple inquiries or lanes in batch | Missing | Per-request only. |

### 21.3 Vendor & External Collaboration
| Gap | Description | Current Status | Notes |
|-----|-------------|----------------|-------|
| Vendor Portal Authentication | Distinct vendor login & isolation | Missing | Vendor view simulated client-side. |
| Attachment Handling | Upload rate sheets, quote docs | Missing | No file persistence. |
| Messaging / Comments Thread | Conversation log per request | Missing | Would feed audit. |
| Email / Notification Dispatch | RFQ email invites, quote reminders | Missing | Local placeholder only. |
| API / EDI Ingestion (Carrier) | Automated rate updates via API | Missing | No backend services. |

### 21.4 Pricing & Financial Controls
| Gap | Description | Current Status | Notes |
|-----|-------------|----------------|-------|
| Advanced Margin Simulation | Scenario comparison (best/median/target) | Missing | Single inline edit only. |
| Discount Policy Engine | Enforce max discount by role/segment | Missing | Manual margin edits unrestricted. |
| Cost Attribution Flags | At-cost vs uplift logic influencing ROS classification | Missing | Field placeholder only. |
| Currency Hedging / FX Snapshot | Lock FX rate at quotation time | Missing | Requires FX service. |
| Win/Loss Reason Capture | Structured reasons (price, service, lead time) | Missing | No Won/Lost metadata aside from status. |

### 21.5 Analytics & Reporting
| Gap | Description | Current Status | Notes |
|-----|-------------|----------------|-------|
| Win Rate Analytics | Conversion KPIs by customer / lane | Missing | No aggregation layer. |
| Margin Trend Dashboard | ROS trend over time | Missing | Needs historical snapshots. |
| Vendor Performance Report | Response speed, competitiveness index | Missing | Requires captured offer deltas. |
| Rate Utilization Analytics | Usage vs availability by lane | Partial | bookingCount primitive only. |
| Aging Reports (Requests) | Days open distribution | Missing | Computable from existing timestamps. |

### 21.6 Technical / Platform
| Gap | Description | Current Status | Notes |
|-----|-------------|----------------|-------|
| Backend Persistence Layer | API + DB (CRUD, auth) | Missing | Prototype only. |
| Authentication & Authorization | Secure login, token management | Missing | Username prefix heuristic. |
| Audit Log (Immutable) | Append-only ledger with diff snapshots | Missing | Viewer placeholder only. |
| Concurrency Control | Optimistic locking / ETags | Missing | Last write wins silently. |
| Import / Validation Engine | Structured error reporting, partial success | Missing | Manual JSON only. |
| Pagination / Virtualization | Large dataset support | Missing | All in-memory. |
| Performance Metrics / Monitoring | Telemetry, latency tracking | Missing | No instrumentation. |
| Config Management UI | Manage thresholds, ID schemes, defaults centrally | Partial | Limited settings context only. |

### 21.7 Compliance / Governance
| Gap | Description | Current Status | Notes |
|-----|-------------|----------------|-------|
| Audit Readiness (SOX-like) | Traceable approval & change logs | Missing | Requires robust audit & roles. |
| Data Retention & Purge Policies | Automatic archival / deletion | Missing | localStorage only. |
| Role Separation of Duties | Enforced boundaries (e.g., Pricing vs Approvals) | Missing | Client-side only. |
| PII / Sensitive Data Handling | Masking / encryption | Missing | Not addressed. |

### 21.8 User Experience & Productivity
| Gap | Description | Current Status | Notes |
|-----|-------------|----------------|-------|
| Global Search (Entities) | Cross-entity quick finder | Missing | Per-list filtering only. |
| Inline Diff / Compare Views | Compare rate versions or quote revisions | Missing | Would aid negotiation. |
| Bulk Edit Operations | Multi-row update (currency, validity) | Missing | Row-by-row editing. |
| Templates for RFQs | Predefined vendor groups or lane bundles | Missing | Manual vendor selection each time. |
| Keyboard Shortcuts | Power-user navigation | Missing | Not implemented. |
| Accessibility Compliance | A11y audits (ARIA, contrast) | Unknown | Requires review; not purpose-built. |

### 21.9 Identifiers & Traceability
| Gap | Description | Current Status | Notes |
|-----|-------------|----------------|-------|
| Structured Entity IDs | Configurable patterns per entity type | Missing | Only REQ-YYMM-#### done. |
| Cross-Entity Linking UI | Quick jump: quotation ↔ inquiry ↔ request | Partial | Some IDs stored; limited navigation shortcuts. |
| Change Attribution | Which user altered Buy/Sell & when | Missing | Needed for margin audit trail. |

### 21.10 Areas Requiring Manual Confirmation (Unknown)
These items may exist in the Rate Runner manual but were not provided in shared context:
* Exact RFQ status taxonomy beyond basic lifecycle.
* Detailed field lists for airline weight break logic.
* Specification of approval escalation thresholds.
* Defined SLA metrics beyond pricing turnaround.
* Standard surcharge code set and application rules.
If available, incorporate to refine gap labels from "Missing" to "Confirmed Missing" or "Not Applicable".

### 21.11 Prioritization Suggestion (Next 6 Sprints)
1. Foundation: Backend auth + persistence + audit (unblocks secure data & history).
2. Data Depth: Contract/tier model + surcharge catalog + effective dating.
3. Workflow: Quotation revisioning + approval engine + exception rationale capture.
4. Analytics: SLA & win-rate dashboards + vendor performance metrics.
5. Financial Robustness: Multi-currency + FX snapshots + discount policy engine.
6. Collaboration: Attachments + vendor portal auth + messaging thread.

### 21.12 Quick Wins (Low Effort / High Clarity)
* Add revision snapshot per quotation save.
* Append audit line (local) on Buy/Sell change.
* Basic pagination (client-side) when row count > N threshold.
* SLA aging chips (0–1d / 1–2d / 2–3d / >3d) in request inbox.
* Global search bar filtering across entity types (in-memory index).

---

## 22. Sept 03 (Later Day) Branding & Visualization Enhancements (v0.9)

### 22.1 Branding & Navigation
BRAND-001 Site title updated to “SharkFin - Freight Sales Platform” (was “Operations Portal”).
BRAND-002 Company logo (`/images/wice-logo.png`) added to AppBar and drawer header with high‑contrast badge treatment.
BRAND-003 AppBar and drawer header now use gradient backgrounds (dark navy range) for stronger visual hierarchy.
BRAND-004 Increased AppBar height (52–56px responsive) and adjusted main content offset for cleaner above-the-fold layout.

### 22.2 Global Theme & UI Density
THEME-001 Introduced centralized custom MUI theme (`theme.js`) with Inter/system font stack, reduced table cell vertical padding, rounded component shape (radius 6), and gradient table head styling.
THEME-002 Normalized button styling (no ALL CAPS, stronger weight) and small-size defaults for high information density screens.
THEME-003 Applied CssBaseline + palette (primary #15426d / secondary #0d203a) and paper background neutralization (no default MUI background image noise).

### 22.3 Lane Price Trend Visualization
VIS-001 Added deterministic lane price trend sparkline column (recharts) in: (a) Inquiry Cart Detail, (b) Pricing Request (vendor quote table) for quick visual signal of relative rate movements.
VIS-002 Deterministic pseudo-data generator ensures consistent demo output without backend dependency.
VIS-003 Visualization intentionally minimal (sparkline only) to avoid cognitive overload and preserve table density.

### 22.4 Vendor Quote Table Enhancements
VQ-001 Inline editing enabled for vendor Transit and Remark fields (previously static) with draft buffering and commit on blur.
VQ-002 Existing inline Buy/Sell editing retained; transit/remark changes persist via same normalization update path for unified audit expansion later.
VQ-003 Draft state clears after blur to keep working memory small and minimize stale temporary objects.

### 22.5 Updated / New Requirement References
FR-UI-006 (New) Provide lane price trend mini-chart (sparkline) where rate comparison decisions occur (Inquiry Cart Detail, Pricing Requests) – Implemented.
FR-PRREQ-019 (New) Vendor transit field editable inline post RFQ Sent – Implemented.
FR-PRREQ-020 (New) Vendor remark field editable inline post RFQ Sent – Implemented.
NFR-010 (New) Visualization must introduce negligible performance overhead (target render cost O(n) lightweight; achieved with tiny SVG sparklines and deterministic dataset).

### 22.6 Rationale
These enhancements improve perceived product maturity (branding), accelerate at‑a‑glance comparative evaluation (sparklines), and reduce context switching or external note taking (inline transit/remark edits) without introducing backend complexity.

### 22.7 Future Visual / UX Considerations
* Dark mode toggle (theme palette inversion) – backlog.
* Adaptive density (compact / comfortable toggle) for large monitors vs laptops.
* Inline vendor quote diff (current vs previous round) once multi-round RFQ introduced.
* Tooltip drill-in on sparkline to show min / max / current value.

### 22.8 Deployment & Routing (Azure SWA)
- SPA routing: `staticwebapp.config.json` rewrites unknown paths to `/index.html` and excludes asset paths, enabling deep links (e.g., `/tariffs`).
- Base path: Vite `base` is environment-driven (defaults to `/` for Azure SWA; for GitHub Pages set `VITE_BASE_URL=/shark-fin/`). React Router `basename` only set when non-root.
- Note: For GitHub Pages deployments, `homepage` and base must align with the repository subpath.

