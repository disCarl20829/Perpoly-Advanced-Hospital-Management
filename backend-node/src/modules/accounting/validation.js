/**
 * Validate expense recording.
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export function validateRecordExpense(body) {
    const { source_system, source_reference_id, amount, incurred_at } = body;

    if (!source_system || !['cashier', 'laboratory', 'inventory'].includes(source_system)) {
        const err = new Error('source_system must be cashier, laboratory, or inventory');
        err.status = 400;
        throw err;
    }

    if (!source_reference_id) {
        const err = new Error('source_reference_id is required');
        err.status = 400;
        throw err;
    }

    if (amount === undefined || amount < 0) {
        const err = new Error('amount must be a non-negative number');
        err.status = 400;
        throw err;
    }

    if (!incurred_at) {
        const err = new Error('incurred_at is required');
        err.status = 400;
        throw err;
    }
}

/**
 * Validate system export logging.
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export function validateSystemExport(body) {
    const { system } = body;

    if (!system || !['cashier', 'laboratory', 'inventory'].includes(system)) {
        const err = new Error('system must be cashier, laboratory, or inventory');
        err.status = 400;
        throw err;
    }
}
