/**
 * Validate patient creation.
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export function validateCreatePatient(body) {
    const { last_name, first_name, is_senior } = body;

    if (!last_name || !first_name) {
        const err = new Error('Last name and first name are required');
        err.status = 400;
        throw err;
    }

    if (is_senior !== undefined && typeof is_senior !== 'boolean') {
        const err = new Error('is_senior must be a boolean');
        err.status = 400;
        throw err;
    }
}

/**
 * Validate a patient update.
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export function validateUpdatePatient(body) {
    if (body.is_senior !== undefined && typeof body.is_senior !== 'boolean') {
        const err = new Error('is_senior must be a boolean');
        err.status = 400;
        throw err;
    }
}

/**
 * Validate transaction type creation.
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export function validateCreateTransactionType(body) {
    const { name, category, default_price, notes, is_active } = body;

    if (!name || name.trim().length < 2) {
        const err = new Error('Name is required (min 2 characters)');
        err.status = 400;
        throw err;
    }

    if (!category) {
        const err = new Error('Category is required');
        err.status = 400;
        throw err;
    }

    if (default_price !== undefined && (Number.isNaN(Number(default_price)) || Number(default_price) < 0)) {
        const err = new Error('default_price must be a non-negative number');
        err.status = 400;
        throw err;
    }

    if (notes !== undefined && notes !== null && typeof notes !== 'string') {
        const err = new Error('notes must be a string');
        err.status = 400;
        throw err;
    }

    if (is_active !== undefined && typeof is_active !== 'boolean') {
        const err = new Error('is_active must be a boolean');
        err.status = 400;
        throw err;
    }
}

/**
 * Validate a partial transaction type update.
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export function validateUpdateTransactionType(body) {
    const { name, category, default_price, notes, is_active } = body;

    if (name !== undefined && (!name || name.trim().length < 2)) {
        const err = new Error('Name is required (min 2 characters)');
        err.status = 400;
        throw err;
    }

    if (category !== undefined && !category) {
        const err = new Error('Category is required');
        err.status = 400;
        throw err;
    }

    if (default_price !== undefined && (Number.isNaN(Number(default_price)) || Number(default_price) < 0)) {
        const err = new Error('default_price must be a non-negative number');
        err.status = 400;
        throw err;
    }

    if (notes !== undefined && notes !== null && typeof notes !== 'string') {
        const err = new Error('notes must be a string');
        err.status = 400;
        throw err;
    }

    if (is_active !== undefined && typeof is_active !== 'boolean') {
        const err = new Error('is_active must be a boolean');
        err.status = 400;
        throw err;
    }
}

/**
 * Validate transaction creation.
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export const MODES_OF_PAYMENT = ['cash', 'paymaya', 'gotyme', 'gcash', 'credit_card', 'debit_card', 'bank_transfer'];

export function validateCreateTransaction(body) {
    const { patient_id, status, mode_of_payment, items } = body;

    if (mode_of_payment !== undefined && !MODES_OF_PAYMENT.includes(mode_of_payment)) {
        const err = new Error(`mode_of_payment must be one of: ${MODES_OF_PAYMENT.join(', ')}`);
        err.status = 400;
        throw err;
    }

    if (!patient_id) {
        const err = new Error('Patient ID is required');
        err.status = 400;
        throw err;
    }

    if (!status || !['paid', 'unpaid'].includes(status)) {
        const err = new Error('Status must be "paid" or "unpaid"');
        err.status = 400;
        throw err;
    }

    if (!Array.isArray(items) || items.length === 0) {
        const err = new Error('At least one item is required');
        err.status = 400;
        throw err;
    }

    for (const item of items) {
        if (!item.transaction_type_id) {
            const err = new Error('Each item requires a transaction_type_id');
            err.status = 400;
            throw err;
        }
        if (!item.qty || item.qty < 1) {
            const err = new Error('Each item requires a valid qty (min 1)');
            err.status = 400;
            throw err;
        }
        if (item.unit_price === undefined || item.unit_price < 0) {
            const err = new Error('Each item requires a valid unit_price');
            err.status = 400;
            throw err;
        }
    }
}

/**
 * Validate transaction status update.
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export function validateUpdateTransactionStatus(body) {
    const { status } = body;

    if (!status || !['paid', 'unpaid'].includes(status)) {
        const err = new Error('Status must be "paid" or "unpaid"');
        err.status = 400;
        throw err;
    }
}

/**
 * Validate a transaction-level edit (status and/or mode of payment).
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export function validateUpdateTransaction(body) {
    const { status, mode_of_payment } = body;

    if (status === undefined && mode_of_payment === undefined) {
        const err = new Error('Provide status and/or mode_of_payment');
        err.status = 400;
        throw err;
    }

    if (status !== undefined && !['paid', 'unpaid'].includes(status)) {
        const err = new Error('Status must be "paid" or "unpaid"');
        err.status = 400;
        throw err;
    }

    if (mode_of_payment !== undefined && !MODES_OF_PAYMENT.includes(mode_of_payment)) {
        const err = new Error(`mode_of_payment must be one of: ${MODES_OF_PAYMENT.join(', ')}`);
        err.status = 400;
        throw err;
    }
}

/**
 * Validate a new item added to an existing transaction.
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export function validateTransactionItem(body) {
    const { transaction_type_id, qty, unit_price } = body;

    if (!transaction_type_id) {
        const err = new Error('transaction_type_id is required');
        err.status = 400;
        throw err;
    }
    if (qty === undefined || Number(qty) < 1) {
        const err = new Error('qty must be at least 1');
        err.status = 400;
        throw err;
    }
    if (unit_price === undefined || Number(unit_price) < 0) {
        const err = new Error('unit_price must be a non-negative number');
        err.status = 400;
        throw err;
    }
}

/**
 * Validate a partial item edit. At least one editable field is required.
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export function validateTransactionItemUpdate(body) {
    const { qty, unit_price, transaction_type_id } = body;

    if (qty === undefined && unit_price === undefined && transaction_type_id === undefined) {
        const err = new Error('Provide qty, unit_price, and/or transaction_type_id');
        err.status = 400;
        throw err;
    }
    if (qty !== undefined && Number(qty) < 1) {
        const err = new Error('qty must be at least 1');
        err.status = 400;
        throw err;
    }
    if (unit_price !== undefined && Number(unit_price) < 0) {
        const err = new Error('unit_price must be a non-negative number');
        err.status = 400;
        throw err;
    }
}

// ============================================================
// PATIENT IMPORT
// ============================================================

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Collect validation errors for one import row without throwing.
 * This lets the review queue display invalid rows before committing.
 * @param {object} raw - import row data
 * @returns {string[]} validation errors
 */
