# Hospital Management System (HMS) — Project Summary

Complete record of decisions, requirements, and progress from our planning conversation. This supersedes the earlier `hms-backend-design.md` where they differ (that file predates the UUID/Postgres-schema rewrite).

---

## 1. Overview

A hospital management system for a large client, built by a small team of students with limited experience in advanced stacks. It has four subsystems: **Cashier, Laboratory, Inventory, Accounting**.

The original plan had a separate Patient system. The client meeting removed it: patient tracking now lives inside the Laboratory system, where doctors can only access their own assigned patients.

Current phase: **backend infrastructure and database only**. The frontend is handled separately.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Vue.js + Bootstrap (handled separately) |
| Backend (main API) | Node.js + Express |
| Backend (calculations / OCR / exports / AI) | FastAPI (Python) |
| Database | PostgreSQL |
| Utilities | Docker, Redis |
| Auth | Password hashing (bcrypt) + JWT |

**Team constraint:** no prior experience with Docker or Redis, so their use is deliberately scoped narrowly (see §9). Everything should be easy to implement, use, and extend.

---

## 3. Roles & Access

Roles are stored in a join table, so one account can hold multiple roles.

| Role | Access |
|---|---|
| `superadmin` | Everything; the only role that can create doctor accounts |
| `doctor` | Assigned to specific laboratories; sees only patients/results in their assigned laboratory(ies) |
| `cashier` | Patient intake, transactions, receipt printing |
| `lab_tech` | Lab results entry, material usage (may overlap with doctor) |
| `inventory_staff` | Stock CRUD, receiving, OCR stock-in |
| `accountant` | Accounting views and exports |

The role list was accepted from my suggestion because the client was unreachable. **Confirm with the client on weekdays.**

**Landing / routing behavior**
- A user with one role is routed straight to that system's dashboard.
- A user with multiple roles has a **preferred system** setting (`users.preferred_system`) that auto-opens after login; otherwise a picker is shown.
- Users can always switch systems from the nav bar.
- Every API route is protected by role, not just by which screen the user is on.

---

## 4. Subsystem Requirements

### 4.1 Cashier (first stage, the basis for the others)
- Cashier caters to patients and has full CRUD on patient transactions.
- **Patient check:** the cashier searches by name first. New patients are entered manually by the cashier; existing patients are already in the system.
- **Patient import automation:** bulk import from Excel spreadsheets or written/paper lists (via OCR) to migrate existing records. Imports go through a review queue before committing.
- Patient info: name, gender, birthdate, address, contact (more fields may be added).
- **Transaction categories:** laboratory (fecalysis, urinalysis, etc.), ultrasound, 3D echo, holter, ECG, and more. Admin can **add more transaction types**.
- One transaction can include **multiple categories/services**.
- Records **paid / unpaid** status.
- Prints a **template receipt** that the patient brings to the specific laboratory.

### 4.2 Laboratory
- Laboratories: urinalysis, fecalysis, CBC, x-ray, ultrasound, 2D echo, holter, ECG.
- Doctors are **assigned per laboratory** and only see patients/transactions for their assigned laboratory.
- The patient hands the receipt to the laboratory; doctors can also see it in the system.
- **Doctors input patient results** into the system.
- **Material usage** per test connects to inventory:
  - Each laboratory has **default material amounts** per test (a "recipe").
  - Each laboratory can set/change its own defaults.
  - The doctor or lab in-charge can override the amount on a specific result.
- **Export** with selection (chosen items or all) and a sort system.

### 4.3 Inventory
- Manages the hospital's stocks and assets, including materials consumed by laboratories.
- **CRUD** of stocks; **add/remove material types**.
- **Trend indicators** per material: rising or falling, out of stock, or full stock. AI is used for trend analysis.
- Stock alerts for low/out-of-stock and incoming stock.
- **Receipt OCR stock-in (supplier/delivery receipts):**
  - Extracts item **name** and quantity.
  - If the item name isn't in inventory yet, the system prompts to create a new material.
  - The OCR quantity is **checked against the physically counted quantity** before being committed; mismatches are flagged.
- Export of overall materials and material types, with sort selection (same style as the laboratory export).

### 4.4 Accounting
- **Expenses only.** The client said income is too complex to include.
- Pulls results and **costs** from cashier, laboratory, and inventory.
- **Master exporter:** one Excel file with all accounting information.
- **Each subsystem also has its own Excel exporter.**

---

## 5. End-to-End Flow

```
Patient arrives
  -> Cashier searches patient by name (new? create; existing? select)
  -> Cashier selects one or more services + payment status
  -> Receipt printed and given to patient
  -> Patient goes to the specific laboratory
  -> Doctor sees the transaction in the system, records results
  -> Materials used are pre-filled from lab defaults (editable)
  -> Inventory stock is deducted automatically
  -> Costs flow into Accounting as expenses
  -> Exports available per system + master export
```

