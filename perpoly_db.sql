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

CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA authentication;
SET search_path TO authentication, cashier, laboratory, inventory, accounting;

-- ------------------------------------------------------------
-- ENUM TYPES (created in the schema that owns the concept)
-- ------------------------------------------------------------

CREATE TYPE authentication.system_name       AS ENUM ('cashier', 'laboratory', 'inventory', 'accounting');

CREATE TYPE cashier.patient_source     AS ENUM ('manual', 'imported');
CREATE TYPE cashier.transaction_status AS ENUM ('paid', 'unpaid');
CREATE TYPE cashier.import_source      AS ENUM ('excel', 'ocr_scan');
CREATE TYPE cashier.import_row_status  AS ENUM ('new', 'duplicate_flagged', 'imported');

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
    full_name           TEXT NOT NULL,
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
    full_name       TEXT NOT NULL,
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
    category    TEXT NOT NULL,                       -- laboratory | ultrasound | 3d_echo | holter | ecg | other
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE cashier.transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_no      TEXT NOT NULL UNIQUE,             -- internal sequence only, NOT a BIR OR number
    patient_id      UUID NOT NULL REFERENCES cashier.patients(id),
    cashier_id      UUID NOT NULL REFERENCES authentication.users(id),
    status          cashier.transaction_status NOT NULL DEFAULT 'unpaid',
    total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
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
-- 8. INDEXES (common lookups — PKs/FKs are already indexed by
--    Postgres for uniqueness, these cover extra query patterns)
-- ------------------------------------------------------------

CREATE INDEX idx_patients_full_name          ON cashier.patients (full_name);
CREATE INDEX idx_transactions_patient        ON cashier.transactions (patient_id);
CREATE INDEX idx_transaction_items_txn       ON cashier.transaction_items (transaction_id);
CREATE INDEX idx_lab_results_laboratory      ON laboratory.lab_results (laboratory_id);
CREATE INDEX idx_lab_results_doctor          ON laboratory.lab_results (doctor_id);
CREATE INDEX idx_stock_movements_material    ON inventory.stock_movements (material_id);
CREATE INDEX idx_expenses_source             ON accounting.expenses (source_system, source_reference_id);