# SharkFin — Demo Walkthrough

Why/what/outcome
- Purpose: provide a concise, copy-ready demo walkthrough using the app's bundled sample data and the localStorage keys the app reads/writes.
- Outcome: you can follow these steps locally to demonstrate Rate Workspace, RateTable, Quotation flows, permissions, and admin actions.

Prerequisites
- Node 18+ and npm installed.
- From the project root run:

```bash
# install deps (only if needed)
npm install
# start dev server
npm run dev
# or build + preview
npm run build && npm run preview
```

- Use a single browser profile for the demo (localStorage is shared per profile).

Quick reference — important localStorage keys
- `managedRates` — primary rate table used by `RateWorkspace` / `RateTable` (app falls back to `src/sample-rates.json` when absent).
- `airlineRateSheets` — airline sheet data used in Air mode.
- `derivedAirRates` — derived/converted air rows.
- `dynamicRates` — per-mode dynamic rate overlays.
- `quotations` — quotation documents (used to compute trends and line items).
- `bookings` — booking records (used for volume stats).
- `currentUser` — current user object (auth context reads this).
- `userRoleOverrides` — admin role override map.
- `quotationSamplesSeeded` — flag used by `quotation-list` to avoid reseeding samples.

Demo steps (10–15 minutes)

1) Start the app and confirm landing page
- Start the dev server (see commands above) and open the printed URL (typically `http://localhost:5173`).
- You should land on the Inquiry Cart for non-vendor users. Use the left navigation to open **Rate Workspace** if necessary.

2) Confirm sample data is available
- Open `Rate Workspace`.
- The Origin/Destination autocompletes are populated from `sample-rates.json` or from `managedRates` if present. Try examples such as `CNSHA → DEHAM`.
- If lists are empty, clear `managedRates` from Application → Local Storage so the app falls back to the bundled sample data.

3) Inspect the Prev Month summary cards
- At the top of Rate Workspace, confirm three summary cards exist:
  - Prev Month — Avg Cost
  - Prev Month — Avg Sell
  - Prev Month — Volume
- These are computed from `quotations` and `bookings`. If values are zero, see step 9 to seed sample quotations.

4) Filter by lane and customer
- Choose an Origin and Destination (or type partial values).
- Optionally select a Customer to filter the charts and quotation line items.
- Adjust **Months** (6 or 12) to change the aggregation window and watch the charts and numbers update.

5) Review Related Active Rates
- In **Related Active Rates** switch between `Sea – FCL`, `Sea – LCL` and `Air` tabs.
- The `RateTable` lists matching rates from `managedRates` (or fallback sample). The table respects role-based hiding (cost/margin/ROS) via permissions.

6) Quotation Line Items
- Below Related Rates the table shows quotation lines for the selected lane (past 6 months). Columns: Quotation #, Trade Lane, Selling, Date. Selling follows the Rate Workspace currency selector.

7) Rate Trend & Volume charts
- The **Rate Trend** chart plots Avg Sell vs Avg Cost across the selected months. Hover to inspect month values.
- The **Volume by Month** chart shows booked units (from `bookings`).

8) Demo permissions (Sales vs SalesManager/RegionManager vs Admin)
- Open **Admin → User Management** (requires Admin role) or change `currentUser` in DevTools to simulate roles.
- Role behaviours:
  - Customer / Sales: cost, margin and ROS are hidden across the UI.
  - SalesManager / RegionManager: ROS visible (if implemented), cost and margin remain hidden.
  - Admin: sees all fields and can change `userRoleOverrides` using the admin UI.
- Quick role switch via DevTools > Application > Local Storage: set `currentUser` to a JSON object and reload.

Example `currentUser` JSON for DevTools copy/paste

```json
{"username":"admin","role":"Admin","display":"Administrator","email":"admin@example.com"}
```

```json
{"username":"sales.mei","role":"Sales","display":"Sales Mei","email":"mei@example.com"}
```

```json
{"username":"salesmanager.mike","role":"SalesManager","display":"Sales Manager Mike","email":"mike@example.com"}
```

9) Seed sample quotations (if needed)
- If the quotation tables are empty you can seed a couple of demo quotations via the browser console. A short example:

```javascript
const sampleQuotations = [
  { id: 'Q-1001', customer: 'ACME', createdAt: new Date().toISOString(), lines: [{ lane: 'CNSHA → DEHAM', qty: 1, sell: 1200, discount: 0, margin: 200 }], totals:{ros:0.1667} },
  { id: 'Q-1002', customer: 'Globex', createdAt: new Date(Date.now()-1000*60*60*24*30).toISOString(), lines: [{ lane: 'CNSHA → DEHAM', qty: 2, sell: 1100, discount: 0, margin: 150 }], totals:{ros:0.1364} }
];
localStorage.setItem('quotations', JSON.stringify(sampleQuotations));
localStorage.setItem('quotationSamplesSeeded','1');
window.dispatchEvent(new Event('storage'));
```

- Reload Rate Workspace to see the populated summaries, charts and line items.

10) Create a quotation from an inquiry (end-to-end)
- Open **Inquiry Management** or **Inquiry Cart** and create or open an inquiry.
- Use the **Create Quotation** action to generate a quotation — this saves to `quotations` and will appear in Rate Workspace.

11) Edit a rate from Related Active Rates
- Use the edit action on a `RateTable` row to open Rate Management pre-filled with the selected lane. Save changes to update `managedRates`; the Rate Workspace will react to `ratesUpdated` or `storage` events.

12) Demonstrate audit trail & admin actions
- Edit or create an inquiry/quotation and inspect the `auditTrail` localStorage key for recorded events.
- In Admin → User Management change role overrides; `userRoleOverrides` is persisted to localStorage and UI updates follow.

Quick smoke checks
- Inspect Application → Local Storage to confirm keys: `quotations`, `bookings`, `managedRates`, `airlineRateSheets`, `userRoleOverrides`.
- Use Application → Clear Storage and reload to reset to fallback sample data for a fresh demo.

Optional follow-ups (I can do these for you)
- Produce a ready-to-run seed script (single JS snippet) you can paste into DevTools or run via a tiny preview server to populate `managedRates`, `airlineRateSheets`, `quotations`, `bookings`, and `currentUser`.
- Add an automatic demo runner that opens key screens and captures screenshots.
- Add a Vitest unit that mounts `Dashboards` with controlled `managed` shapes to prevent runtime errors like `slice is not a function`.

Which follow-up would you like? If you want the seed script, say "Seed script please" and I'll add it to the repo as `scripts/demo-seed.js` (or provide a DevTools-friendly snippet you can paste).
