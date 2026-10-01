/**
 * Validate registration input.
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export function validateRegister(body) {
    const { last_name, first_name, email, password, roles } = body;

    if (!last_name || !first_name) {
        const err = new Error('Last name and first name are required');
        err.status = 400;
        throw err;
    }

    if (!email || !password) {
        const err = new Error('Email and password are required');
        err.status = 400;
        throw err;
    }

    if (!isValidEmail(email)) {
        const err = new Error('Invalid email format');
        err.status = 400;
        throw err;
    }

    if (password.length < 8) {
        const err = new Error('Password must be at least 8 characters');
        err.status = 400;
        throw err;
    }

    if (!Array.isArray(roles) || roles.length === 0) {
        const err = new Error('At least one role is required');
        err.status = 400;
        throw err;
    }
}

/**
 * Validate login input.
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export function validateLogin(body) {
    const { email, password } = body;

    if (!email || !password) {
        const err = new Error('Email and password are required');
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
 * Validate refresh input.
 * @param {object} body - req.body
 * @throws {Error} if validation fails
 */
export function validateRefresh(body) {
    const { refreshToken } = body;

    if (!refreshToken) {
        const err = new Error('Refresh token is required');
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
