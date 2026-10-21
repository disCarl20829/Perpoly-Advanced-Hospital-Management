# PerPoly — Hospital Management System

A hospital management system with four subsystems: **Cashier**, **Laboratory**,
**Inventory**, and **Accounting**.

- **Backend:** Node.js + Express (main API), PostgreSQL
- **Frontend:** React + Vite (prototype)
- **Auth:** bcrypt password hashing + JWT (access + refresh tokens)
- **RBAC:** role-based access on every API route

```
PerPoly/
├── backend-node/     Express API + PostgreSQL (pg)
├── frontend/         React + Vite prototype
├── perpoly_db.sql    full database schema (run in PostgreSQL)
└── hms-project-summary.md
```

---

## Prerequisites

- Node.js 18+ (tested on v22)
- PostgreSQL 14+
- npm

---

## 1. Database

Create the database, then run the schema:

```bash
createdb perpoly          # or create it in pgAdmin
psql -d perpoly -f perpoly_db.sql
```

The schema creates the `authentication`, `cashier`, `laboratory`, `inventory`, and
`accounting` schemas, all tables, and seed data (roles, laboratories, transaction types).

---

## 2. Backend

```bash
cd backend-node
cp .env.example .env       # then edit DATABASE_URL / JWT_SECRET
npm install
```

Create the first superadmin (the only role allowed to create other accounts):

```bash
node scripts/seed-admin.mjs
```

Seed the default laboratories and transaction types:

```bash
node scripts/seed-defaults.mjs
```

Run:

```bash
npm run dev                # http://localhost:3000
```

### Backend structure

```
src/
├── config/          env.js, db.js, jwt.js
├── middleware/      auth.middleware.js, rbac.middleware.js, error.middleware.js
├── modules/
│   ├── auth/        login, refresh, register, logout
│   ├── users/       accounts, roles, doctor–laboratory assignments
│   ├── cashier/     patients, transaction types, transactions, receipts
│   ├── laboratory/  labs, results, material-usage defaults
│   ├── inventory/   materials, stock movements, OCR receipt intake
│   └── accounting/  expenses, reports, export logs
├── app.js
└── server.js
```

Each module follows `routes → controller → service → repository → validation`.

---

## 3. Frontend

```bash
cd frontend
npm install
npm run dev                # http://localhost:5173
```

The dev server proxies `/api/*` to `http://localhost:3000`, so start the backend first.

**Demo login**

```
Email:    superadmin@perpoly.local
Password: SuperAdmin123!
```

---

## Demo flow

1. **Sign in** as superadmin.
2. **Users** → create accounts for a cashier, doctor, lab tech, inventory staff, and accountant.
3. **Cashier** → search/create a patient, add services, create a transaction (receipt).
4. **Laboratory** → pick a lab, record a result for a pending test. Material usage is
   pre-filled from the lab's defaults and **deducts inventory stock automatically**.
5. **Inventory** → view stock status, record stock movements, confirm OCR supplier receipts.
6. **Accounting** → record expenses, view the aggregated report and export history.

---

## Notes

- **Transactions are atomic.** Creating a lab result and deducting the materials from
  inventory happen in a single database transaction — if either fails, both roll back.
- **Refresh tokens** keep users signed in without re-entering credentials. The client
  calls `POST /auth/refresh` when an access token expires.
- **Roles:** `superadmin`, `doctor`, `cashier`, `lab_tech`, `inventory_staff`, `accountant`.
