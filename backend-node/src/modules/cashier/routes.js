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
router.put('/patients/:id', cashierController.updatePatient);
router.delete('/patients/:id', cashierController.deletePatient);

// Transaction types
router.post('/transaction-types', cashierController.createTransactionType);
router.get('/transaction-types', cashierController.getAllTransactionTypes);
router.get('/transaction-types/:id', cashierController.getTransactionTypeById);
router.put('/transaction-types/:id', cashierController.updateTransactionType);
router.delete('/transaction-types/:id', cashierController.deleteTransactionType);

// Transactions
router.post('/transactions', cashierController.createTransaction);
router.get('/transactions', cashierController.getAllTransactions);
router.get('/transactions/:id', cashierController.getTransactionById);
router.put('/transactions/:id/status', cashierController.updateTransactionStatus);
router.put('/transactions/:id', cashierController.updateTransaction);
router.delete('/transactions/:id', cashierController.deleteTransaction);
router.post('/transactions/:id/items', cashierController.addTransactionItem);
router.put('/transactions/:id/items/:itemId', cashierController.updateTransactionItem);
router.delete('/transactions/:id/items/:itemId', cashierController.deleteTransactionItem);

export default router;
