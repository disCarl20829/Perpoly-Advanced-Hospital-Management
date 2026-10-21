/**
 * Validate material type creation.
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export function validateCreateMaterialType(body) {
    const { name } = body;

    if (!name || name.trim().length < 2) {
        const err = new Error('Name is required (min 2 characters)');
        err.status = 400;
        throw err;
    }
}

/**
 * Validate material creation.
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export function validateCreateMaterial(body) {
    const { name, current_stock, reorder_threshold } = body;

    if (!name || name.trim().length < 2) {
        const err = new Error('Name is required (min 2 characters)');
        err.status = 400;
        throw err;
    }

    if (current_stock !== undefined && current_stock < 0) {
        const err = new Error('current_stock cannot be negative');
        err.status = 400;
        throw err;
    }

    if (reorder_threshold !== undefined && reorder_threshold < 0) {
        const err = new Error('reorder_threshold cannot be negative');
        err.status = 400;
        throw err;
    }
}

/**
 * Validate material update.
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export function validateUpdateMaterial(body) {
    const { name, reorder_threshold } = body;

    if (!name || name.trim().length < 2) {
        const err = new Error('Name is required (min 2 characters)');
        err.status = 400;
        throw err;
    }

    if (reorder_threshold !== undefined && reorder_threshold < 0) {
        const err = new Error('reorder_threshold cannot be negative');
        err.status = 400;
        throw err;
    }
}

/**
 * Validate stock movement.
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export function validateStockMovement(body) {
    const { material_id, direction, qty, source } = body;

    if (!material_id) {
        const err = new Error('material_id is required');
        err.status = 400;
        throw err;
    }

    if (!direction || !['in', 'out'].includes(direction)) {
        const err = new Error('direction must be "in" or "out"');
        err.status = 400;
        throw err;
    }

    if (!qty || qty <= 0) {
        const err = new Error('qty must be greater than 0');
        err.status = 400;
        throw err;
    }

    if (!source) {
        const err = new Error('source is required');
        err.status = 400;
        throw err;
    }
}

/**
 * Validate stock receipt OCR creation.
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export function validateCreateStockReceiptOcr(body) {
    const { raw_image_path, extracted_items } = body;

    if (!raw_image_path) {
        const err = new Error('raw_image_path is required');
        err.status = 400;
        throw err;
    }

    if (!Array.isArray(extracted_items) || extracted_items.length === 0) {
        const err = new Error('extracted_items must be a non-empty array');
        err.status = 400;
        throw err;
    }

    for (const item of extracted_items) {
        if (!item.name) {
            const err = new Error('Each extracted item requires a name');
            err.status = 400;
            throw err;
        }
        if (!item.qty || item.qty <= 0) {
            const err = new Error('Each extracted item requires a valid qty');
            err.status = 400;
            throw err;
        }
    }
}
