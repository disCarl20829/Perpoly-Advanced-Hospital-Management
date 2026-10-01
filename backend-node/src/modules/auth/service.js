import bcrypt from 'bcrypt';
import { signAccessToken, signRefreshToken } from '../../config/jwt.js';
import { config } from '../../config/env.js';
import * as authRepo from './repository.js';

const SALT_ROUNDS = config.saltRounds;

/**
 * Register a new user.
 * @param {object} data - { last_name, first_name, middle_name, extra_name, email, password, roles }
 * @returns {object} { user, accessToken, refreshToken }
 */
export async function register({ last_name, first_name, middle_name, extra_name, email, password, roles }) {
    // Check if email already exists
    const existing = await authRepo.findUserByEmail(email);
    if (existing) {
        const err = new Error('Email already registered');
        err.status = 409;
        throw err;
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = await authRepo.createUser({ last_name, first_name, middle_name, extra_name, email, password_hash });

    // Assign roles
    for (const role of roles) {
        await authRepo.assignRole(user.id, role);
    }

    // Generate tokens
    const accessToken = signAccessToken({ id: user.id, email: user.email, roles });
    const refreshToken = signRefreshToken({ id: user.id });

    return { user, accessToken, refreshToken };
}

/**
 * Login a user.
 * @param {object} data - { email, password }
 * @returns {object} { user, accessToken, refreshToken }
 */
export async function login({ email, password }) {
    // Find user
    const user = await authRepo.findUserByEmail(email);
    if (!user) {
        const err = new Error('Invalid email or password');
        err.status = 401;
        throw err;
    }

    // Check if active
    if (!user.is_active) {
        const err = new Error('Account is deactivated');
        err.status = 403;
        throw err;
    }

    // Compare password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
        const err = new Error('Invalid email or password');
        err.status = 401;
        throw err;
    }

    // Generate tokens
    const accessToken = signAccessToken({ id: user.id, email: user.email, roles: user.roles });
    const refreshToken = signRefreshToken({ id: user.id });

    return { user, accessToken, refreshToken };
}

/**
 * Refresh an access token using a refresh token.
 * @param {string} refreshToken
 * @returns {object} { accessToken }
 */
export async function refresh(refreshToken) {
    const { verifyToken } = await import('../../config/jwt.js');
    const decoded = verifyToken(refreshToken);

    const user = await authRepo.findUserById(decoded.id);
    if (!user || !user.is_active) {
        const err = new Error('Invalid refresh token');
        err.status = 401;
        throw err;
    }

    const accessToken = signAccessToken({ id: user.id, email: user.email, roles: user.roles });
    return { accessToken };
}
