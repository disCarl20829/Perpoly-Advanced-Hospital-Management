import db from '../../config/db.js';

// ============================================================
// HELPERS
// ============================================================

function roundMoney(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

/**
 * Read the configured senior discount percentage.
 * @param {object} client - pg pool or transaction client
 * @returns {number} 0..100
 */
async function getSeniorDiscountRate(client = db) {
    const { rows } = await client.query(
        `SELECT senior_discount_rate FROM cashier.settings WHERE id = TRUE`
    );
    return Number(rows[0]?.senior_discount_rate ?? 20);
}

// ============================================================
// PATIENTS
// ============================================================

/**
 * Create a new patient.
 * @param {object} data - { last_name, first_name, middle_name, extra_name, gender, birthdate, address, contact_no, is_senior, source, created_by }
 * @returns {object} created patient
 */
export async function createPatient({ last_name, first_name, middle_name, extra_name, gender, birthdate, address, contact_no, is_senior = false, source, created_by }) {
    const query = `
        INSERT INTO cashier.patients (last_name, first_name, middle_name, extra_name, gender, birthdate, address, contact_no, is_senior, source, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
    `;
    const { rows } = await db.query(query, [last_name, first_name, middle_name, extra_name, gender, birthdate, address, contact_no, is_senior, source, created_by]);
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
 * Update a patient by ID. Only provided fields are changed.
 * @param {string} id - UUID
 * @param {object} data - { last_name, first_name, middle_name, extra_name, gender, birthdate, address, contact_no, is_senior }
 * @returns {object|null} updated patient
 */
export async function updatePatient(id, data = {}) {
    const fields = [];
    const params = [];

    for (const key of ['last_name', 'first_name', 'middle_name', 'extra_name', 'gender', 'birthdate', 'address', 'contact_no', 'is_senior']) {
        if (data[key] !== undefined) {
            params.push(data[key]);
            fields.push(`${key} = $${params.length}`);
        }
    }

    if (fields.length === 0) {
        return await findPatientById(id);
    }

    params.push(id);
    const query = `
        UPDATE cashier.patients
        SET ${fields.join(', ')}
        WHERE id = $${params.length}
        RETURNING *
    `;
    const { rows } = await db.query(query, params);
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
 * @param {object} data - { name, category, default_price, notes, is_active }
 * @returns {object} created transaction type
 */
export async function createTransactionType({ name, category, default_price = 0, notes = null, is_active = true }) {
    const query = `
        INSERT INTO cashier.transaction_types (name, category, default_price, notes, is_active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    `;
    const { rows } = await db.query(query, [name, category, default_price, notes, is_active]);
    return rows[0];
}

/**
 * Find all transaction types.
 * @param {object} filters - { active, category }
 * @returns {array} list of transaction types
 */
export async function findAllTransactionTypes(filters = {}) {
    const clauses = [];
    const params = [];

    if (filters.active !== undefined) {
        params.push(filters.active);
        clauses.push(`is_active = $${params.length}`);
    }
    if (filters.category) {
        params.push(filters.category);
        clauses.push(`category = $${params.length}`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const query = `
        SELECT * FROM cashier.transaction_types
        ${where}
        ORDER BY category, name
    `;
    const { rows } = await db.query(query, params);
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
 * Update a transaction type by ID. Only provided fields are changed.
 * @param {string} id - UUID
 * @param {object} data - { name, category, default_price, notes, is_active }
 * @returns {object|null}
 */
export async function updateTransactionType(id, data = {}) {
    const fields = [];
    const params = [];

    for (const key of ['name', 'category', 'default_price', 'notes', 'is_active']) {
        if (data[key] !== undefined) {
            params.push(data[key]);
            fields.push(`${key} = $${params.length}`);
        }
    }

    if (fields.length === 0) {
        return await findTransactionTypeById(id);
    }

    params.push(id);
    const query = `
        UPDATE cashier.transaction_types
        SET ${fields.join(', ')}
        WHERE id = $${params.length}
        RETURNING *
    `;
    const { rows } = await db.query(query, params);
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

        // Senior status is snapshotted onto the transaction so historical
        // reports do not change if the patient record is edited later.
        const patientResult = await client.query(
            `SELECT is_senior FROM cashier.patients WHERE id = $1`,
            [patient_id]
        );
        if (!patientResult.rows[0]) {
            const err = new Error('Patient not found');
            err.status = 404;
            throw err;
        }

        const isSenior = patientResult.rows[0].is_senior === true;
        const discountRate = isSenior ? await getSeniorDiscountRate(client) : 0;

        const subtotal = roundMoney(
            items.reduce((sum, item) => sum + (Number(item.unit_price) * Number(item.qty)), 0)
        );
        const discountAmount = roundMoney(subtotal * discountRate / 100);
        const total = roundMoney(subtotal - discountAmount);

        // Insert transaction
        const txnResult = await client.query(`
            INSERT INTO cashier.transactions (
                receipt_no, patient_id, cashier_id, status, mode_of_payment,
                subtotal, discount_rate, discount_amount, total_amount, is_senior
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [
            receipt_no, patient_id, cashier_id, status, mode_of_payment,
            subtotal, discountRate, discountAmount, total, isSenior
        ]);

        const transaction = txnResult.rows[0];

        // Insert items
        for (const item of items) {
            const amount = roundMoney(Number(item.unit_price) * Number(item.qty));
            await client.query(`
                INSERT INTO cashier.transaction_items (transaction_id, transaction_type_id, qty, unit, description, unit_price, amount)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [transaction.id, item.transaction_type_id, item.qty, item.unit, item.description, item.unit_price, amount]);
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
    const current = await client.query(
        `SELECT is_senior, discount_rate FROM cashier.transactions WHERE id = $1 FOR UPDATE`,
        [transactionId]
    );
    if (!current.rows[0]) return null;

    const isSenior = current.rows[0].is_senior === true;
    const discountRate = isSenior ? Number(current.rows[0].discount_rate || 0) : 0;

    const subtotalResult = await client.query(`
        SELECT COALESCE(SUM(qty * unit_price), 0) AS subtotal
        FROM cashier.transaction_items
        WHERE transaction_id = $1
    `, [transactionId]);

    const subtotal = roundMoney(subtotalResult.rows[0].subtotal);
    const discountAmount = roundMoney(subtotal * discountRate / 100);
    const total = roundMoney(subtotal - discountAmount);

    const query = `
        UPDATE cashier.transactions
        SET subtotal = $2,
            discount_rate = $3,
            discount_amount = $4,
            total_amount = $5
        WHERE id = $1
        RETURNING *
    `;
    const { rows } = await client.query(query, [
        transactionId, subtotal, discountRate, discountAmount, total
    ]);
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