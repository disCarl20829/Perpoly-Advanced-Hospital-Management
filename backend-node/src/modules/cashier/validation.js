/**
 * Validate patient creation.
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export function validateCreatePatient(body) {
    const { last_name, first_name } = body;

    if (!last_name || !first_name) {
        const err = new Error('Last name and first name are required');
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
    const { name, category } = body;

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
