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
