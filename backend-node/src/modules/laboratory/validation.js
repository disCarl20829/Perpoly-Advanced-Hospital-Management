/**
 * Validate lab material default update.
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export function validateUpdateMaterialDefault(body) {
    const { default_qty } = body;

    if (default_qty === undefined || default_qty < 0) {
        const err = new Error('default_qty must be a non-negative number');
        err.status = 400;
        throw err;
    }
}

/**
 * Validate lab result creation.
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export function validateCreateLabResult(body) {
    const { transaction_item_id, laboratory_id, result_data, materials_used } = body;

    if (!transaction_item_id) {
        const err = new Error('transaction_item_id is required');
        err.status = 400;
        throw err;
    }

    if (!laboratory_id) {
        const err = new Error('laboratory_id is required');
        err.status = 400;
        throw err;
    }

    if (!result_data || typeof result_data !== 'object') {
        const err = new Error('result_data must be an object');
        err.status = 400;
        throw err;
    }

    if (!Array.isArray(materials_used) || materials_used.length === 0) {
        const err = new Error('materials_used must be a non-empty array');
        err.status = 400;
        throw err;
    }

    for (const material of materials_used) {
        if (!material.material_id) {
            const err = new Error('Each material requires a material_id');
            err.status = 400;
            throw err;
        }
        if (!material.qty_used || material.qty_used < 0) {
            const err = new Error('Each material requires a valid qty_used (min 0)');
            err.status = 400;
            throw err;
        }
    }
}
