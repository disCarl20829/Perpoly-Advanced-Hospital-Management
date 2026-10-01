/**
 * Validate user profile update.
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export function validateUpdateProfile(body) {
    const { last_name, first_name, email } = body;

    if (!last_name || !first_name) {
        const err = new Error('Last name and first name are required');
        err.status = 400;
        throw err;
    }

    if (!email) {
        const err = new Error('Email is required');
        err.status = 400;
        throw err;
    }

    if (!isValidEmail(email)) {
        const err = new Error('Invalid email format');
        err.status = 400;
        throw err;
    }
}

/**
 * Validate user status update.
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export function validateUpdateStatus(body) {
    const { is_active } = body;

    if (typeof is_active !== 'boolean') {
        const err = new Error('is_active must be a boolean');
        err.status = 400;
        throw err;
    }
}

/**
 * Validate user roles update.
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export function validateUpdateRoles(body) {
    const { roles } = body;

    if (!Array.isArray(roles) || roles.length === 0) {
        const err = new Error('Roles must be a non-empty array');
        err.status = 400;
        throw err;
    }
}

/**
 * Validate doctor laboratory assignments.
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export function validateUpdateDoctorLaboratories(body) {
    const { laboratory_ids } = body;

    if (!Array.isArray(laboratory_ids)) {
        const err = new Error('laboratory_ids must be an array');
        err.status = 400;
        throw err;
    }
}

/**
 * Simple email format check.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
