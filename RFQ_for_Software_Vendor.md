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

3. Testing & QA (Weeks 4–7)
   - Unit & integration tests for backend and frontend; E2E smoke tests (Playwright or Cypress recommended).
   - Performance checks for typical data sizes (hundreds of sheets, hundreds of line items).
   - Security review (OWASP top 10 basics), input validation, and data protection requirements.

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

Evaluation criteria
-------------------
- Relevant domain experience and references.
- Clarity and feasibility of the proposed plan to meet the 2-month deadline.
- Cost and value proposition.
- Quality of testing and deployment/ops plan.

Budget
------
- Provide a firm cost estimate or a reasonable cost range. If available, include a split between implementation and optional ongoing support.

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
