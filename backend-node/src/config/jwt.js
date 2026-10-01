import jwt from 'jsonwebtoken';
import { config } from './env.js';

const JWT_SECRET = config.jwt;
const JWT_EXPIRES_IN = config.jwt_expires_in;
const REFRESH_EXPIRES_IN = config.jwt_refresh_expires_in;

/**
 * Sign an access token.
 * @param {object} payload - { id, email, roles }
 * @returns {string} JWT access token
 */

export function signAccessToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
} 

/**
 * Sign a refresh token.
 * @param {object} payload - { id }
 * @returns {string} JWT refresh token
 */

export function signRefreshToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

/**
 * Verify a token (access or refresh).
 * @param {string} token - JWT string
 * @returns {object} decoded payload
 * @throws {Error} if token is invalid or expired
 */

export function verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
}
