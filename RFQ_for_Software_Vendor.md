# Request for Quotation (RFQ): Shark-Fin Rate Management & Quotation Application

Date: 2025-09-19

Contact: Amnat (project owner)
Repository: https://github.com/amnatp/shark-fin (prototype in repo)
Reference: USER_MANUAL.md, public/manual/ (screenshots & walkthrough)

Overview
--------
Shark-Fin is an internal prototype web application that manages airline freight rates and generates quotations. We are seeking a software vendor to take the prototype and deliver a production-ready Rate Management and Quotation system within a 2-month timeline.

Project goals
-------------
- Convert the existing prototype into a secure, maintainable, and documented production application.
- Implement robust rate management (create/update/versioning of rate sheets, commodities, breaks, buy/sell/M/N rates, min charges).
- Implement quotation workflows (create RFQ/inquiry, vendor quoting, compare quotes, approve and generate customer quotation).
- Provide quality assurance, deployment configuration, and documentation for maintainability.

Scope of Work (high level)
--------------------------
1. Discovery & Architecture (Week 1)
   - Review the prototype repository and USER_MANUAL.md.
   - Produce a short architecture and implementation plan that fits the 2-month timeline.
   - Identify gaps, risks, and recommended improvements.

2. Implementation (Weeks 2–6)
   - Backend: Build a RESTful API (or GraphQL) supporting rate sheets, commodities, breaks, quotations, users, and audit trail.
     - Persist data in a production-grade DB (Postgres preferred). Include schema design and migration scripts.
     - Authentication & authorization: integrate with JWT-based auth and role-based access (admin, pricing, sales, vendor).
     - Business logic: price calculations (by break), derive simple rates, create quotation requests from sheets, vendor quotes, aggregation.
   - Frontend: Convert the prototype React UI into a production SPA.
     - Responsive UI, accessibility basics (WCAG AA), internationalization readiness (currency handling), form validations.
     - Implement rate management screens (list, edit, copy, version, archive), commodity rates, and pricing tester.
     - Implement quotation workflow screens (inbox, detail, create-from-sheet, vendor response, compare quotes, approval, export).
   - Integrations: Optional email/notification hooks, and an optional CSV/JSON import/export for legacy rates.
   - AI Assistant & Chatbot: Implement an embedded assistant to help users complete tasks (e.g., “prepare a single selling rate for THBKK → USLAX”, “explain ROS variance”).
     - UX: Floating chat panel and/or page-level assistant with context chips (current page/entity).
     - Capabilities: Natural-language Q&A on rates and quotations, guided steps for common actions (prepare rate, build quotation), draft generation (e.g., email to vendor/customer), and contextual help.
     - Guardrails: Role-based visibility, retrieval constraints to tenant data only, prompt-injection defenses, sensitive field redaction, feedback UI (“good answer?”, “report issue”).
     - Architecture: Propose an orchestrator/service layer that calls an LLM provider (e.g., Azure OpenAI, OpenAI, or equivalent), with retrieval augmentation over the app’s own data and documentation; include fallback behaviors.

3. Testing & QA (Weeks 4–7)
   - Unit & integration tests for backend and frontend; E2E smoke tests (Playwright or Cypress recommended).
   - Performance checks for typical data sizes (hundreds of sheets, hundreds of line items).
   - Security review (OWASP top 10 basics), input validation, and data protection requirements.
   - AI evaluation: offline evaluation set for typical tasks (prepare rate, interpret surcharge), safety tests for injection and PII leakage, and latency benchmarks for assistant responses.

4. Deployment & Handover (Weeks 7–8)
   - Provide deployment manifests (Docker, docker-compose, or k8s manifests) and CI/CD pipeline guidance (GitHub Actions recommended).
   - Provide runbook for operations, and scripted steps to restore DB and run migrations.
   - Handover documentation: architecture doc, API spec (OpenAPI), README, developer and ops guides, and final handover call.

