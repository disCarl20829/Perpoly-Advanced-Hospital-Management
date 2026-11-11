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
 * Download the client-format Excel workbook.
 * Daily = one sheet. Weekly/monthly = one sheet per day + Summary.
 */
export async function exportIncome(req, res, next) {
    try {
        const period = req.query.period || 'daily';
        validatePeriod(period);
        validateFilters(req.query);

        const { status, mode_of_payment, from, to } = req.query;
        const report = await incomeService.generateIncomeExcel(period, { status, mode_of_payment, from, to });

        const fileName = report.from === report.to
            ? `daily-sales-report-${report.from}.xlsx`
            : `sales-report-${report.from}_to_${report.to}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        res.setHeader('Content-Length', report.buffer.length);
        res.send(report.buffer);
    } catch (err) {
        next(err);
    }
}
