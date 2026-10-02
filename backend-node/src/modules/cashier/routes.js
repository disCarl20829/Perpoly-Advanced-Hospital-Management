import express from 'express';
import * as cashierController from './controller.js.js';
import authenticate from '../../middleware/auth.middleware.js';
import authorize from '../../middleware/rbac.middleware.js';

const router = express.Router();

// All cashier routes require authentication and cashier or superadmin role
router.use(authenticate, authorize('cashier', 'superadmin'));

// Patients
router.post('/patients', cashierController.createPatient);
router.get('/patients/search', cashierController.searchPatients);
router.get('/patients', cashierController.getAllPatients);
router.get('/patients/:id', cashierController.getPatientById);

// Transaction types
router.post('/transaction-types', cashierController.createTransactionType);
router.get('/transaction-types', cashierController.getAllTransactionTypes);

// Transactions
router.post('/transactions', cashierController.createTransaction);
router.get('/transactions', cashierController.getAllTransactions);
router.get('/transactions/:id', cashierController.getTransactionById);
router.put('/transactions/:id/status', cashierController.updateTransactionStatus);

export default router;
