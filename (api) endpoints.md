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
| `POST` | `/cashier/patients` | `{ last_name, first_name, middle_name?, extra_name?, gender?, birthdate?, address?, contact_no? }` |
| `GET` | `/cashier/patients/search` | `?name=<text>` |
| `GET` | `/cashier/patients` | List all |
| `GET` | `/cashier/patients/:id` | Single patient |
| `PUT` | `/cashier/patients/:id` | Editable patient fields |
| `DELETE` | `/cashier/patients/:id` | Delete patient |

### Transaction types

| Method | Path | Body |
|--------|------|------|
| `POST` | `/cashier/transaction-types` | `{ name, category }` |
| `GET` | `/cashier/transaction-types` | List all |
| `GET` | `/cashier/transaction-types/:id` | Single |
| `PUT` | `/cashier/transaction-types/:id` | `{ name, category }` |
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
| `GET` | `/laboratory/results/:id` | doctor, lab_tech, superadmin | Single result |
| `GET` | `/laboratory/laboratories/:laboratory_id/pending` | doctor, lab_tech, superadmin | Pending tests for a lab |

Recording a result deducts `materials_used` from inventory in the **same**
database transaction.

---

## Inventory — `/inventory`

Access: **inventory_staff** or **superadmin** for every route.

| Method | Path | Body |
|--------|------|------|
| `POST` | `/inventory/material-types` | `{ name }` |
| `GET` | `/inventory/material-types` | List all |
| `POST` | `/inventory/materials` | `{ name, material_type_id, unit, current_stock?, reorder_threshold? }` |
| `GET` | `/inventory/materials` | List all |
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
| `POST` | `/accounting/exports/master` | `{ from, to, file_path? }` |
| `POST` | `/accounting/exports/system` | `{ system: "cashier"\|"laboratory"\|"inventory", from, to, file_path? }` |
| `GET` | `/accounting/exports/logs` | Export history |

---

## Income — `/income`

Access: **any authenticated user**.

| Method | Path | Query / Notes |
|--------|------|---------------|
| `GET` | `/income` | `?status=paid\|unpaid&mode_of_payment=<mode>&from=YYYY-MM-DD&to=YYYY-MM-DD` |
| `GET` | `/income/summary` | `?period=daily\|weekly\|monthly&status=&mode_of_payment=&from=&to=` |
| `GET` | `/income/export` | Same filters as `/income/summary`; returns an `.xlsx` file |

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
