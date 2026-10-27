/**
 * Validate the senior discount setting.
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export function validateSeniorDiscount(body) {
    const { senior_discount_rate } = body;

    if (senior_discount_rate === undefined) {
        const err = new Error('senior_discount_rate is required');
        err.status = 400;
        throw err;
    }

    const rate = Number(senior_discount_rate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        const err = new Error('senior_discount_rate must be between 0 and 100');
        err.status = 400;
        throw err;
    }
}

/**
 * Validate department creation.
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export function validateCreateDepartment(body) {
    const { name, is_active } = body;

    if (!name || name.trim().length < 2) {
        const err = new Error('Department name is required (min 2 characters)');
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
 * Validate a department update.
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export function validateUpdateDepartment(body) {
    const { name, is_active } = body;

    if (name === undefined && is_active === undefined) {
        const err = new Error('Provide name and/or is_active');
        err.status = 400;
        throw err;
    }

    if (name !== undefined && (!name || name.trim().length < 2)) {
        const err = new Error('Department name is required (min 2 characters)');
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
 * Validate test creation.
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export function validateCreateTest(body) {
    const { name, category, default_price, notes, is_active } = body;

    if (!name || name.trim().length < 2) {
        const err = new Error('Test name is required (min 2 characters)');
        err.status = 400;
        throw err;
    }

    if (!category) {
        const err = new Error('Department (category) is required');
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
 * Validate a test update.
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export function validateUpdateTest(body) {
    const { name, category, default_price, notes, is_active } = body;

    if (name === undefined && category === undefined && default_price === undefined && notes === undefined && is_active === undefined) {
        const err = new Error('Provide name, category, default_price, notes, and/or is_active');
        err.status = 400;
        throw err;
    }

    if (name !== undefined && (!name || name.trim().length < 2)) {
        const err = new Error('Test name is required (min 2 characters)');
        err.status = 400;
        throw err;
    }

    if (category !== undefined && !category) {
        const err = new Error('Department (category) is required');
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
