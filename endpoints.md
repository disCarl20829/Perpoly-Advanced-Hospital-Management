# PerPoly — API Endpoints

Base URL: `http://localhost:3000`

The React app calls the API through the Vite proxy at `/api/*`, e.g.
`/api/income` → `http://localhost:3000/income`.

---

## Conventions

### Authentication

Send the access token on every protected request:

```http
Authorization: Bearer <accessToken>
```

- Access token: **15 minutes**
- Refresh token: **7 days** (`POST /auth/refresh`)

### Success responses

Each module returns its own payload key, for example:

```json
{ "transactions": [] }
{ "income": [] }
{ "message": "Transaction updated", "transaction": {} }
```

### Error responses

All errors go through the central error handler:

```json
{ "message": "Human-readable error" }
```

| Status | Meaning |
|--------|---------|
| `400` | Validation error / invalid input |
| `401` | Missing or invalid access token |
| `403` | Authenticated but insufficient role |
| `404` | Resource not found |
| `409` | Conflict (e.g. item protected by a lab result) |
| `500` | Internal server error |

### Roles

`superadmin`, `doctor`, `cashier`, `lab_tech`, `inventory_staff`, `accountant`

---

## Auth — `/auth`

| Method | Path | Access | Body / Notes |
|--------|------|--------|--------------|
| `POST` | `/auth/login` | Public | `{ email, password }` |
| `POST` | `/auth/refresh` | Public | `{ refreshToken }` |
| `POST` | `/auth/register` | superadmin | `{ last_name, first_name, middle_name?, extra_name?, email, password, roles[] }` |
| `POST` | `/auth/logout` | Authenticated | Invalidates the session |

---

## Users — `/user`

| Method | Path | Access | Body / Notes |
|--------|------|--------|--------------|
| `GET` | `/user` | Any authenticated | List accounts |
| `GET` | `/user/roles` | Any authenticated | List roles |
| `GET` | `/user/laboratories` | Any authenticated | List laboratories |
| `GET` | `/user/:id` | Any authenticated | Single account |
| `PUT` | `/user/:id` | superadmin | `{ last_name, first_name, middle_name, extra_name, email, preferred_system? }` |
| `PUT` | `/user/:id/status` | superadmin | `{ is_active: boolean }` |
| `PUT` | `/user/:id/roles` | superadmin | `{ roles: string[] }` |
| `GET` | `/user/:id/laboratories` | superadmin | Doctor–laboratory assignments |
| `PUT` | `/user/:id/laboratories` | superadmin | `{ laboratory_ids: uuid[] }` |

---

## Cashier — `/cashier`

Access: **cashier** or **superadmin** for every route.

### Patients

| Method | Path | Body / Query |
|--------|------|--------------|
| `POST` | `/cashier/patients` | `{ last_name, first_name, middle_name?, extra_name?, gender?, birthdate?, address?, contact_no?, is_senior? }` |
| `GET` | `/cashier/patients/search` | `?name=<text>` |
| `GET` | `/cashier/patients` | List all |
| `GET` | `/cashier/patients/:id` | Single patient |
| `PUT` | `/cashier/patients/:id` | Partial: editable patient fields, including `is_senior` |
| `DELETE` | `/cashier/patients/:id` | Delete patient |

### Transaction types

| Method | Path | Body |
|--------|------|------|
| `POST` | `/cashier/transaction-types` | `{ name, category, default_price?, notes?, is_active? }` |
| `GET` | `/cashier/transaction-types` | List all; optional `?active=true\|false&category=<name>` |
| `GET` | `/cashier/transaction-types/:id` | Single |
| `PUT` | `/cashier/transaction-types/:id` | Partial: `{ name?, category?, default_price?, notes?, is_active? }` |
| `DELETE` | `/cashier/transaction-types/:id` | Delete |

### Transactions

