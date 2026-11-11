# Changelog

All notable changes to **PerPoly — Hospital Management System** are documented in
this file. The format is based on [Keep a Changelog](https://keepachangelog.com/).

---

## [Unreleased] — 2026-10-28

### Added

#### Senior citizen discount
- `cashier.patients.is_senior` flag, shown as a **Senior citizen** checkbox in
  the Cashier patient form and as a badge in patient/transaction lists.
- New single-row `cashier.settings` table with `senior_discount_rate`
  (default **20.00%**). Editable on the **Settings** page.
- New endpoints:
  - `GET /settings/senior-discount`
  - `PUT /settings/senior-discount` — `{ senior_discount_rate }`
- Transactions now snapshot `is_senior`, `subtotal`, `discount_rate`, and
  `discount_amount`. `total_amount` is the **net** amount after the discount.
- The income trigger mirrors the discount fields into `income.income_records`,
  so income reports and the Cashier stay in sync.
- Editing transaction items recalculates the subtotal and reapplies the
  transaction's original discount rate.
- Excel patient names are prefixed with `✓` for senior citizens.

#### Client-format daily sales report
- Replaced the old Summary + Details workbook with the layout from the client
  sample: company title/address, `DAILY SALES REPORT-REGULAR`, fixed examination
  columns, `OTHERS`, `TOTAL`, orange column-totals row, left summary, and
  department summary.
- **No taxable income or output tax** — only the total is shown.
- `OTHERS` aggregates examinations that are not in the sample's fixed columns
  (including X-Ray and Holter). A second **Other Tests** sheet itemizes them.
- Senior discounts are allocated across the ledger amounts, so each row's
  examination columns sum to its net `TOTAL`.
- **One sheet per day.** Weekly/monthly exports add a **Summary** sheet with
  daily and department totals.
- Default range when dates are blank (Asia/Manila): daily = today, weekly =
  this week (Monday start), monthly = this month.
- Invoice number column uses the numeric suffix of `receipt_no`
  (for example `RCPT-20261027-000005` → `5`). The final client invoice format
  can replace this later.
- The PACKAGE (Employment) summary row is reserved and currently `₱0.00`
  because the client has not provided package examinations. Deposits are not
  tracked and `TOTAL DEPOSIT` is `₱0.00`.

### Changed
- `POST /cashier/patients` and `PUT /cashier/patients/:id` accept `is_senior`.
- `PUT /cashier/patients/:id` now performs a true partial update.
- Cashier transaction creation computes the discount on the server; the
  frontend discount preview is informational only.

---

## [Unreleased] — 2026-10-27

### Added

#### Income module
- New `income` PostgreSQL schema with `income.income_records`.
- **Database trigger** (`trg_cashier_transactions_income`) that mirrors every
  `cashier.transactions` row into `income.income_records` on insert/update, and
  backfills historical transactions.
- Automatic sync of `receipt_no`, patient, cashier, `amount`, `mode_of_payment`,
  `status`, and `issued_at` — the API never writes to the income table directly.
- Backend module `src/modules/income/` (`repository`, `service`, `controller`,
  `routes`, `validation`).
- Endpoints:
  - `GET /income` — list records (filter by `status`, `mode_of_payment`, `from`, `to`).
  - `GET /income/summary?period=daily|weekly|monthly` — grouped totals, grand
    totals, and mode-of-payment breakdown.
  - `GET /income/export?period=...` — `.xlsx` download with **Summary** and
    **Details** sheets.
- Excel generation via **exceljs** (Node), isolated in `service.js` so the
  planned FastAPI exporter can replace it later.
- Local-time reporting for `Asia/Manila`; weekly groups start on Monday.
- React **Income** page: daily/weekly/monthly toggle, status filter (defaults to
  **Paid**), mode filter, date range, summary cards, grouped totals, mode
  breakdown, records table, and an **Export Excel** button.
- Income navigation is available to **all authenticated users**.

#### Cashier editing
- **Mode of payment** selector on the New Transaction form, and a **Mode**
  column on Recent Transactions.
- **Edit Transaction** panel: change payment status, mode of payment, item
  quantity, and item unit price; add or remove items. The total is recalculated
  live and saved back to the transaction.
- New `PUT /cashier/transactions/:id` for `status` and/or `mode_of_payment`.
- New `POST /cashier/transactions/:id/items` to append an item.
- React Cashier page now sends `mode_of_payment` when creating a transaction.

#### Price list & Settings
- Added `default_price` (`NUMERIC(12,2)`, non-negative) and `notes` to
  `cashier.transaction_types`, and `is_active` to `laboratory.laboratories`.
- Seeded **104 examinations** from the June 1, 2026 price list:
  - **Laboratory** — 39 tests (7 send-out tests start at ₱0 with a
    “Send-out test (charge varies)” note).
  - **Ultrasound** — 24 tests.
  - **X-Ray** — 39 tests.
  - **Holter** and **ECG** kept as departments with a “Set price in Settings”
    note.
- Old one-test departments (`urinalysis`, `fecalysis`, `CBC`, `x-ray`,
  `ultrasound`, `2D echo`) and their transaction types are **deactivated**, not
  deleted, so historical results and transactions remain intact.
- New Settings module `/settings` (superadmin, cashier, lab_tech, accountant):
  - `GET/POST/PUT/DELETE /settings/departments`
  - `GET/POST/PUT/DELETE /settings/tests`
  - Renaming a department cascades to its test categories.
  - Deleting a department/test that is in use **deactivates** it instead.
- React **Settings** page with department CRUD, examination CRUD, default
  prices, notes, active toggles, filters, and a “show inactive legacy
  departments” switch.
- Cashier examination picker replaced the `<select>` with **department tabs,
  a live search box, and price buttons**. Selecting a test pre-fills its
  `default_price` (still editable) and shows its note.
- New `price_list_migration.sql` applies the restructure to existing databases
  without re-running `perpoly_db.sql`.

### Changed
- Cashier item mutations are now atomic: each add/update/remove runs in a
  database transaction, sets `amount = qty × unit_price`, and recalculates the
  parent `total_amount`.
- Recalculating `total_amount` fires the income trigger, so the income record
  stays in sync whenever a cashier edits a transaction.

### Fixed
- `PUT /cashier/transactions/:id/items` and
  `DELETE /cashier/transactions/:id/items/:itemId` had mismatched controller /
  service / repository signatures and could not update items correctly.
- Item edits no longer leave `transactions.total_amount` (and therefore income)
  stale.

### Security / validation
- Reject unknown `mode_of_payment` values on create and update.
- Reject an empty transaction edit (no `status` or `mode_of_payment`).
- A transaction must keep at least one item.
- Items referenced by a laboratory result cannot be removed (`409`).

### Database
- `perpoly_db.sql` updated with the `income` schema, table, trigger, backfill,
  and indexes, plus `income` added to `search_path`.
- New `income_migration.sql` — idempotent migration for existing databases. It
  also applies the `cashier.mode_of_payment` enum/column if missing.

---

## [2026-10-21] — Initial presentation prototype

### Added
- JWT authentication (access + refresh tokens) and role-based access control.
- Users module: account creation (superadmin only), profiles, roles, status, and
  doctor–laboratory assignments.
- Cashier module: patients (split names), transaction types, transactions,
  transaction items, and receipt numbering.
- Laboratory module: laboratories, material defaults, lab results, and pending
  transactions.
- Inventory module: material types, materials, stock movements, OCR receipt
  intake, and stock status/alerts.
- Accounting module: expenses, aggregated reports, and export logs.
- Cross-module atomic transaction: recording a lab result deducts inventory
  stock in the same database transaction.
- React + Vite frontend prototype for all subsystems, themed from the PerPoly
  logo (deep blue + green).
