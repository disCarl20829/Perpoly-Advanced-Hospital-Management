import express from 'express';
import * as settingsController from './controller.js';
import authenticate from '../../middleware/auth.middleware.js';
import authorize from '../../middleware/rbac.middleware.js';

const router = express.Router();

// Everyone except doctor and inventory_staff can manage the price list.
router.use(authenticate, authorize('superadmin', 'cashier', 'lab_tech', 'accountant'));

// Cashier settings
router.get('/senior-discount', settingsController.getSeniorDiscount);
router.put('/senior-discount', settingsController.updateSeniorDiscount);

// Departments
router.get('/departments', settingsController.getDepartments);
router.post('/departments', settingsController.createDepartment);
router.put('/departments/:id', settingsController.updateDepartment);
router.delete('/departments/:id', settingsController.deleteDepartment);

// Tests
router.get('/tests', settingsController.getTests);
router.post('/tests', settingsController.createTest);
router.put('/tests/:id', settingsController.updateTest);
router.delete('/tests/:id', settingsController.deleteTest);

export default router;
