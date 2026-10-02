/**
 * Validate patient creation.
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export function validateCreatePatient(body) {
    const { full_name } = body;

    if (!full_name || full_name.trim().length < 2) {
        const err = new Error('Full name is required (min 2 characters)');
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
export function validateCreateTransaction(body) {
    const { patient_id, status, items } = body;

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