Deliverables
------------
- Functional production-ready web application (backend + frontend) implementing features described.
- Database schema and migration scripts.
- API specification (OpenAPI/Swagger) and API docs.
- Automated tests (unit, integration, and basic E2E) with a test coverage report for critical modules.
- CI/CD pipeline configuration for builds and deployments.
- Deployment artifacts (Docker images/manifests) and a documented deployment guide.
- User & developer documentation and a short training session (recorded or live).
 - AI Assistant deliverables:
    - Assistant UX integrated into the app (chat widget or side panel) with context chips and feedback controls.
    - Orchestrator service code and configuration for LLM provider(s), retrieval pipeline over app data, and safety middleware.
    - Prompt/flow library (task prompts, system prompts), grounding and safety policies, and evaluation datasets.
    - Ops guide for monitoring, cost controls, logging/tracing (request/response with redaction), and feature flags to disable AI per environment.

Assumptions
-----------
- The prototype repo is the baseline; vendor is responsible for full re-implementation to production standards.
- Customer will provide access to any existing identity provider if integration required; otherwise basic JWT auth is sufficient.
- No third-party paid integrations are required unless proposed and approved.
- Target hosting environment: container-based (Docker). Cloud provider: vendor's recommendation (AWS/GCP/Azure).

Timeline & Milestones (2 months)
--------------------------------
Total duration: 8 weeks (2 months). Example milestone plan:
- Week 1: Discovery, architecture doc, and sprint plan.
- Week 2–3: Core backend models and API, rate management CRUD, DB migrations.
- Week 4–5: Frontend UIs for rate management, commodity rates, and tester; create-from-sheet functionality.
- Week 6: Quotation workflows (inbox/detail), vendor quote flows, and comparison UI.
- Week 7: Testing, performance tuning, security review.
- Week 8: Deployment, documentation, handover, and training.

Acceptance criteria
-------------------
- All core features implemented and demonstrable in a staging environment.
- Automated tests run successfully and critical paths covered.
- Performance: acceptable latency for CRUD operations (<500ms typical for list/detail calls under normal load) and ability to handle hundreds of sheets.
- Security: input validation, authenticated endpoints, and basic protections against common web vulnerabilities.
- Documentation: architecture, API docs, deployment guide, and README.
- Handover: a recorded or live session demonstrating the system and steps to deploy.
 - AI Assistant:
    - Functionality: can answer typical rate/quotation questions and guide users through “Prepare Rate” flow with >80% task success on the evaluation set.
    - Safety: passes injection and PII redaction tests; respects RBAC (no cross-tenant data leakage) with zero high-severity failures.
    - Latency: p95 assistant response under 3s for standard queries (excluding large document retrievals).

Proposal requirements
---------------------
Please provide the following in your response:
1. Company/team summary and relevant experience.
2. Proposed technical approach and architecture (brief).
3. Itemized cost and time estimates mapped to milestones.
4. Assumptions, risks, and dependencies.
5. Staffing plan and CVs/roles of key team members.
6. Example references or case studies with similar projects.
7. Maintenance & support options post-delivery (SLA, hourly rates).
 8. AI Assistant & Chatbot:
   - Proposed models/providers (e.g., Azure OpenAI, OpenAI, or equivalent) and reasoning for selection.
   - RAG/retrieval design (sources, indexing cadence), safety/guardrail design, and data retention/PII handling.
   - Cost projections and controls (rate limiting, caching), observability, and fallback plans when AI is unavailable.

Evaluation criteria
-------------------
- Relevant domain experience and references.
- Clarity and feasibility of the proposed plan to meet the 2-month deadline.
- Cost and value proposition.
- Quality of testing and deployment/ops plan.

Budget
------
- Provide a firm cost estimate or a reasonable cost range. If available, include a split between implementation and optional ongoing support.
 - Include a separate line for AI Assistant costs (inference/model usage, vector store/search infra, monitoring), with assumptions (traffic, tokens, concurrency).

Submission instructions
-----------------------
- Submit your proposal by email to Amnat (or via GitHub issue/PR) by [please propose a date — typical 1 week from RFQ issuance].
- Include a contact person for follow-ups and availability for a short kickoff call.

Optional: Attachments
---------------------
- Link to the prototype repository: https://github.com/amnatp/shark-fin
- Reference docs: `USER_MANUAL.md` in repo, `public/manual/` for screenshots and walkthroughs.

