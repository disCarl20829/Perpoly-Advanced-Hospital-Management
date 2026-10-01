import express from 'express';
import * as usersController from './controller.js.js';
import authenticate from '../../middleware/auth.middleware.js';
import authorize from '../../middleware/rbac.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Public routes (any authenticated user)
router.get('/', usersController.getAllUsers);
router.get('/roles', usersController.getAllRoles);
router.get('/laboratories', usersController.getAllLaboratories);
router.get('/:id', usersController.getUserById);

// Superadmin-only routes
router.put('/:id', authorize('superadmin'), usersController.updateUserProfile);
router.put('/:id/status', authorize('superadmin'), usersController.updateUserActiveStatus);
router.put('/:id/roles', authorize('superadmin'), usersController.updateUserRoles);

// Doctor-laboratory assignments (superadmin only)
router.get('/:id/laboratories', authorize('superadmin'), usersController.getDoctorLaboratories);
router.put('/:id/laboratories', authorize('superadmin'), usersController.updateDoctorLaboratories);

export default router;
