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
    is_senior       BOOLEAN NOT NULL DEFAULT FALSE,
    source          cashier.patient_source NOT NULL DEFAULT 'manual',
    created_by      UUID REFERENCES authentication.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Single-row cashier settings. The senior discount is a percentage
-- applied to the transaction subtotal when the patient is a senior.
CREATE TABLE cashier.settings (
    id                      BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
    senior_discount_rate    NUMERIC(5,2) NOT NULL DEFAULT 20.00
                            CHECK (senior_discount_rate >= 0 AND senior_discount_rate <= 100),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by              UUID REFERENCES authentication.users(id) ON DELETE SET NULL
);

INSERT INTO cashier.settings (id) VALUES (TRUE);

CREATE TABLE cashier.transaction_types (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    category        TEXT NOT NULL,                   -- must match a laboratory.name for lab routing
    default_price   NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (default_price >= 0),
    notes           TEXT,                            -- e.g. "Send-out test (charge varies)"
    is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

-- Default examination types, grouped by department. `category` matches a
-- laboratory name so the laboratory can pick up the transaction as a pending
-- test. Prices are from the June 1, 2026 price list. Send-out tests have a
-- 0 default price and a "charge varies" note; the cashier enters the amount.
INSERT INTO cashier.transaction_types (name, category, default_price, notes, is_active) VALUES
    ('ALBUMIN', 'Laboratory', 0, 'Send-out test (charge varies)', TRUE),
    ('ALK. PHOSPHATE', 'Laboratory', 0, 'Send-out test (charge varies)', TRUE),
    ('APTT', 'Laboratory', 0, 'Send-out test (charge varies)', TRUE),
    ('BETA HCG', 'Laboratory', 0, 'Send-out test (charge varies)', TRUE),
    ('BT', 'Laboratory', 120, NULL, TRUE),
    ('BUN', 'Laboratory', 250, NULL, TRUE),
    ('CA 125', 'Laboratory', 0, 'Send-out test (charge varies)', TRUE),
    ('CBC,PLT', 'Laboratory', 200, NULL, TRUE),
    ('CHOLESTEROL', 'Laboratory', 160, NULL, TRUE),
    ('CREATININE', 'Laboratory', 130, NULL, TRUE),
    ('DENGUE TEST (COMBO)', 'Laboratory', 1300, NULL, TRUE),
    ('ELECTROLYTES (CA,NA,K,CL)', 'Laboratory', 1200, NULL, TRUE),
    ('FBS', 'Laboratory', 110, NULL, TRUE),
    ('FECAL OCCULT BLOOD /FOBT', 'Laboratory', 260, NULL, TRUE),
    ('FT3', 'Laboratory', 850, NULL, TRUE),
    ('FT4', 'Laboratory', 850, NULL, TRUE),
    ('GRAM STAIN/ URETHRAL SMEAR', 'Laboratory', 250, NULL, TRUE),
    ('H. PYLORI', 'Laboratory', 600, NULL, TRUE),
    ('HBA1C', 'Laboratory', 900, NULL, TRUE),
    ('HBSAG', 'Laboratory', 230, NULL, TRUE),
    ('HGB/HCT', 'Laboratory', 120, NULL, TRUE),
    ('LIPID PROFILE', 'Laboratory', 700, NULL, TRUE),
    ('MICRAL TEST', 'Laboratory', 500, NULL, TRUE),
    ('OGTT 2X', 'Laboratory', 550, NULL, TRUE),
    ('OGTT 3X', 'Laboratory', 670, NULL, TRUE),
    ('PREGNANCY TEST', 'Laboratory', 180, NULL, TRUE),
    ('PROTIME INR', 'Laboratory', 0, 'Send-out test (charge varies)', TRUE),
    ('PSA', 'Laboratory', 0, 'Send-out test (charge varies)', TRUE),
    ('S. URIC ACID', 'Laboratory', 150, NULL, TRUE),
    ('SGOT', 'Laboratory', 350, NULL, TRUE),
    ('SGPT', 'Laboratory', 230, NULL, TRUE),
    ('STOOL EXAM', 'Laboratory', 40, NULL, TRUE),
    ('TSH', 'Laboratory', 850, NULL, TRUE),
    ('TRIGLYCERIDES', 'Laboratory', 350, NULL, TRUE),
    ('T3', 'Laboratory', 850, NULL, TRUE),
    ('T4', 'Laboratory', 850, NULL, TRUE),
    ('URINALYSIS 4-PARA', 'Laboratory', 40, NULL, TRUE),
    ('URINALYSIS 10-PARA', 'Laboratory', 250, NULL, TRUE),
    ('VDRL/SYPHILIS', 'Laboratory', 350, NULL, TRUE),
    ('2D ECHO - ADULT', 'Ultrasound', 2900, NULL, TRUE),
    ('2D ECHO - BABY', 'Ultrasound', 2900, NULL, TRUE),
    ('BREASTS', 'Ultrasound', 2000, NULL, TRUE),
    ('CRANIAL/ULO', 'Ultrasound', 1600, NULL, TRUE),
    ('GALL BLADDER', 'Ultrasound', 750, NULL, TRUE),
    ('HBT with Liver', 'Ultrasound', 900, NULL, TRUE),
    ('HEMI-THORAX (BOTH)/CHEST UTZ', 'Ultrasound', 1200, NULL, TRUE),
    ('INGUINAL', 'Ultrasound', 1600, NULL, TRUE),
    ('INGUINO - SCROTAL', 'Ultrasound', 2700, NULL, TRUE),
    ('KUB', 'Ultrasound', 700, NULL, TRUE),
    ('KUB+PROSTATE', 'Ultrasound', 900, NULL, TRUE),
    ('LIVER', 'Ultrasound', 700, NULL, TRUE),
    ('LOWER ABDOMEN', 'Ultrasound', 700, NULL, TRUE),
    ('PELVIS', 'Ultrasound', 750, NULL, TRUE),
    ('PREG-EVAL', 'Ultrasound', 900, NULL, TRUE),
    ('PROSTATE', 'Ultrasound', 750, NULL, TRUE),
    ('SCROTAL', 'Ultrasound', 1600, NULL, TRUE),
    ('SOFT TISSUE/MASS', 'Ultrasound', 1600, NULL, TRUE),
    ('THYROID/ NECK', 'Ultrasound', 1200, NULL, TRUE),
    ('TVS', 'Ultrasound', 1200, NULL, TRUE),
    ('UPPER ABDOMEN', 'Ultrasound', 750, NULL, TRUE),
    ('WHOLE AB/PELVIS', 'Ultrasound', 1600, NULL, TRUE),
    ('WHOLE AB/PROSTATE', 'Ultrasound', 1200, NULL, TRUE),
    ('WHOLE ABDOMEN', 'Ultrasound', 1100, NULL, TRUE),
    ('Abdomen Sup/Upright', 'X-Ray', 300, NULL, TRUE),
    ('Abdominal Fetal Parts', 'X-Ray', 500, NULL, TRUE),
    ('Ankle APL', 'X-Ray', 290, NULL, TRUE),
    ('Apicolordotic View (ALV)', 'X-Ray', 200, NULL, TRUE),
    ('Cervical APL', 'X-Ray', 340, NULL, TRUE),
    ('Cervical Spine', 'X-Ray', 450, NULL, TRUE),
    ('Chest APL -Adult', 'X-Ray', 310, NULL, TRUE),
    ('Chest APL -Child', 'X-Ray', 310, NULL, TRUE),
    ('Chest PA - Adult', 'X-Ray', 200, NULL, TRUE),
    ('Chest PA -Child', 'X-Ray', 200, NULL, TRUE),
    ('Clavicle', 'X-Ray', 270, NULL, TRUE),
    ('Dorso Lumbar', 'X-Ray', 390, NULL, TRUE),
    ('Elbow APL', 'X-Ray', 270, NULL, TRUE),
    ('Femur and Thigh APL', 'X-Ray', 315, NULL, TRUE),
    ('Foot AP-O', 'X-Ray', 270, NULL, TRUE),
    ('Forearm APL', 'X-Ray', 270, NULL, TRUE),
    ('Hand APO', 'X-Ray', 270, NULL, TRUE),
    ('Humerous APL', 'X-Ray', 270, NULL, TRUE),
    ('Knee APL/ Patilla APL', 'X-Ray', 270, NULL, TRUE),
    ('Leg APL/ Tibia APL', 'X-Ray', 270, NULL, TRUE),
    ('Lumbosacral.4 Lateral view', 'X-Ray', 640, NULL, TRUE),
    ('Lumbosacral APL', 'X-Ray', 480, NULL, TRUE),
    ('Mandible', 'X-Ray', 280, NULL, TRUE),
    ('Mastoid', 'X-Ray', 350, NULL, TRUE),
    ('Orbit/ Nasal Bone', 'X-Ray', 320, NULL, TRUE),
    ('Paranasal Sinuses', 'X-Ray', 380, NULL, TRUE),
    ('Pelvis AP (HIP/Joint)AP', 'X-Ray', 280, NULL, TRUE),
    ('Pelvis APL', 'X-Ray', 450, NULL, TRUE),
    ('Plain Abdomen', 'X-Ray', 330, NULL, TRUE),
    ('Scoliotic Series', 'X-Ray', 450, NULL, TRUE),
    ('Shoulder AP', 'X-Ray', 270, NULL, TRUE),
    ('Shoulder APL', 'X-Ray', 315, NULL, TRUE),
    ('Shoulder Bilateral', 'X-Ray', 315, NULL, TRUE),
    ('Skull APL/NASO PHARYNX', 'X-Ray', 380, NULL, TRUE),
    ('Skull Series', 'X-Ray', 450, NULL, TRUE),
    ('TBC (Thoraco Bony Cage) AP', 'X-Ray', 280, NULL, TRUE),
    ('TBC APL', 'X-Ray', 400, NULL, TRUE),
    ('Thoraco Lumbar APL', 'X-Ray', 600, NULL, TRUE),
    ('Wrist APL', 'X-Ray', 270, NULL, TRUE),
    ('Holter', 'Holter', 0, 'Set price in Settings', TRUE),
    ('ECG', 'ECG', 0, 'Set price in Settings', TRUE);

CREATE TABLE cashier.transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_no      TEXT NOT NULL UNIQUE,             -- internal sequence only, NOT a BIR OR number
    patient_id      UUID NOT NULL REFERENCES cashier.patients(id),
    cashier_id      UUID NOT NULL REFERENCES authentication.users(id),
    status          cashier.transaction_status NOT NULL DEFAULT 'unpaid',
    subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    discount_rate   NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_rate >= 0 AND discount_rate <= 100),
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    mode_of_payment cashier.mode_of_payment NOT NULL DEFAULT 'cash',
    is_senior       BOOLEAN NOT NULL DEFAULT FALSE,
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
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL UNIQUE,      -- Laboratory, Ultrasound, X-Ray, Holter, ECG
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

