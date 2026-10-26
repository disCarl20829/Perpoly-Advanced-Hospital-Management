-- ============================================================
-- Hospital Management System — PostgreSQL Schema (v2)
-- UUID primary keys, native ENUM types, one Postgres schema
-- per subsystem. Run top to bottom.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS authentication;
CREATE SCHEMA IF NOT EXISTS cashier;
CREATE SCHEMA IF NOT EXISTS laboratory;
CREATE SCHEMA IF NOT EXISTS inventory;
CREATE SCHEMA IF NOT EXISTS accounting;
CREATE SCHEMA IF NOT EXISTS income;

CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA authentication;
SET search_path TO authentication, cashier, laboratory, inventory, accounting, income;

-- ------------------------------------------------------------
-- ENUM TYPES (created in the schema that owns the concept)
-- ------------------------------------------------------------

CREATE TYPE authentication.system_name       AS ENUM ('cashier', 'laboratory', 'inventory', 'accounting');

CREATE TYPE cashier.patient_source     AS ENUM ('manual', 'imported');
CREATE TYPE cashier.transaction_status AS ENUM ('paid', 'unpaid');
CREATE TYPE cashier.import_source      AS ENUM ('excel', 'ocr_scan');
CREATE TYPE cashier.import_row_status  AS ENUM ('new', 'duplicate_flagged', 'imported');
CREATE TYPE cashier.mode_of_payment     AS ENUM ('cash', 'paymaya', 'gotyme', 'gcash', 'credit_card', 'debit_card', 'bank_transfer');

CREATE TYPE laboratory.result_status   AS ENUM ('pending', 'completed');

CREATE TYPE inventory.stock_direction  AS ENUM ('in', 'out');
CREATE TYPE inventory.stock_source     AS ENUM ('purchase', 'lab_usage', 'adjustment', 'ocr_intake');
CREATE TYPE inventory.ocr_status       AS ENUM ('pending_review', 'confirmed', 'mismatch');

CREATE TYPE accounting.export_type     AS ENUM ('per_system', 'master');


-- ------------------------------------------------------------
-- 1. AUTHENTICATION & ACCESS
-- ------------------------------------------------------------

CREATE TABLE authentication.users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    last_name           TEXT NOT NULL,
    first_name          TEXT NOT NULL,
    middle_name         TEXT,
    extra_name          TEXT,
    email               TEXT NOT NULL UNIQUE,
    password_hash       TEXT NOT NULL,
    preferred_system    authentication.system_name,       -- NULL = always show picker
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE authentication.roles (
    id      SERIAL PRIMARY KEY,                     -- small fixed lookup table; int is fine here
    name    TEXT NOT NULL UNIQUE                     -- superadmin, doctor, cashier, lab_tech, inventory_staff, accountant
);

