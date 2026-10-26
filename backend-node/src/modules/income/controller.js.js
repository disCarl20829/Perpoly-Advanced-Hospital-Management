import * as incomeService from './service.js';
import { validateFilters, validatePeriod } from './validation.js';

/**
 * List income records.
 */
export async function getIncome(req, res, next) {
    try {
        validateFilters(req.query);

        const { status, mode_of_payment, from, to } = req.query;
        const income = await incomeService.getIncome({ status, mode_of_payment, from, to });

        res.json({ income });
    } catch (err) {
        next(err);
    }
}

/**
 * Summary grouped by daily / weekly / monthly.
 */
export async function getIncomeSummary(req, res, next) {
    try {
        const period = req.query.period || 'daily';
        validatePeriod(period);
        validateFilters(req.query);

        const { status, mode_of_payment, from, to } = req.query;
        const summary = await incomeService.getIncomeSummary(period, { status, mode_of_payment, from, to });

        res.json({ summary });
    } catch (err) {
        next(err);
    }
}

/**
 * Download an Excel workbook (Summary + Details).
 */
export async function exportIncome(req, res, next) {
    try {
        const period = req.query.period || 'daily';
        validatePeriod(period);
        validateFilters(req.query);

        const { status, mode_of_payment, from, to } = req.query;
        const buffer = await incomeService.generateIncomeExcel(period, { status, mode_of_payment, from, to });

        const stamp = new Date().toISOString().slice(0, 10);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="income-${period}-${stamp}.xlsx"`);
        res.setHeader('Content-Length', buffer.length);
        res.send(buffer);
    } catch (err) {
        next(err);
    }
}
