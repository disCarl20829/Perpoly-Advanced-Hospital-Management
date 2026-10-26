import db from '../../config/db.js';

// ============================================================
// PATIENTS
// ============================================================

/**
 * Create a new patient.
 * @param {object} data - { last_name, first_name, middle_name, extra_name, gender, birthdate, address, contact_no, source, created_by }
 * @returns {object} created patient
 */
export async function createPatient({ last_name, first_name, middle_name, extra_name, gender, birthdate, address, contact_no, source, created_by }) {
    const query = `
        INSERT INTO cashier.patients (last_name, first_name, middle_name, extra_name, gender, birthdate, address, contact_no, source, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
    `;
    const { rows } = await db.query(query, [last_name, first_name, middle_name, extra_name, gender, birthdate, address, contact_no, source, created_by]);
    return rows[0];
}

/**
 * Find patients by name (partial match on any name part).
 * @param {string} name
 * @returns {array} matching patients
 */
export async function findPatientsByName(name) {
    const query = `
        SELECT * FROM cashier.patients
        WHERE last_name ILIKE $1
           OR first_name ILIKE $1
           OR middle_name ILIKE $1
        ORDER BY last_name, first_name
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
    const query = `SELECT * FROM cashier.patients ORDER BY last_name, first_name`;
    const { rows } = await db.query(query);
    return rows;
}

/**
 * Update a patient by ID.
 * @param {string} id - UUID
 * @param {object} data - { last_name, first_name, middle_name, extra_name, gender, birthdate, address, contact_no }
 * @returns {object|null} updated patient
 */
export async function updatePatient(id, { last_name, first_name, middle_name, extra_name, gender, birthdate, address, contact_no }) {
    const query = `
        UPDATE cashier.patients
        SET last_name = $1, first_name = $2, middle_name = $3, extra_name = $4, gender = $5, birthdate = $6, address = $7, contact_no = $8
        WHERE id = $9
        RETURNING *
    `;
    const { rows } = await db.query(query, [last_name, first_name, middle_name, extra_name, gender, birthdate, address, contact_no, id]);
    return rows[0] || null;
}

/**
 * Delete a patient by ID 
 * @param {string} id - UUID
 * @returns {object|null} deleted patient
 */
export async function deletePatient(id) {
    const query = `DELETE FROM cashier.patients WHERE id = $1 RETURNING *`;
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
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

/**
 * Update a transaction type by ID.
 * @param {string} id - UUID
 * @param {object} data - { name, category }
 * @returns {object|null}
 */
export async function updateTransactionType(id, { name, category }) {
    const query = 'UPDATE cashier.transaction_types SET name = $1, category = $2 WHERE id = $3 RETURNING *';
    const { rows } = await db.query(query, [name, category, id]);
    return rows[0] || null;
}

/**
 * Delete a transaction type by ID.
 * @param {string} id - UUID
 * @returns {object|null}
 */
export async function deleteTransactionType(id) {
    const query = 'DELETE FROM cashier.transaction_types WHERE id = $1 RETURNING *';
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
}

// ============================================================
// TRANSACTIONS
// ============================================================

/**
 * Create a new transaction with items.
 * @param {object} data - { patient_id, cashier_id, status, mode_of_payment, items }
 * @returns {object} created transaction with items
 */
export async function createTransaction({ patient_id, cashier_id, status, mode_of_payment = 'cash', items }) {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // Ensure the receipt sequence exists (idempotent)
        await client.query(`CREATE SEQUENCE IF NOT EXISTS cashier.receipt_seq START 1`);

        // Generate receipt number
        const receiptResult = await client.query(`
            SELECT 'RCPT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('cashier.receipt_seq')::TEXT, 6, '0') AS receipt_no
        `);
        const receipt_no = receiptResult.rows[0].receipt_no;

        // Calculate total
        const total = items.reduce((sum, item) => sum + (item.unit_price * item.qty), 0);

        // Insert transaction
        const txnResult = await client.query(`
            INSERT INTO cashier.transactions (receipt_no, patient_id, cashier_id, status, mode_of_payment, total_amount)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [receipt_no, patient_id, cashier_id, status, mode_of_payment, total]);

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
        SELECT t.*, TRIM(CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name)) AS patient_name
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
        SELECT t.*, TRIM(CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name)) AS patient_name
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
 * Update a transaction's status and/or mode of payment.
 * Changing the total or status here fires the income trigger.
 * @param {string} id - UUID
 * @param {object} data - { status, mode_of_payment }
 * @returns {object} updated transaction
 */