-- Departments (matches transaction_types.category below)
INSERT INTO laboratory.laboratories (name, is_active) VALUES
    ('Laboratory', TRUE),
    ('Ultrasound', TRUE),
    ('X-Ray', TRUE),
    ('Holter', TRUE),
    ('ECG', TRUE)
ON CONFLICT (name) DO NOTHING;

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
    subtotal            NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    discount_rate       NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_rate >= 0 AND discount_rate <= 100),
    discount_amount     NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    is_senior           BOOLEAN NOT NULL DEFAULT FALSE,
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
        cashier_id, cashier_name, subtotal, discount_rate, discount_amount, is_senior,
        amount, mode_of_payment, status, issued_at
    ) VALUES (
        NEW.id, NEW.receipt_no, NEW.patient_id, v_patient_name,
        NEW.cashier_id, v_cashier_name, NEW.subtotal, NEW.discount_rate, NEW.discount_amount, NEW.is_senior,
        NEW.total_amount, NEW.mode_of_payment, NEW.status, NEW.issued_at
    )
    ON CONFLICT (transaction_id) DO UPDATE SET
        receipt_no      = EXCLUDED.receipt_no,
        patient_id      = EXCLUDED.patient_id,
        patient_name    = EXCLUDED.patient_name,
        cashier_id      = EXCLUDED.cashier_id,
        cashier_name    = EXCLUDED.cashier_name,
        subtotal        = EXCLUDED.subtotal,
        discount_rate   = EXCLUDED.discount_rate,
        discount_amount = EXCLUDED.discount_amount,
        is_senior       = EXCLUDED.is_senior,
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
    cashier_id, cashier_name, subtotal, discount_rate, discount_amount, is_senior,
    amount, mode_of_payment, status, issued_at
)
SELECT
    t.id, t.receipt_no, t.patient_id,
    TRIM(CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name)),
    t.cashier_id,
    TRIM(CONCAT_WS(' ', u.first_name, u.middle_name, u.last_name)),
    t.subtotal, t.discount_rate, t.discount_amount, t.is_senior,
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
CREATE INDEX idx_transactions_issued_at      ON cashier.transactions (issued_at);
CREATE INDEX idx_transactions_status         ON cashier.transactions (status);
CREATE INDEX idx_transaction_items_txn       ON cashier.transaction_items (transaction_id);
CREATE INDEX idx_lab_results_laboratory      ON laboratory.lab_results (laboratory_id);
CREATE INDEX idx_lab_results_doctor          ON laboratory.lab_results (doctor_id);
CREATE INDEX idx_stock_movements_material    ON inventory.stock_movements (material_id);
CREATE INDEX idx_expenses_source             ON accounting.expenses (source_system, source_reference_id);
CREATE INDEX idx_income_issued_at            ON income.income_records (issued_at);
CREATE INDEX idx_income_status               ON income.income_records (status);
CREATE INDEX idx_income_mode_of_payment      ON income.income_records (mode_of_payment);
CREATE INDEX idx_transaction_types_category  ON cashier.transaction_types (category);
CREATE INDEX idx_transaction_types_active    ON cashier.transaction_types (is_active);
CREATE INDEX idx_laboratories_active         ON laboratory.laboratories (is_active);