| Method | Path | Body / Notes |
|--------|------|--------------|
| `POST` | `/cashier/transactions` | `{ patient_id, status: "paid"\|"unpaid", mode_of_payment?, items: [{ transaction_type_id, qty, unit_price }] }` |
| `GET` | `/cashier/transactions` | List all (newest first) |
| `GET` | `/cashier/transactions/:id` | Transaction **with items** |
| `PUT` | `/cashier/transactions/:id/status` | `{ status: "paid"\|"unpaid" }` |
| `PUT` | `/cashier/transactions/:id` | `{ status?, mode_of_payment? }` — at least one required |
| `DELETE` | `/cashier/transactions/:id` | Delete transaction |
| `POST` | `/cashier/transactions/:id/items` | `{ transaction_type_id, qty, unit_price }` |
| `PUT` | `/cashier/transactions/:id/items/:itemId` | `{ qty?, unit_price?, transaction_type_id? }` — at least one |
| `DELETE` | `/cashier/transactions/:id/items/:itemId` | Cannot remove the last item; lab-linked items return `409` |

**Mode of payment values:** `cash`, `paymaya`, `gotyme`, `gcash`, `credit_card`,
`debit_card`, `bank_transfer`.

Adding, updating, or removing an item recalculates `transactions.total_amount`
and automatically updates the matching **income** record.

Transaction responses include `subtotal`, `discount_rate`, `discount_amount`,
`total_amount` (net after discount), and `is_senior`. The discount is applied
server-side when the patient is marked as a senior citizen.

### Patient import review queue

Bulk imports never create patients immediately. Every file or row set is stored
as a **batch** with row-level validation and duplicate flags for review.

| Method | Path | Body / Notes |
|--------|------|--------------|
| `POST` | `/cashier/patient-imports` | Multipart field `file` (`.xlsx`, max 10 MB) **or** JSON `{ source_type?, rows[] }` |
| `GET` | `/cashier/patient-imports` | List batches with `total_rows`, `new_rows`, `duplicate_rows`, `imported_rows` |
| `GET` | `/cashier/patient-imports/:id` | Batch with its review rows |
| `PUT` | `/cashier/patient-imports/:id/rows/:rowId` | `{ raw_data?, matched_patient_id? }` or direct patient fields; re-checks duplicates |
| `POST` | `/cashier/patient-imports/:id/commit` | `{ rows?: [{ row_id, action: "create"\|"link" }] }` |

**Excel columns:** the first row is the header. Use either separate `last_name`
and `first_name` columns, or a single `name` column in
`LAST, FIRST MIDDLE EXTRA` format. Common aliases are accepted (for example
`Last Name`, `Surname`, `Birthdate`, `Date of Birth`, `Contact No.`, `Mobile
Number`, `Senior Citizen`). Optional columns: `middle_name`, `extra_name`,
`gender`, `birthdate`, `address`, `contact_no`, and `is_senior`.

**Values:** birthdates may be Excel date cells, `YYYY-MM-DD`, `MM/DD/YYYY`, or
`DD/MM/YYYY` when unambiguous. Senior flags accept `true/false`, `yes/no`,
`1/0`, and `senior`. A single import is limited to **5,000 rows**.

**Review behavior:**
- Rows with missing names or invalid values stay in the queue with
  `validation_errors` and cannot be committed until corrected.
- Duplicate rows are flagged when the normalized name matches an existing
  patient with the same birthdate or contact number, or when the same person
  appears twice in the file (`_duplicate_of_row_number`).
- `action: "create"` creates a new patient from the row.
- `action: "link"` links the row to its `matched_patient_id` without creating a
  duplicate patient.
- Omitting `rows` (or sending an empty array) imports every valid `new` row;
  invalid rows are listed in `skipped_invalid` and stay pending for correction.
  Duplicate rows also stay pending until explicitly resolved.
- A batch is marked `completed` when every row is imported.
- `source_type` accepts `excel` (default) or `ocr_scan`; OCR extraction will feed
  the same review queue later.

Committed patients use `source = "imported"` and record the reviewer in
`created_by`. The patient, row-status updates, and batch status share one
database transaction.

---

## Settings — `/settings`

Access: **superadmin**, **cashier**, **lab_tech**, **accountant**
(everyone except `doctor` and `inventory_staff`).

### Cashier settings

| Method | Path | Body / Notes |
|--------|------|--------------|
| `GET` | `/settings/senior-discount` | Returns `{ seniorDiscountRate }` |
| `PUT` | `/settings/senior-discount` | `{ senior_discount_rate: 0..100 }` — applies to **new** senior transactions; existing transactions keep their original rate |

### Departments

