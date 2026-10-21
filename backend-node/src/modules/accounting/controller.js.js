import * as accountingService from './service.js';
import { validateRecordExpense, validateSystemExport } from './validation.js';

// ============================================================
// EXPENSES
// ============================================================

export async function recordExpense(req, res, next) {
    try {
        validateRecordExpense(req.body);

        const { source_system, source_reference_id, description, amount, incurred_at } = req.body;
        const expense = await accountingService.recordExpense({
            source_system,
            source_reference_id,
            description,
            amount,
            incurred_at
        });
        res.status(201).json({ message: 'Expense recorded', expense });
    } catch (err) {
        next(err);
    }
}

export async function getExpenses(req, res, next) {
    try {
        const { source_system, from, to } = req.query;
        const expenses = await accountingService.getExpenses({ source_system, from, to });
        res.json({ expenses });
    } catch (err) {
        next(err);
    }
}

export async function getExpenseById(req, res, next) {
    try {
        const { id } = req.params;
        const expense = await accountingService.getExpenseById(id);
        res.json({ expense });
    } catch (err) {
        next(err);
    }
}

export async function getExpenseSummary(req, res, next) {
    try {
        const { from, to } = req.query;
        const summary = await accountingService.getExpenseSummary({ from, to });
        res.json({ summary });
    } catch (err) {
        next(err);
    }
}

// ============================================================
// EXPORT LOGS
// ============================================================

export async function getExportLogs(req, res, next) {
    try {
        const logs = await accountingService.getExportLogs();
        res.json({ logs });
    } catch (err) {
        next(err);
    }
}

export async function logMasterExport(req, res, next) {
    try {
        const { from, to, file_path } = req.body;
        const log = await accountingService.logMasterExport(req.user.id, { from, to }, file_path);
        res.status(201).json({ message: 'Master export logged', log });
    } catch (err) {
        next(err);
    }
}

export async function logSystemExport(req, res, next) {
    try {
        validateSystemExport(req.body);

        const { system, from, to, file_path } = req.body;
        const log = await accountingService.logSystemExport(system, req.user.id, { from, to }, file_path);
        res.status(201).json({ message: 'System export logged', log });
    } catch (err) {
        next(err);
    }
}

// ============================================================
// REPORTS
// ============================================================

export async function generateReport(req, res, next) {
    try {
        const { from, to } = req.query;
        const report = await accountingService.generateReport({ from, to });
        res.json({ report });
    } catch (err) {
        next(err);
    }
}
