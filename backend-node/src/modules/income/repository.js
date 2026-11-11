import db from '../../config/db.js';

// ============================================================
// HELPERS
// ============================================================

/**
 * Build the shared WHERE clause for income queries.
 * Dates are compared in Asia/Manila so daily reports match the
 * local calendar regardless of the server timezone.
 * @param {object} filters - { status, mode_of_payment, from, to }
 * @returns {object} { where, params }
 */
function buildFilters(filters = {}) {
    const clauses = [];
    const params = [];

    if (filters.status) {
        params.push(filters.status);
        clauses.push(`status = $${params.length}`);
    }
    if (filters.mode_of_payment) {
        params.push(filters.mode_of_payment);
        clauses.push(`mode_of_payment = $${params.length}`);
    }
    if (filters.from) {
        params.push(filters.from);
        clauses.push(`(issued_at AT TIME ZONE 'Asia/Manila')::date >= $${params.length}::date`);
    }
    if (filters.to) {
        params.push(filters.to);
        clauses.push(`(issued_at AT TIME ZONE 'Asia/Manila')::date <= $${params.length}::date`);
    }

    return {
        where: clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '',
        params
    };
}

// Only these literals can reach DATE_TRUNC. The service validates
// the period first, but keeping the map here removes any doubt.
const TRUNC = {
    daily: 'day',
    weekly: 'week',
    monthly: 'month'
};

// ============================================================
// INCOME RECORDS
// ============================================================

/**
 * Find all income records matching the filters.
 * @param {object} filters - { status, mode_of_payment, from, to }
 * @returns {array} list of income records
 */
export async function findAllIncome(filters = {}) {
    const { where, params } = buildFilters(filters);
    const query = `
        SELECT *,
               TO_CHAR(issued_at AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD HH24:MI') AS issued_at_local
        FROM income.income_records
        ${where}
        ORDER BY issued_at DESC
    `;
    const { rows } = await db.query(query, params);
    return rows;
}

/**
 * Group income by day, week (Monday start), or month.
 * @param {string} period - 'daily' | 'weekly' | 'monthly'
 * @param {object} filters - { status, mode_of_payment, from, to }
 * @returns {array} grouped totals
 */
export async function getIncomeGroups(period, filters = {}) {
    const { where, params } = buildFilters(filters);
    const query = `
        SELECT
            TO_CHAR(
                DATE_TRUNC('${TRUNC[period]}', issued_at AT TIME ZONE 'Asia/Manila'),
                'YYYY-MM-DD'
            ) AS period_start,
            COUNT(*)::int AS count,
            COALESCE(SUM(amount), 0)::numeric(12,2) AS total
        FROM income.income_records
        ${where}
        GROUP BY 1
        ORDER BY 1
    `;
    const { rows } = await db.query(query, params);
    return rows;
}

/**
 * Total count and amount for the filtered set.
 * @param {object} filters - { status, mode_of_payment, from, to }
 * @returns {object} { count, total }
 */
export async function getIncomeTotals(filters = {}) {
    const { where, params } = buildFilters(filters);
    const query = `
        SELECT
            COUNT(*)::int AS count,
            COALESCE(SUM(amount), 0)::numeric(12,2) AS total
        FROM income.income_records
        ${where}
    `;
    const { rows } = await db.query(query, params);
    return rows[0];
}

/**
 * Totals broken down by mode of payment.
 * @param {object} filters - { status, mode_of_payment, from, to }
 * @returns {array} grouped totals
 */
export async function getIncomeByMode(filters = {}) {
    const { where, params } = buildFilters(filters);
    const query = `
        SELECT
            mode_of_payment,
            COUNT(*)::int AS count,
            COALESCE(SUM(amount), 0)::numeric(12,2) AS total
        FROM income.income_records
        ${where}
        GROUP BY mode_of_payment
        ORDER BY total DESC
    `;
    const { rows } = await db.query(query, params);
    return rows;
}

// ============================================================
// SALES REPORT (client Excel template)
// ============================================================

/**
 * Find paid/unpaid transactions and their items for the client-format
 * daily sales report. One row per item; the service groups them.
 * @param {object} filters - { status, mode_of_payment, from, to }
 * @returns {array} transaction/item rows
 */
export async function findSalesReportTransactions({ status, mode_of_payment, from, to }) {
    const clauses = [
        `(t.issued_at AT TIME ZONE 'Asia/Manila')::date BETWEEN $1::date AND $2::date`
    ];
    const params = [from, to];

    if (status) {
        params.push(status);
        clauses.push(`t.status = $${params.length}`);
    }
    if (mode_of_payment) {
        params.push(mode_of_payment);
        clauses.push(`t.mode_of_payment = $${params.length}`);
    }

    const query = `
        SELECT
            t.id,
            t.receipt_no,
            t.issued_at,
            t.status,
            t.mode_of_payment,
            t.subtotal,
            t.discount_rate,
            t.discount_amount,
            t.total_amount,
            t.is_senior,
            TO_CHAR(t.issued_at AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD') AS local_date,
            p.last_name,
            p.first_name,
            p.middle_name,
            p.extra_name,
            ti.id AS item_id,
            ti.qty,
            ti.unit_price,
            ti.amount,
            ti.description,
            tt.name AS type_name,
            tt.category
        FROM cashier.transactions t
        JOIN cashier.patients p ON p.id = t.patient_id
        LEFT JOIN cashier.transaction_items ti ON ti.transaction_id = t.id
        LEFT JOIN cashier.transaction_types tt ON tt.id = ti.transaction_type_id
        WHERE ${clauses.join(' AND ')}
        ORDER BY local_date, t.issued_at, t.receipt_no, ti.id
    `;

    const { rows } = await db.query(query, params);
    return rows;
}