| Method | Path | Body / Notes |
|--------|------|--------------|
| `GET` | `/settings/departments` | List departments with active/total test counts |
| `POST` | `/settings/departments` | `{ name, is_active? }` |
| `PUT` | `/settings/departments/:id` | `{ name?, is_active? }` |
| `DELETE` | `/settings/departments/:id` | Deletes when unused; otherwise deactivates |

Renaming a department cascades to `transaction_types.category`, so laboratory
routing keeps working. Deactivating a department also deactivates its tests.

### Examinations (tests)

| Method | Path | Body / Notes |
|--------|------|--------------|
| `GET` | `/settings/tests` | Optional `?active=true\|false&category=<name>&search=<text>` |
| `POST` | `/settings/tests` | `{ name, category, default_price?, notes?, is_active? }` |
| `PUT` | `/settings/tests/:id` | Partial: `{ name?, category?, default_price?, notes?, is_active? }` |
| `DELETE` | `/settings/tests/:id` | Deletes when unused; otherwise deactivates |

`default_price` is the cashier's pre-filled price; the cashier can still edit the
unit price on a transaction. Tests with `notes = "Send-out test (charge varies)"`
start at `₱0.00` so the cashier can enter the actual amount.

---

## Laboratory — `/laboratory`

| Method | Path | Access | Body / Notes |
|--------|------|--------|--------------|
| `GET` | `/laboratory/laboratories` | Any authenticated | List laboratories |
| `GET` | `/laboratory/laboratories/:id` | Any authenticated | Single laboratory |
| `GET` | `/laboratory/laboratories/:laboratory_id/defaults` | doctor, lab_tech, superadmin | Material usage defaults |
| `PUT` | `/laboratory/laboratories/:laboratory_id/defaults/:material_id` | doctor, lab_tech, superadmin | `{ default_qty }` |
| `DELETE` | `/laboratory/laboratories/:laboratory_id/defaults/:material_id` | doctor, lab_tech, superadmin | Remove default |
| `POST` | `/laboratory/results` | doctor, lab_tech, superadmin | `{ transaction_item_id, laboratory_id, result_data, materials_used[] }` |
| `GET` | `/laboratory/laboratories/:laboratory_id/results` | doctor, lab_tech, superadmin | Results by lab |
| `GET` | `/laboratory/doctors/:doctor_id/results` | doctor, lab_tech, superadmin | Results by doctor |
| `GET` | `/laboratory/results/export` | doctor, lab_tech, superadmin | Excel export; query: `?laboratory_id=&doctor_id=&from=&to=&ids=&status=&sort=&order=` |
| `GET` | `/laboratory/results/:id` | doctor, lab_tech, superadmin | Single result |
| `GET` | `/laboratory/laboratories/:laboratory_id/pending` | doctor, lab_tech, superadmin | Pending tests for a lab |

Recording a result deducts `materials_used` from inventory in the **same**
database transaction.

`GET /laboratory/results/export` returns an `.xlsx` workbook with **Lab Results**
and **Materials Used** sheets. `ids` is a comma-separated list for exporting
selected rows; omit it to export every matching result. `sort` accepts
`recorded_at`, `patient`, `examination`, `laboratory`, `doctor`, `status`, or
`receipt_no`; `order` accepts `asc` or `desc`. Dates are interpreted in
**Asia/Manila**.

---

## Inventory — `/inventory`

Access: **inventory_staff** or **superadmin** for every route.

| Method | Path | Body |
|--------|------|------|
| `POST` | `/inventory/material-types` | `{ name }` |
| `GET` | `/inventory/material-types` | List all |
| `GET` | `/inventory/material-types/export` | Excel export; query: `?sort=&order=` |
| `POST` | `/inventory/materials` | `{ name, material_type_id, unit, current_stock?, reorder_threshold? }` |
| `GET` | `/inventory/materials` | List all |
| `GET` | `/inventory/materials/export` | Excel export; query: `?material_type_id=&status=&sort=&order=` |
| `GET` | `/inventory/materials/:id` | Single |
| `PUT` | `/inventory/materials/:id` | `{ name, material_type_id, unit, reorder_threshold }` |
| `POST` | `/inventory/stock-movements` | `{ material_id, direction, qty, source, reference_id }` |
| `GET` | `/inventory/stock-movements` | List all |
| `GET` | `/inventory/materials/:id/stock-movements` | Movements for one material |
| `POST` | `/inventory/stock-receipts` | `{ raw_image_path, extracted_items }` (OCR intake) |
| `GET` | `/inventory/stock-receipts` | List OCR receipts |
| `GET` | `/inventory/stock-receipts/:id` | Single OCR receipt |
| `PUT` | `/inventory/stock-receipts/:id/confirm` | Confirm and apply stock |
| `PUT` | `/inventory/stock-receipts/:id/mismatch` | Flag as mismatch |
| `GET` | `/inventory/stock-status` | Stock levels / low-stock alerts |
| `GET` | `/inventory/incoming-stock` | Pending OCR receipts |