Questions
---------
- Please surface any clarifying questions within 48 hours of this RFQ issuance.

---

End of RFQ

---

Appendix A — SysFreight Integration (RFP / Quotation Export) — Charge Codes
--------------------------------------------------------------------------
This appendix clarifies the specific expectations around Charge Codes in the SysFreight export/integration scope and should be reflected in vendor proposals and delivery plans.

1) Source of Truth & UI Enforcement
- Maintain a managed Charge Codes catalogue (code, name, description, active). All quotation/RFP lines must reference a `chargeCode` chosen from this catalogue (no free-text entries).
- UI components must enforce selection from this set (e.g., autocomplete without free text) and render `CODE — Name` for user clarity while persisting the canonical `code` only.

2) Validation
- Block submission/export of quotations or RFP payloads when any line lacks a valid `chargeCode` or uses an inactive/unknown code. Provide actionable validation messages and highlight affected rows.

3) Payload Requirements
- Include `chargeCode` on every exported line. Export the canonical code string only (not the name). Align remaining fields with BRD §20 examples (rateId, origin, destination, unit/basis, qty, sell, margin, ros).

4) Migration & Backfill of Legacy Data
- Provide scripts and an admin UI to scan existing quotes/rates for legacy or free-text values and map them to managed codes. Support: exact code match, case-insensitive name match, prefix/heuristic candidates, and manual resolution for ambiguous items. Produce a report and allow apply/re-scan cycles. See BRD §20.5.

5) Error Handling & Observability
- When SysFreight rejects lines (e.g., unknown `chargeCode`), propagate structured errors that identify offending lines and enable correction/retry. Log integration failures with sufficient context for ops triage.

6) Deliverables & Tests
- OpenAPI specification documenting export endpoints and `chargeCode` semantics.
- Test fixtures and E2E tests covering: (a) successful export with valid codes, (b) blocked submission with missing/invalid codes, (c) SysFreight rejection with descriptive errors.

Reference: Business Requirements Document (BRD) §20 “SysFreight Integration (RFP / Quotation Export)” in this repository for full details and example payloads.

---

Appendix B — AI Assistant & Chatbot Requirements
------------------------------------------------
This appendix details the AI assistant scope, architecture expectations, safety, and evaluation.

1) Use Cases & UX
- Contextual chat assistant accessible from most pages; shows current context (e.g., inquiry, lane, role) as selectable chips.
- Typical tasks: “Prepare a single selling rate for THBKK → USLAX”, “Explain ROS variance for this inquiry”, “Draft vendor email requesting updated buy rates for FCL THBKK→USLAX”.
- Features: step-by-step guidance, quick action links (open Prepare Rate dialog, pre-fill lane), copy-to-clipboard for drafts, thumbs up/down feedback with optional comment.

2) Architecture & Data
- Orchestrator service mediates between frontend and LLM provider, applying safety/guardrails and retrieval augmentation.
- Retrieval sources: application database (rates, quotations, surcharges) and internal docs (manual/BRD); design vector index or hybrid search with refresh strategy.
- Provider: Azure OpenAI, OpenAI, or equivalent; must support enterprise controls (data privacy, regional hosting options).
- Observability: structured logs and traces with redaction; metrics for latency, cost, success rate; feature flag to disable AI.

3) Security & Safety
- Enforce RBAC scope in retrieval and answer composition; never return other tenants’ data.
- Prompt-injection defenses (instruction filtering, source grounding, allowlist for tool calls); redaction of PII in logs.
- Configurable content moderation and blocked-topic handling (return safe refusal with guidance when applicable).

4) Evaluation
- Provide an offline evaluation set covering the primary tasks above with acceptance thresholds (task success ≥80%).
- Safety tests: injection attempts, data exfiltration prompts, and PII leakage tests must have zero high-severity failures.
- Performance: p95 latency under 3s for common tasks, with test harness and reproducible measurements.

5) Deliverables
- Design doc (models, retrieval, safety), prompt library, evaluation datasets, and ops guide (monitoring, limits, cost controls).
- Minimal admin UI/toggles for enabling/disabling assistant and inspecting recent conversations (with PII-safe views).
