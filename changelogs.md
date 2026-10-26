# Changelog

All notable changes to **PerPoly — Hospital Management System** are documented in
this file. The format is based on [Keep a Changelog](https://keepachangelog.com/).

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
