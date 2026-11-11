export const PERIODS = ['daily', 'weekly', 'monthly'];
export const STATUSES = ['paid', 'unpaid'];
export const MODES_OF_PAYMENT = ['cash', 'paymaya', 'gotyme', 'gcash', 'credit_card', 'debit_card', 'bank_transfer'];

/**
 * Validate income list/summary/export filters.
 * @param {object} query - req.query
 * @throws {Error} if validation fails
 */
export function validateFilters(query = {}) {
    const { status, mode_of_payment, from, to } = query;

    if (status !== undefined && !STATUSES.includes(status)) {
        const err = new Error(`status must be one of: ${STATUSES.join(', ')}`);
        err.status = 400;
        throw err;
    }

    if (mode_of_payment !== undefined && !MODES_OF_PAYMENT.includes(mode_of_payment)) {
        const err = new Error(`mode_of_payment must be one of: ${MODES_OF_PAYMENT.join(', ')}`);
        err.status = 400;
        throw err;
    }

    validateDate(from, 'from');
    validateDate(to, 'to');

    if (from && to && from > to) {
        const err = new Error('"from" must be on or before "to"');
        err.status = 400;
        throw err;
    }
}

/**
 * Validate the report period.
 * @param {string} period - 'daily' | 'weekly' | 'monthly'
 * @throws {Error} if validation fails
 */
export function validatePeriod(period) {
    if (!PERIODS.includes(period)) {
        const err = new Error(`period must be one of: ${PERIODS.join(', ')}`);
        err.status = 400;
        throw err;
    }
}

/**
 * Validate a YYYY-MM-DD date string.
 * @param {string|undefined} value
 * @param {string} field
 * @throws {Error} if validation fails
 */
function validateDate(value, field) {
    if (value === undefined || value === '') return;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
        const err = new Error(`${field} must be a valid date (YYYY-MM-DD)`);
        err.status = 400;
        throw err;
    }
}