---

## 6. OCR Design (one pipeline, two extractors)

Only one OCR service, in FastAPI, routed by `document_type`:

| Document type | Purpose | Lands in |
|---|---|---|
| `supplier_receipt` | Stock-in for inventory (item name, qty, unit price) | `inventory.stock_receipts_ocr` |
| `patient_list` (written or Excel) | Bulk patient import | `cashier.patient_import_batches` / `patient_import_rows` |

Nothing from OCR auto-commits. Everything goes to a **review queue** first.

Clarification reached during the conversation: there is **no OCR of the patient payment receipt**. The printed patient receipt is normal system *output*, not something scanned.

---

## 7. Receipt Decision

The hospital is **not BIR-accredited**, so the system does **not** issue an Official Receipt. A sample BIR OR was shown as a reference for layout, but all BIR-specific fields were removed to avoid legal issues: no OR numbering, booklet ranges, Authority to Print, or printer accreditation.

The receipt is a plain internal slip: hospital name, patient, itemized services, total, cashier name. It is landscape/horizontal, and handwritten-style is acceptable. `transactions.receipt_no` is an internal sequence only. Revisit if/when the hospital gets accredited.

The client's actual receipt design is still pending.

---

## 8. Project Structure

```
hospital-management-system/
├── backend-node/
│   ├── src/
│   │   ├── config/            # db.js, env.js, jwt.js, redis.js
│   │   ├── modules/
│   │   │   ├── auth/          # login, refresh, logout
│   │   │   ├── users/         # accounts, roles, doctor-laboratory assignment
│   │   │   ├── cashier/       # patients, transactions, receipts, transaction types
│   │   │   ├── laboratory/    # lab tests, results, material-usage defaults
│   │   │   ├── inventory/     # stocks, materials, movements, OCR intake
│   │   │   └── accounting/    # expense aggregation, exports
│   │   │       # each module: routes, controller, service, repository, validation
│   │   ├── middleware/        # auth, rbac, error
│   │   ├── jobs/              # stockAlert.job.js
│   │   ├── integrations/      # fastapiClient.js
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/
│   ├── package.json
│   └── .env.example
│
├── backend-fastapi/
│   ├── app/
│   │   ├── api/               # inventory_trends, ocr, exports, ai_assist
│   │   │                      # (v1/ versioning is optional at this scale)
│   │   ├── core/              # config.py, security.py (verifies Node-issued JWT)
│   │   ├── services/          # trend_analysis, ocr_supplier_receipt,
│   │   │                      # ocr_patient_import, excel_export, ai_summarizer
│   │   ├── schemas/           # Pydantic request/response models
│   │   └── main.py
│   ├── tests/
│   └── requirements.txt
│
├── infra/                     # deployment only, no feature code
│   ├── docker-compose.yml     # postgres, redis, node, fastapi, nginx, frontend
│   ├── nginx/hms.conf         # serves built Vue files + proxies /api and /ai
│   ├── Dockerfile.node
│   ├── Dockerfile.fastapi
│   ├── Dockerfile.frontend    # builds Vue, outputs static files for Nginx
│   ├── .env.example           # deployment-level vars (e.g. VITE_API_BASE_URL)
│   └── deploy.sh
│
├── docs/
├── .gitignore
└── README.md
```

**What `infra/` is:** everything for running and deploying the system, as opposed to feature code. It includes the frontend's *deployment* pieces (Dockerfile, Nginx serving) but not the Vue project's internal structure.

**Why `v1/` in FastAPI:** API versioning convention, so breaking changes can go in `v2/` later. Optional at this scale.

**Node is the gatekeeper:** all JWT issuance happens in Node. FastAPI only verifies the same token (shared secret or key), so it can't be called directly without a valid token.

---

## 9. Docker, Redis, and Remote Access

**Docker (narrow scope):** only used to containerize Node, FastAPI, Postgres, Redis, Nginx, and the built frontend through one `docker-compose.yml`. No orchestration beyond `docker-compose up`.

**Redis (three uses only):**
1. Refresh-token storage (enables instant logout/revocation)
2. Low-stock / incoming-stock notification queue
3. Rate limiting on auth endpoints (brute-force protection)

No caching layer or heavy job queue yet; that is phase 2.

**Remote access**
- The hospital has an on-site server on hospital wifi, but must be reachable from anywhere.
- Developers need remote maintenance access.
- Recommended: a VPN (Tailscale or WireGuard) for dev/maintenance access, so SSH, Postgres, and Redis are never exposed publicly.
- Public app traffic goes through Nginx over HTTPS; only ports 80/443 exposed.

---

## 10. Database Design

Delivered as `schema.sql`. Key design choices:

- **Postgres schemas** per subsystem: `identity`, `cashier`, `laboratory`, `inventory`, `accounting`.
- **UUID primary keys** (`gen_random_uuid()` via `pgcrypto`); prevents guessable ids like `/patients/5`. Only `identity.roles` stays `SERIAL` as a tiny fixed lookup table.
- **Native ENUM types** for small fixed sets (transaction status, stock direction, stock source, OCR status, import status, result status, system name). Open-ended fields (`transaction_types.category`, `patients.gender`) stay `TEXT`.
- `CHECK` constraints on money and quantity fields.
- `NUMERIC(12,2)` for money, `TIMESTAMPTZ` for timestamps, `JSONB` for flexible result data and OCR output.

### Tables by schema

| Schema | Tables |
|---|---|
| `identity` | `users`, `roles`, `user_roles` |
| `cashier` | `patients`, `transaction_types`, `transactions`, `transaction_items`, `patient_import_batches`, `patient_import_rows` |
| `laboratory` | `laboratories`, `doctor_laboratory_assignments`, `lab_material_defaults`, `lab_results`, `lab_result_materials_used` |
| `inventory` | `material_types`, `materials`, `stock_movements`, `stock_receipts_ocr` |
| `accounting` | `expenses`, `export_logs` |

### Notes
- **Creation order matters** because of foreign keys: identity, cashier, inventory (materials), laboratory, remaining inventory, accounting, patient import.
- **Polymorphic references:** `inventory.stock_movements.reference_id` and `accounting.expenses.source_reference_id` intentionally have no real foreign key, since they point to different tables depending on `source` / `source_system`. They will **not** show as lines in the pgAdmin ERD, so annotate them manually.
- pgAdmin 4's ERD Tool draws real foreign keys automatically, including across schemas.
- Adding an ENUM value later is easy; removing or renaming one is painful.

---

## 11. Backend Build Roadmap

1. **Postgres:** done (`schema.sql`).
2. **Node + Express skeleton:** done.
3. **Auth module end-to-end** (register with hashed password, login, issue JWT, verify on a protected route): in progress.
4. **Cashier slice** (patient create + transaction create, tested via Postman/Insomnia, no frontend).
5. Laboratory, then Inventory, then Accounting.
6. FastAPI service (trends, OCR, exports).
7. Docker, Redis, Nginx, deployment.

### Skeleton steps followed
1. `npm init -y`; install `express pg dotenv jsonwebtoken bcrypt cors`, and `nodemon` as a dev dependency.
2. Create `.env` (git-ignored) and `.env.example`: `DATABASE_URL`, `JWT_SECRET`, `PORT`.
3. `config/env.js`: one place that reads env vars.
4. `config/db.js`: one shared `pg` Pool.
5. `app.js`: Express app, `express.json()`, `cors()`, routes, error handler last (exports the app, does not listen).
6. `server.js`: imports the app and calls `listen`.
7. Add a throwaway `/health` route that runs `SELECT NOW()`.
8. `"dev": "nodemon src/server.js"`, run, and verify.

### Error-handling middleware
A 4-parameter Express middleware (`err, req, res, next`) registered **last**, after all routes. It catches errors passed via `next(err)` and returns a consistent JSON response, avoiding repeated try/catch and hanging requests or leaked stack traces.

### Current status
The skeleton is complete with centralized error handling, and the database connection has been verified through the tested `/auth` route. Custom middleware for specific functions is planned next.

---

## 12. AI Usage

- **Inventory trends:** AI-based trend analysis for materials (rising/falling, stock status).
- **AI assistant / summaries** (staff and doctor summaries of assigned patients' information) was part of the original scope and is reserved in the structure (`ai_assist.py`, `ai_summarizer.py`). It was **not re-confirmed** in the latest client meeting; confirm whether it is still wanted.
- The team has not used AI before. The plan is to call an external LLM/ML API from FastAPI rather than building a model, and to build this after the core system works.

---

## 13. Open Items

- [ ] Confirm the roles list with the client (weekdays).
- [ ] Client's actual receipt template (landscape; handwritten option acceptable).
- [ ] Confirm whether the AI patient/doctor summary assistant is still in scope.
- [ ] `accounting.expenses` population: real-time (triggers) vs. scheduled job (nightly).
- [ ] Additional patient fields beyond name, gender, birthdate, address, contact.
- [ ] Revisit BIR-compliant receipts only if the hospital becomes accredited.

---

## 14. Quick Glossary (from Q&A)

- **Node vs FastAPI install:** separate runtimes. `npm install` in `backend-node/`, `pip install -r requirements.txt` in `backend-fastapi/`. They run as separate processes talking over HTTP.
- **Schemas in FastAPI:** Pydantic classes defining the shape of request/response data (validation + auto-generated docs).
- **Postgres vs MySQL:** both relational SQL databases; Postgres is stricter with types and stronger with JSON and complex queries. Use the `pg` driver in Node.
- **Postgres schemas vs FastAPI schemas:** unrelated concepts that share a name. Postgres schemas are namespaces for tables; FastAPI schemas are data-shape classes.
