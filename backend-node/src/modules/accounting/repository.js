import db from '../../config/db.js';

// ============================================================
// EXPENSES
// ============================================================

/**
 * Record an expense.
 * @param {object} data - { source_system, source_reference_id, description, amount, incurred_at }
 * @returns {object} created expense
 */
export async function createExpense({ source_system, source_reference_id, description, amount, incurred_at }) {
    const query = `
        INSERT INTO accounting.expenses (source_system, source_reference_id, description, amount, incurred_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    `;
    const { rows } = await db.query(query, [source_system, source_reference_id, description, amount, incurred_at]);
    return rows[0];
}

/**
 * Find all expenses, optionally filtered by source system and date range.
 * @param {object} filters - { source_system, from, to }
 * @returns {array} list of expenses
 */
export async function findAllExpenses(filters = {}) {
    let query = `SELECT * FROM accounting.expenses WHERE 1=1`;
    const params = [];

    if (filters.source_system) {
        params.push(filters.source_system);
        query += ` AND source_system = $${params.length}`;
    }
    if (filters.from) {
        params.push(filters.from);
        query += ` AND incurred_at >= $${params.length}`;
    }
    if (filters.to) {
        params.push(filters.to);
        query += ` AND incurred_at <= $${params.length}`;
    }

    query += ` ORDER BY incurred_at DESC`;

    const { rows } = await db.query(query, params);
    return rows;
}

/**
 * Find an expense by ID.
 * @param {string} id - UUID
 * @returns {object|null}
 */
export async function findExpenseById(id) {
    const query = `SELECT * FROM accounting.expenses WHERE id = $1`;
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
}

/**
 * Get a summary of expenses grouped by source system.
 * @param {object} filters - { from, to }
 * @returns {array} grouped totals
 */
export async function getExpenseSummary(filters = {}) {
    let query = `
        SELECT source_system, COUNT(*) AS count, SUM(amount) AS total
        FROM accounting.expenses
        WHERE 1=1
    `;
    const params = [];

    if (filters.from) {
        params.push(filters.from);
        query += ` AND incurred_at >= $${params.length}`;
    }
    if (filters.to) {
        params.push(filters.to);
        query += ` AND incurred_at <= $${params.length}`;
    }

    query += ` GROUP BY source_system ORDER BY source_system`;

    const { rows } = await db.query(query, params);
    return rows;
}

// ============================================================
// EXPORT LOGS
// ============================================================

/**
 * Record an export log.
 * @param {object} data - { export_type, system, requested_by, filters, file_path }
 * @returns {object} created export log
 */
export async function createExportLog({ export_type, system, requested_by, filters, file_path }) {
    const query = `
        INSERT INTO accounting.export_logs (export_type, system, requested_by, filters, file_path)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    `;
    const { rows } = await db.query(query, [export_type, system, requested_by, filters, file_path]);
    return rows[0];
}

/**
 * Find all export logs.
 * @returns {array} list of export logs
 */
export async function findAllExportLogs() {
    const query = `SELECT * FROM accounting.export_logs ORDER BY created_at DESC`;
    const { rows } = await db.query(query);
    return rows;
}

// ============================================================
// AGGREGATION (pulls from other subsystems)
// ============================================================

/**
 * Pull cashier transactions within a date range.
 * @param {object} filters - { from, to }
 * @returns {array} transactions
 */
export async function getCashierTransactions(filters = {}) {
    let query = `
        SELECT t.id, t.receipt_no, t.status, t.total_amount, t.issued_at, TRIM(CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name)) AS patient_name
        FROM cashier.transactions t
        JOIN cashier.patients p ON p.id = t.patient_id
        WHERE 1=1
    `;
    const params = [];

    if (filters.from) {
        params.push(filters.from);
        query += ` AND t.issued_at >= $${params.length}`;
    }
    if (filters.to) {
        params.push(filters.to);
        query += ` AND t.issued_at <= $${params.length}`;
    }

    query += ` ORDER BY t.issued_at DESC`;

    const { rows } = await db.query(query, params);
    return rows;
}

/**
 * Pull laboratory results within a date range.
 * @param {object} filters - { from, to }
 * @returns {array} results
 */
export async function getLaboratoryResults(filters = {}) {
    let query = `
        SELECT lr.id, lr.status, lr.recorded_at,
               tt.name AS transaction_type_name,
               TRIM(CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name)) AS patient_name
        FROM laboratory.lab_results lr
        JOIN cashier.transaction_items ti ON ti.id = lr.transaction_item_id
        JOIN cashier.transaction_types tt ON tt.id = ti.transaction_type_id
        JOIN cashier.transactions t ON t.id = ti.transaction_id
        JOIN cashier.patients p ON p.id = t.patient_id
        WHERE 1=1
    `;
    const params = [];

    if (filters.from) {
        params.push(filters.from);
        query += ` AND lr.recorded_at >= $${params.length}`;
    }
    if (filters.to) {
        params.push(filters.to);
        query += ` AND lr.recorded_at <= $${params.length}`;
    }

    query += ` ORDER BY lr.recorded_at DESC`;

    const { rows } = await db.query(query, params);
    return rows;
}

/**
 * Pull inventory stock movements within a date range.
 * @param {object} filters - { from, to }
 * @returns {array} movements
 */
export async function getInventoryMovements(filters = {}) {
    let query = `
        SELECT sm.*, m.name AS material_name, m.unit AS material_unit
        FROM inventory.stock_movements sm
        JOIN inventory.materials m ON m.id = sm.material_id
        WHERE 1=1
    `;
    const params = [];

    if (filters.from) {
        params.push(filters.from);
        query += ` AND sm.created_at >= $${params.length}`;
    }
    if (filters.to) {
        params.push(filters.to);
        query += ` AND sm.created_at <= $${params.length}`;
    }

    query += ` ORDER BY sm.created_at DESC`;

    const { rows } = await db.query(query, params);
    return rows;
}
