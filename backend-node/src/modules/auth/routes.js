import express from 'express';
import * as authController from './controller.js.js';
import authenticate from '../../middleware/auth.middleware.js';
import authorize from '../../middleware/rbac.middleware.js';

const router = express.Router();

// Public routes
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);

// Protected routes
router.post('/register', authenticate, authorize('superadmin'), authController.register);
router.post('/logout', authenticate, authController.logout);

export default router;