export function getPatientImportRowErrors(raw = {}) {
    const errors = [];

    if (!raw.last_name || !String(raw.last_name).trim()) {
        errors.push('last_name is required');
    }
    if (!raw.first_name || !String(raw.first_name).trim()) {
        errors.push('first_name is required');
    }

    if (raw.birthdate) {
        const value = String(raw.birthdate);
        const date = DATE_ONLY_RE.test(value) ? new Date(`${value}T00:00:00Z`) : null;
        if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
            errors.push('birthdate must be a valid YYYY-MM-DD date');
        }
    }

    if (raw.is_senior !== undefined && typeof raw.is_senior !== 'boolean') {
        errors.push('is_senior must be a boolean');
    }

    if (raw.gender !== undefined && raw.gender !== null && typeof raw.gender !== 'string') {
        errors.push('gender must be a string');
    }

    if (raw.contact_no !== undefined && raw.contact_no !== null && typeof raw.contact_no !== 'string') {
        errors.push('contact_no must be a string');
    }

    return errors;
}

/**
 * Validate the commit request body.
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export function validateCommitPatientImport(body = {}) {
    if (body.rows !== undefined && !Array.isArray(body.rows)) {
        const err = new Error('rows must be an array');
        err.status = 400;
        throw err;
    }

    if (body.rows === undefined) return;

    const seen = new Set();
    for (const row of body.rows) {
        if (!row || typeof row !== 'object' || !row.row_id) {
            const err = new Error('Each commit row requires a row_id');
            err.status = 400;
            throw err;
        }
        if (!['create', 'link'].includes(row.action)) {
            const err = new Error('Each commit row action must be "create" or "link"');
            err.status = 400;
            throw err;
        }
        if (seen.has(row.row_id)) {
            const err = new Error('Duplicate row_id in commit request');
            err.status = 400;
            throw err;
        }
        seen.add(row.row_id);
    }
}

/**
 * Validate an import-row review update.
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export function validateUpdatePatientImportRow(body = {}) {
    if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
        const err = new Error('Provide row data or matched_patient_id');
        err.status = 400;
        throw err;
    }
    if (body.raw_data !== undefined && (body.raw_data === null || typeof body.raw_data !== 'object' || Array.isArray(body.raw_data))) {
        const err = new Error('raw_data must be an object');
        err.status = 400;
        throw err;
    }
    if (body.matched_patient_id !== undefined && body.matched_patient_id !== null && typeof body.matched_patient_id !== 'string') {
        const err = new Error('matched_patient_id must be a UUID string or null');
        err.status = 400;
        throw err;
    }
}
