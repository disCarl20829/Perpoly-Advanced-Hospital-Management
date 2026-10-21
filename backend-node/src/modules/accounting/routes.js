import express from 'express';
import * as accountingController from './controller.js.js';
import authenticate from '../../middleware/auth.middleware.js';
import authorize from '../../middleware/rbac.middleware.js';

const router = express.Router();

// All accounting routes require authentication and accountant or superadmin role
router.use(authenticate, authorize('accountant', 'superadmin'));

// Expenses
router.post('/expenses', accountingController.recordExpense);
router.get('/expenses', accountingController.getExpenses);
router.get('/expenses/summary', accountingController.getExpenseSummary);
router.get('/expenses/:id', accountingController.getExpenseById);

// Reports
router.get('/reports', accountingController.generateReport);

// Exports
router.post('/exports/master', accountingController.logMasterExport);
router.post('/exports/system', accountingController.logSystemExport);
router.get('/exports/logs', accountingController.getExportLogs);

export default router;
