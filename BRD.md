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
FR-INQ-002 Inquiry fields: id (auto), customer, sales owner (owner), mode, origin, destination, volume, weight, incoterm, validityTo, rosTarget, notes, creditOk flag.
FR-INQ-003 Inquiry ID auto-generated; intended future rule ties to user/location (draft content); current implementation uses random prefixed IDs (gap noted).
FR-INQ-004 Pipeline statuses: Draft → Sourcing → Priced → Quoted → Won / Lost.
FR-INQ-005 Filtering by customer, mode, owner, status, origin, destination; export filtered set to JSON.
FR-INQ-006 Sales role: New Inquiry form pre-populates owner with logged-in Sales user.
FR-INQ-007 View dialog shows line snapshots if present.

### 5.2 Inquiry Cart / Cart Detail
FR-CART-001 Select/compose rates (all modes) into a cart for inquiry/quotation building.
FR-CART-002 Normalization: All selected rates mapped to unified line model (mode-agnostic fields).
FR-CART-003 Charge Code column placed at rightmost (UI alignment rule UI-004).
FR-CART-004 Airfreight normalization aligned with Airline Rate Entry model.

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
BL-002 Sales visibility restriction: Sales can only see their own inquiries & quotations (owner matching username or display) (RBAC-007).
BL-003 Inquiry and Quotation IDs unique; future format tie to user/location (not yet implemented – backlog BL-004).
BL-004 (Backlog) Structured numbering scheme per location (e.g., BKK-YYYYMM-####) replacing random IDs.
BL-005 Rate normalization ensures consistent downstream consumption (lines & cart).
BL-006 Discount subtracts from both sell and margin for ROS calculations.

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
id, customer, owner, mode, origin, destination, volume, weight, incoterm, validityTo, status, rosTarget, notes, creditOk, lines? (snapshot lines referencing rate fields at capture time).

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

---
Document Owner: Product / Ops (prototype)
Last Updated: 2025-09-01

## 16. User View & Prototype Disclaimer
Purpose: Clarify that current implementation is a demonstration prototype to evidence requirement coverage, not a production-ready system.

### 16.1 What End Users Can Do Now
- Sales User:
	- Create inquiries (owner auto-filled) and view ONLY own inquiries & quotations.
	- Build quotations (auto salesOwner) and view ROS & status auto-approval logic.
	- Browse multi‑mode rates and (if navigated directly) edit airline rate sheets (menu entry hidden per latest change).
- Pricing User:
	- View all inquiries & quotations; (future) manage pricing requests.
	- Maintain airline rate sheets and general rate data.
- Director:
	- Observe all data; trigger (future) approval flow (placeholder dialog only).

### 16.2 Demonstrated Requirement Coverage
- RBAC filtering for Sales visibility (inquiries, quotations) implemented.
- Unified rate → inquiry cart → quotation data flow established.
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
- Workflow Gaps: Director approval does not persist or change state beyond UI feedback.
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
4. ROS logic producing expected visual status changes.

Stability, security, scalability, and compliance concerns are explicitly deferred to a future implementation phase.
