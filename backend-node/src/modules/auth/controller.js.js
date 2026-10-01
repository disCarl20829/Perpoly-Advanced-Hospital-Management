import * as authService from './service.js';
import { validateRegister, validateLogin, validateRefresh } from './validation.js';

/**
 * Register a new user (superadmin only).
 */
export async function register(req, res, next) {
    try {
        validateRegister(req.body);

        // Enforce superadmin-only account creation
        if (!req.user.roles.includes('superadmin')) {
            return res.status(403).json({ message: 'Only superadmin can create accounts' });
        }

        const { last_name, first_name, middle_name, extra_name, email, password, roles } = req.body;

        const result = await authService.register({
            last_name,
            first_name,
            middle_name,
            extra_name,
            email,
            password,
            roles
        });

        res.status(201).json({
            message: 'User created successfully',
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Login a user.
 */
export async function login(req, res, next) {
    try {
        validateLogin(req.body);

        const { email, password } = req.body;

        const result = await authService.login({ email, password });

        res.json({
            message: 'Login successful',
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Refresh an access token.
 */
export async function refresh(req, res, next) {
    try {
        validateRefresh(req.body);

        const { refreshToken } = req.body;

        const result = await authService.refresh(refreshToken);

        res.json({
            message: 'Token refreshed',
            accessToken: result.accessToken
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Logout a user.
 */
export async function logout(req, res, next) {
    try {
        // TODO: Invalidate refresh token (Redis blacklist)
        res.json({ message: 'Logged out successfully' });
    } catch (err) {
        next(err);
    }
}
