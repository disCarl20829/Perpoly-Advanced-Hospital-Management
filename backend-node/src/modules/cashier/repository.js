import db from '../../config/db.js';

// ============================================================
// PATIENTS
// ============================================================

/**
 * Create a new patient.
 * @param {object} data - { full_name, gender, birthdate, address, contact_no, source, created_by }
 * @returns {object} created patient
 */
export async function createPatient({ full_name, gender, birthdate, address, contact_no, source, created_by }) {
    const query = `
        INSERT INTO cashier.patients (full_name, gender, birthdate, address, contact_no, source, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
    `;
    const { rows } = await db.query(query, [full_name, gender, birthdate, address, contact_no, source, created_by]);
    return rows[0];
}

/**
 * Find patients by name (partial match).
 * @param {string} name
 * @returns {array} matching patients
 */
export async function findPatientsByName(name) {
    const query = `
        SELECT * FROM cashier.patients
        WHERE full_name ILIKE $1
        ORDER BY full_name
    `;
    const { rows } = await db.query(query, [`%${name}%`]);
    return rows;
}

/**
 * Find a patient by ID.
 * @param {string} id - UUID
 * @returns {object|null}
 */
export async function findPatientById(id) {
    const query = `SELECT * FROM cashier.patients WHERE id = $1`;
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
}

/**
 * Get all patients.
 * @returns {array} list of patients
 */
export async function findAllPatients() {
    const query = `SELECT * FROM cashier.patients ORDER BY full_name`;
    const { rows } = await db.query(query);
    return rows;
}

// ============================================================
// TRANSACTION TYPES
// ============================================================

/**
 * Create a new transaction type.
 * @param {object} data - { name, category }
 * @returns {object} created transaction type
 */
export async function createTransactionType({ name, category }) {
    const query = `
        INSERT INTO cashier.transaction_types (name, category)
        VALUES ($1, $2)
        RETURNING *
    `;
    const { rows } = await db.query(query, [name, category]);
    return rows[0];
}

/**
 * Find all transaction types.
 * @returns {array} list of transaction types
 */
export async function findAllTransactionTypes() {
    const query = `SELECT * FROM cashier.transaction_types ORDER BY name`;
    const { rows } = await db.query(query);
    return rows;
}

/**
 * Find a transaction type by ID.
 * @param {string} id - UUID
 * @returns {object|null}
 */
export async function findTransactionTypeById(id) {
    const query = `SELECT * FROM cashier.transaction_types WHERE id = $1`;
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
}

// ============================================================
// TRANSACTIONS
// ============================================================

/**
 * Create a new transaction with items.
 * @param {object} data - { patient_id, cashier_id, status, items }
 * @returns {object} created transaction with items
 */
export async function createTransaction({ patient_id, cashier_id, status, items }) {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // Generate receipt number
        const receiptResult = await client.query(`
            SELECT 'RCPT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('cashier.receipt_seq')::TEXT, 6, '0') AS receipt_no
        `);
        const receipt_no = receiptResult.rows[0].receipt_no;

        // Calculate total
        const total = items.reduce((sum, item) => sum + (item.unit_price * item.qty), 0);

        // Insert transaction
        const txnResult = await client.query(`
            INSERT INTO cashier.transactions (receipt_no, patient_id, cashier_id, status, total_amount)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [receipt_no, patient_id, cashier_id, status, total]);

        const transaction = txnResult.rows[0];

        // Insert items
        for (const item of items) {
            await client.query(`
                INSERT INTO cashier.transaction_items (transaction_id, transaction_type_id, qty, unit, description, unit_price, amount)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [transaction.id, item.transaction_type_id, item.qty, item.unit, item.description, item.unit_price, item.unit_price * item.qty]);
        }

        await client.query('COMMIT');
        return transaction;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Find all transactions.
 * @returns {array} list of transactions
 */
export async function findAllTransactions() {
    const query = `
        SELECT t.*, p.full_name AS patient_name
        FROM cashier.transactions t
        JOIN cashier.patients p ON p.id = t.patient_id
        ORDER BY t.issued_at DESC
    `;
    const { rows } = await db.query(query);
    return rows;
}

/**
 * Find a transaction by ID with items.
 * @param {string} id - UUID
 * @returns {object|null}
 */
export async function findTransactionById(id) {
    const query = `
        SELECT t.*, p.full_name AS patient_name
        FROM cashier.transactions t
        JOIN cashier.patients p ON p.id = t.patient_id
        WHERE t.id = $1
    `;
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
}

/**
 * Get items for a transaction.
 * @param {string} transactionId - UUID
 * @returns {array} list of items
 */
export async function findTransactionItems(transactionId) {
    const query = `
        SELECT ti.*, tt.name AS transaction_type_name, tt.category AS transaction_type_category
        FROM cashier.transaction_items ti
        JOIN cashier.transaction_types tt ON tt.id = ti.transaction_type_id
        WHERE ti.transaction_id = $1
    `;
    const { rows } = await db.query(query, [transactionId]);
    return rows;
}

/**
 * Update transaction status.
 * @param {string} id - UUID
 * @param {string} status - 'paid' or 'unpaid'
 * @returns {object} updated transaction
 */
export async function updateTransactionStatus(id, status) {
    const query = `
        UPDATE cashier.transactions
        SET status = $1
        WHERE id = $2
        RETURNING *
    `;
    const { rows } = await db.query(query, [status, id]);
    return rows[0];
}