export async function updateTransaction(id, { status, mode_of_payment }) {
    const fields = [];
    const params = [];

    if (status !== undefined) {
        params.push(status);
        fields.push(`status = $${params.length}`);
    }
    if (mode_of_payment !== undefined) {
        params.push(mode_of_payment);
        fields.push(`mode_of_payment = $${params.length}`);
    }

    if (fields.length === 0) {
        return await findTransactionById(id);
    }

    params.push(id);
    const query = `
        UPDATE cashier.transactions
        SET ${fields.join(', ')}
        WHERE id = $${params.length}
        RETURNING *
    `;
    const { rows } = await db.query(query, params);
    return rows[0] || null;
}

/**
 * Update transaction status (kept for the dedicated status endpoint).
 * @param {string} id - UUID
 * @param {string} status - 'paid' or 'unpaid'
 * @returns {object} updated transaction
 */
export async function updateTransactionStatus(id, status) {
    return await updateTransaction(id, { status });
}

/**
 * Delete transaction.
 * @param {string} id - UUID
 * @returns {object} deleted transaction
 */
export async function deleteTransaction(id) {
    const query = 'DELETE FROM cashier.transactions WHERE id = $1 RETURNING *';
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
}

/**
 * Find a transaction item by ID.
 * @param {string} id - UUID
 * @returns {object|null}
 */
export async function findTransactionItemById(id) {
    const query = 'SELECT * FROM cashier.transaction_items WHERE id = $1';
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
}

/**
 * Find a transaction item that belongs to a specific transaction.
 * @param {string} transactionId - UUID
 * @param {string} itemId - UUID
 * @returns {object|null}
 */
export async function findTransactionItem(transactionId, itemId) {
    const query = `
        SELECT * FROM cashier.transaction_items
        WHERE id = $1 AND transaction_id = $2
    `;
    const { rows } = await db.query(query, [itemId, transactionId]);
    return rows[0] || null;
}

/**
 * Recalculate a transaction's total from its current items.
 * The UPDATE fires the income trigger automatically.
 * @param {object} client - pg client (inside a transaction)
 * @param {string} transactionId - UUID
 * @returns {object|null} updated transaction
 */
async function recalcTransactionTotal(client, transactionId) {
    const query = `
        UPDATE cashier.transactions
        SET total_amount = COALESCE((
            SELECT SUM(qty * unit_price)
            FROM cashier.transaction_items
            WHERE transaction_id = $1
        ), 0)
        WHERE id = $1
        RETURNING *
    `;
    const { rows } = await client.query(query, [transactionId]);
    return rows[0] || null;
}

/**
 * Add an item to an existing transaction and recalculate its total.
 * @param {string} transactionId - UUID
 * @param {object} data - { transaction_type_id, qty, unit, description, unit_price }
 * @returns {object} { item, transaction }
 */
export async function addTransactionItem(transactionId, { transaction_type_id, qty, unit, description, unit_price }) {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const itemResult = await client.query(`
            INSERT INTO cashier.transaction_items
                (transaction_id, transaction_type_id, qty, unit, description, unit_price, amount)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [transactionId, transaction_type_id, qty, unit, description, unit_price, qty * unit_price]);

        const transaction = await recalcTransactionTotal(client, transactionId);

        await client.query('COMMIT');
        return { item: itemResult.rows[0], transaction };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Update a transaction item and recalculate the parent total.
 * @param {string} transactionId - UUID
 * @param {string} itemId - UUID
 * @param {object} data - { transaction_type_id, qty, unit, description, unit_price }
 * @returns {object} { item, transaction }
 */
export async function updateTransactionItem(transactionId, itemId, data) {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const itemResult = await client.query(`
            UPDATE cashier.transaction_items
            SET transaction_type_id = $1,
                qty = $2,
                unit = $3,
                description = $4,
                unit_price = $5,
                amount = $6
            WHERE id = $7 AND transaction_id = $8
            RETURNING *
        `, [
            data.transaction_type_id,
            data.qty,
            data.unit,
            data.description,
            data.unit_price,
            data.qty * data.unit_price,
            itemId,
            transactionId
        ]);

        if (itemResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return null;
        }

        const transaction = await recalcTransactionTotal(client, transactionId);

        await client.query('COMMIT');
        return { item: itemResult.rows[0], transaction };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Delete a transaction item and recalculate the parent total.
 * @param {string} transactionId - UUID
 * @param {string} itemId - UUID
 * @returns {object|null} { item, transaction }
 */
export async function deleteTransactionItem(transactionId, itemId) {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const itemResult = await client.query(`
            DELETE FROM cashier.transaction_items
            WHERE id = $1 AND transaction_id = $2
            RETURNING *
        `, [itemId, transactionId]);

        if (itemResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return null;
        }

        const transaction = await recalcTransactionTotal(client, transactionId);

        await client.query('COMMIT');
        return { item: itemResult.rows[0], transaction };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}