`/inventory/materials/export` supports `status=ok|low_stock|out_of_stock`.
`sort` accepts `name`, `type`, `stock`, `threshold`, or `status`; `order`
accepts `asc` or `desc`. The material-types export supports
`sort=name|materials|stock|low|out`.

---

## Accounting — `/accounting`

Access: **accountant** or **superadmin** for every route.

| Method | Path | Body / Query |
|--------|------|--------------|
| `POST` | `/accounting/expenses` | `{ source_system, source_reference_id, description, amount, incurred_at }` |
| `GET` | `/accounting/expenses` | `?source_system=&from=&to=` |
| `GET` | `/accounting/expenses/summary` | `?from=&to=` |
| `GET` | `/accounting/expenses/:id` | Single expense |
| `GET` | `/accounting/reports` | `?from=&to=` — aggregated report |
| `POST` | `/accounting/exports/master` | `{ from, to, file_path? }` — manual export log |
| `POST` | `/accounting/exports/system` | `{ system: "cashier"\|"laboratory"\|"inventory", from, to, file_path? }` — manual export log |
| `GET` | `/accounting/exports/master` | `.xlsx` download; query: `?from=&to=` |
| `GET` | `/accounting/exports/system/:system` | `.xlsx` download; `system` = `cashier`, `laboratory`, or `inventory` |
| `GET` | `/accounting/exports/logs` | Export history |

`GET /accounting/exports/master` creates a workbook with **Summary**,
**Cashier Transactions**, **Lab Results**, **Inventory Movements**, and
**Expenses** sheets. The per-system export contains a summary, that system's
data, and its related expenses. Every generated file is recorded in
`accounting.export_logs`. Dates are interpreted in **Asia/Manila**.

---

## Income — `/income`

Access: **any authenticated user**.

| Method | Path | Query / Notes |
|--------|------|---------------|
| `GET` | `/income` | `?status=paid\|unpaid&mode_of_payment=<mode>&from=YYYY-MM-DD&to=YYYY-MM-DD` |
| `GET` | `/income/summary` | `?period=daily\|weekly\|monthly&status=&mode_of_payment=&from=&to=` |
| `GET` | `/income/export` | Same filters as `/income/summary`; returns the client-format `.xlsx` workbook |

`/income/export` produces:

- **Daily** — one worksheet in the client layout.
- **Weekly / monthly** — one worksheet per day with sales, plus a **Summary**
  worksheet and an **Other Tests** worksheet.

Blank dates default to **Asia/Manila** today for daily, the current Monday–today
week for weekly, and the first of the current month–today for monthly.

Income records include `subtotal`, `discount_rate`, `discount_amount`, and
`is_senior` in addition to `amount` (the net amount after discount).

### `GET /income/summary` response

```json
{
  "summary": {
    "period": "weekly",
    "filters": { "status": "paid", "mode_of_payment": null, "from": null, "to": null },
    "totals": { "count": 12, "total": "15450.00" },
    "groups": [
      { "period_start": "2026-10-19", "count": 5, "total": "6250.00" }
    ],
    "by_mode": [
      { "mode_of_payment": "cash", "count": 8, "total": "10150.00" }
    ]
  }
}
```

- Dates are interpreted in **Asia/Manila**.
- `weekly` groups start on **Monday**.
- `details` come from `GET /income`.

### `GET /income/export`

Returns
`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` with:

- **Summary** sheet — grand totals, grouped totals, and mode breakdown.
- **Details** sheet — one row per income record, plus a total row.

> Income rows are written by a database trigger, not by the API. Any change to a
> cashier transaction (items, amount, status, or mode of payment) is reflected in
> the income module automatically.