CREATE TABLE authentication.user_roles (
    user_id     UUID NOT NULL REFERENCES authentication.users(id) ON DELETE CASCADE,
    role_id     INT  NOT NULL REFERENCES authentication.roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

INSERT INTO authentication.roles (name) VALUES
    ('superadmin'), ('doctor'), ('cashier'), ('lab_tech'), ('inventory_staff'), ('accountant');


-- ------------------------------------------------------------
-- 2. CASHIER
-- ------------------------------------------------------------

CREATE TABLE cashier.patients (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    last_name       TEXT NOT NULL,
    first_name      TEXT NOT NULL,
    middle_name     TEXT,
    extra_name      TEXT,
    gender          TEXT,
    birthdate       DATE,
    address         TEXT,
    contact_no      TEXT,
    source          cashier.patient_source NOT NULL DEFAULT 'manual',
    created_by      UUID REFERENCES authentication.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cashier.transaction_types (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    category    TEXT NOT NULL,                       -- must match a laboratory.name for lab routing
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

-- Default transaction types. `category` matches a laboratory name so the
-- laboratory can pick up the transaction as a pending test.
INSERT INTO cashier.transaction_types (name, category) VALUES
    ('Urinalysis', 'urinalysis'),
    ('Fecalysis', 'fecalysis'),
    ('CBC', 'CBC'),
    ('X-Ray', 'x-ray'),
    ('Ultrasound', 'ultrasound'),
    ('2D Echo', '2D echo'),
    ('Holter', 'holter'),
    ('ECG', 'ECG');

CREATE TABLE cashier.transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_no      TEXT NOT NULL UNIQUE,             -- internal sequence only, NOT a BIR OR number
    patient_id      UUID NOT NULL REFERENCES cashier.patients(id),
    cashier_id      UUID NOT NULL REFERENCES authentication.users(id),
    status          cashier.transaction_status NOT NULL DEFAULT 'unpaid',
    total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    mode_of_payment cashier.mode_of_payment NOT NULL DEFAULT 'cash',
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cashier.transaction_items (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id          UUID NOT NULL REFERENCES cashier.transactions(id) ON DELETE CASCADE,
    transaction_type_id     UUID NOT NULL REFERENCES cashier.transaction_types(id),
    qty                     INT NOT NULL DEFAULT 1 CHECK (qty > 0),
    unit                    TEXT,
    description             TEXT,
    unit_price              NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    amount                  NUMERIC(12,2) NOT NULL CHECK (amount >= 0)
);

-- Internal receipt numbering (not a BIR OR). Created here for a clean
-- schema run; the API also runs CREATE SEQUENCE IF NOT EXISTS as a safety net.
CREATE SEQUENCE IF NOT EXISTS cashier.receipt_seq START 1;


-- ------------------------------------------------------------
-- 3. INVENTORY (materials created before laboratory, since
--    laboratory tables reference materials)
-- ------------------------------------------------------------

CREATE TABLE inventory.material_types (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name    TEXT NOT NULL UNIQUE
);

CREATE TABLE inventory.materials (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL,
    material_type_id    UUID REFERENCES inventory.material_types(id),
    unit                TEXT,
    current_stock       NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    reorder_threshold   NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (reorder_threshold >= 0)
);


-- ------------------------------------------------------------
-- 4. LABORATORY
-- ------------------------------------------------------------

CREATE TABLE laboratory.laboratories (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name    TEXT NOT NULL UNIQUE       -- urinalysis, fecalysis, CBC, x-ray, ultrasound, 2D echo, holter, ECG
);

-- Default laboratories (matches transaction_types.category below)
INSERT INTO laboratory.laboratories (name) VALUES
    ('urinalysis'), ('fecalysis'), ('CBC'), ('x-ray'),
    ('ultrasound'), ('2D echo'), ('holter'), ('ECG');

CREATE TABLE laboratory.doctor_laboratory_assignments (
    doctor_id       UUID NOT NULL REFERENCES authentication.users(id) ON DELETE CASCADE,
    laboratory_id   UUID NOT NULL REFERENCES laboratory.laboratories(id) ON DELETE CASCADE,
    PRIMARY KEY (doctor_id, laboratory_id)
);

CREATE TABLE laboratory.lab_material_defaults (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    laboratory_id   UUID NOT NULL REFERENCES laboratory.laboratories(id) ON DELETE CASCADE,
    material_id     UUID NOT NULL REFERENCES inventory.materials(id),
    default_qty     NUMERIC(12,2) NOT NULL CHECK (default_qty >= 0),
    UNIQUE (laboratory_id, material_id)
);

CREATE TABLE laboratory.lab_results (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_item_id     UUID NOT NULL REFERENCES cashier.transaction_items(id),
    laboratory_id           UUID NOT NULL REFERENCES laboratory.laboratories(id),
    doctor_id               UUID NOT NULL REFERENCES authentication.users(id),
    result_data             JSONB,
    status                  laboratory.result_status NOT NULL DEFAULT 'pending',
    recorded_at             TIMESTAMPTZ
);

CREATE TABLE laboratory.lab_result_materials_used (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_result_id   UUID NOT NULL REFERENCES laboratory.lab_results(id) ON DELETE CASCADE,
    material_id     UUID NOT NULL REFERENCES inventory.materials(id),
    qty_used        NUMERIC(12,2) NOT NULL CHECK (qty_used >= 0)   -- pre-filled from lab_material_defaults, editable
);


-- ------------------------------------------------------------
-- 5. INVENTORY — remaining tables (depend on laboratory results
--    existing for the polymorphic reference_id on stock_movements)
-- ------------------------------------------------------------

CREATE TABLE inventory.stock_movements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id     UUID NOT NULL REFERENCES inventory.materials(id),
    direction       inventory.stock_direction NOT NULL,
    qty             NUMERIC(12,2) NOT NULL CHECK (qty > 0),
    source          inventory.stock_source NOT NULL,
    reference_id    UUID,                     -- polymorphic: lab_result.id, stock_receipts_ocr.id, etc. (no FK — source decides the table)
    performed_by    UUID REFERENCES authentication.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE inventory.stock_receipts_ocr (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_image_path      TEXT NOT NULL,
    extracted_items     JSONB,                 -- [{ name, qty, unit_price }, ...]
    verified_by         UUID REFERENCES authentication.users(id),
    status              inventory.ocr_status NOT NULL DEFAULT 'pending_review',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ------------------------------------------------------------
-- 6. ACCOUNTING
-- ------------------------------------------------------------

CREATE TABLE accounting.expenses (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_system           authentication.system_name NOT NULL CHECK (source_system IN ('cashier', 'laboratory', 'inventory')),
    source_reference_id     UUID NOT NULL,      -- polymorphic, points into the source_system's tables
    description             TEXT,
    amount                  NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    incurred_at             TIMESTAMPTZ NOT NULL,
    recorded_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE accounting.export_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    export_type     accounting.export_type NOT NULL,
    system          authentication.system_name,       -- NULL when export_type = 'master'
    requested_by    UUID REFERENCES authentication.users(id),
    filters         JSONB,
    file_path       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ------------------------------------------------------------
-- 7. PATIENT IMPORT (Excel / OCR)
-- ------------------------------------------------------------

CREATE TABLE cashier.patient_import_batches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type     cashier.import_source NOT NULL,
    uploaded_by     UUID REFERENCES authentication.users(id),
    raw_file_path   TEXT,
    status          TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'completed')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cashier.patient_import_rows (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id                UUID NOT NULL REFERENCES cashier.patient_import_batches(id) ON DELETE CASCADE,
    raw_data                JSONB NOT NULL,
    matched_patient_id      UUID REFERENCES cashier.patients(id),
    status                  cashier.import_row_status NOT NULL DEFAULT 'new'
);


-- ------------------------------------------------------------
-- 8. INCOME (auto-synced from cashier transactions)
--
-- Every cashier transaction is mirrored here by a trigger. Rows are
-- created/updated automatically — the API never writes to this table.
-- `status` mirrors the transaction (paid / unpaid) so reports can filter.
-- ------------------------------------------------------------

CREATE TABLE income.income_records (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id      UUID NOT NULL UNIQUE REFERENCES cashier.transactions(id) ON DELETE CASCADE,
    receipt_no          TEXT NOT NULL,
    patient_id          UUID REFERENCES cashier.patients(id) ON DELETE SET NULL,
    patient_name        TEXT,                          -- snapshot at time of sale
    cashier_id          UUID REFERENCES authentication.users(id) ON DELETE SET NULL,
    cashier_name        TEXT,                          -- snapshot at time of sale
    amount              NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    mode_of_payment     cashier.mode_of_payment NOT NULL DEFAULT 'cash',
    status              cashier.transaction_status NOT NULL,
    issued_at           TIMESTAMPTZ NOT NULL,          -- when the sale happened
    recorded_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Keep income_records in sync with cashier.transactions.
CREATE OR REPLACE FUNCTION income.sync_income_record()
RETURNS TRIGGER AS $$
DECLARE
    v_patient_name TEXT;
    v_cashier_name TEXT;
BEGIN
    SELECT TRIM(CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name))
      INTO v_patient_name
      FROM cashier.patients p
     WHERE p.id = NEW.patient_id;

    SELECT TRIM(CONCAT_WS(' ', u.first_name, u.middle_name, u.last_name))
      INTO v_cashier_name
      FROM authentication.users u
     WHERE u.id = NEW.cashier_id;

    INSERT INTO income.income_records (
        transaction_id, receipt_no, patient_id, patient_name,
        cashier_id, cashier_name, amount, mode_of_payment, status, issued_at
    ) VALUES (
        NEW.id, NEW.receipt_no, NEW.patient_id, v_patient_name,
        NEW.cashier_id, v_cashier_name, NEW.total_amount, NEW.mode_of_payment, NEW.status, NEW.issued_at
    )
    ON CONFLICT (transaction_id) DO UPDATE SET
        receipt_no      = EXCLUDED.receipt_no,
        patient_id      = EXCLUDED.patient_id,
        patient_name    = EXCLUDED.patient_name,
        cashier_id      = EXCLUDED.cashier_id,
        cashier_name    = EXCLUDED.cashier_name,
        amount          = EXCLUDED.amount,
        mode_of_payment = EXCLUDED.mode_of_payment,
        status          = EXCLUDED.status,
        issued_at       = EXCLUDED.issued_at,
        updated_at      = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cashier_transactions_income
AFTER INSERT OR UPDATE
ON cashier.transactions
FOR EACH ROW EXECUTE FUNCTION income.sync_income_record();

-- Backfill transactions that existed before this module was added.
INSERT INTO income.income_records (
    transaction_id, receipt_no, patient_id, patient_name,
    cashier_id, cashier_name, amount, mode_of_payment, status, issued_at
)
SELECT
    t.id, t.receipt_no, t.patient_id,
    TRIM(CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name)),
    t.cashier_id,
    TRIM(CONCAT_WS(' ', u.first_name, u.middle_name, u.last_name)),
    t.total_amount, t.mode_of_payment, t.status, t.issued_at
FROM cashier.transactions t
LEFT JOIN cashier.patients p ON p.id = t.patient_id
LEFT JOIN authentication.users u ON u.id = t.cashier_id
ON CONFLICT (transaction_id) DO NOTHING;


-- ------------------------------------------------------------
-- 9. INDEXES (common lookups — PKs/FKs are already indexed by
--    Postgres for uniqueness, these cover extra query patterns)
-- ------------------------------------------------------------

CREATE INDEX idx_patients_last_name          ON cashier.patients (last_name);
CREATE INDEX idx_patients_first_name         ON cashier.patients (first_name);
CREATE INDEX idx_transactions_patient        ON cashier.transactions (patient_id);
CREATE INDEX idx_transaction_items_txn       ON cashier.transaction_items (transaction_id);
CREATE INDEX idx_lab_results_laboratory      ON laboratory.lab_results (laboratory_id);
CREATE INDEX idx_lab_results_doctor          ON laboratory.lab_results (doctor_id);
CREATE INDEX idx_stock_movements_material    ON inventory.stock_movements (material_id);
CREATE INDEX idx_expenses_source             ON accounting.expenses (source_system, source_reference_id);
CREATE INDEX idx_income_issued_at            ON income.income_records (issued_at);
CREATE INDEX idx_income_status               ON income.income_records (status);
CREATE INDEX idx_income_mode_of_payment      ON income.income_records (mode_of_payment);