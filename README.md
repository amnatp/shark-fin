# SharkFin — Freight Sales Prototype

SharkFin is a lightweight React + Vite prototype demonstrating a freight sales workflow: inquiries, pricing requests (RFQs), quotations, and unified rate management across Sea (FCL/LCL), Air and Transport. It's intended for demos and UX exploration; data is stored locally in the browser (localStorage) and the app is structured to be deployable to GitHub Pages or Azure Static Web Apps.

Key highlights
- Unified rate model across modes (FCL/LCL/Air/Transport)
- Role-based UI (Sales, SalesManager, RegionManager, Pricing, Vendor, Customer, Admin)
- In-app workflows: Inquiry Cart, Inquiry Edit, Pricing Requests, Quotations, Rate Management
- Tariff Surcharges engine for carrier-linked surcharges with pattern matching

Quick start (developer)
1. Clone the repo and install dependencies:

	npm install

2. Start the dev server:

	npm run dev

3. Run tests:

	npm test

4. Build for production:

	npm run build

Notes on deployment
- GitHub Pages: `npm run deploy` publishes `dist` to the configured `homepage` path. Ensure `vite` base path is set for the target host (see `vite.config.js`).
- Azure Static Web Apps: SPA routing works when built with the default base ('/'); confirm environment variables if using a subpath.

Useful scripts
- `npm run dev` — Run Vite dev server
- `npm run build` — Create production build (dist)
- `npm test` — Run unit tests (vitest)
- `node scripts/screenshot.cjs` — Capture demo screenshots (requires Puppeteer installed)

Where to read more
- Detailed user flows and step‑by‑step screens: `USER_MANUAL.md`
- Business requirements and planned scope: `BRD.md`
- Quick demo notes: `demo.md`

Contributing
- Make a branch from `main` for your change, run tests locally, and open a Pull Request.
- Keep role/permission changes centralized in `src/permissions.js`.

Troubleshooting
- If the dev server port is already in use, Vite will pick another port — the screenshot helper accepts `BASE_URL` to point at the running dev server.
- Puppeteer is used only for local screenshot tooling; if your CI environment cannot fetch the Puppeteer version, consider making it a CI-only dependency or pinning an OS/CI-friendly version.

License & notes
- Prototype code — not production hardened. No backend or authentication is provided. Use the `USER_MANUAL.md` for demo instructions and screenshots.
