import express from 'express';
import * as incomeController from './controller.js.js';
import authenticate from '../../middleware/auth.middleware.js';

const router = express.Router();

// Every authenticated user can view and export income.
router.use(authenticate);

router.get('/', incomeController.getIncome);
router.get('/summary', incomeController.getIncomeSummary);
router.get('/export', incomeController.exportIncome);

export default router;
