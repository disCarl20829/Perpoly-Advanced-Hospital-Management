import ExcelJS from 'exceljs';
import * as incomeRepo from './repository.js';
import { validatePeriod } from './validation.js';

const BRAND_BLUE = 'FF1E3A8A';
const BRAND_GREEN = 'FF15803D';
const WHITE = 'FFFFFFFF';
const LIGHT_GREY = 'FFF1F5F9';

// ============================================================
// QUERIES
// ============================================================

/**
 * Get income records with optional filters.
 * @param {object} filters - { status, mode_of_payment, from, to }
 * @returns {array} list of income records
 */
export async function getIncome(filters = {}) {
    return await incomeRepo.findAllIncome(filters);
}

/**
 * Build a summary grouped by day/week/month, plus totals and
 * a per-mode-of-payment breakdown.
 * @param {string} period - 'daily' | 'weekly' | 'monthly'
 * @param {object} filters - { status, mode_of_payment, from, to }
 * @returns {object} summary
 */
export async function getIncomeSummary(period, filters = {}) {
    validatePeriod(period);

    const [groups, totals, byMode] = await Promise.all([
        incomeRepo.getIncomeGroups(period, filters),
        incomeRepo.getIncomeTotals(filters),
        incomeRepo.getIncomeByMode(filters)
    ]);

    return {
        period,
        filters: {
            status: filters.status || null,
            mode_of_payment: filters.mode_of_payment || null,
            from: filters.from || null,
            to: filters.to || null
        },
        totals,
        groups,
        by_mode: byMode
    };
}

// ============================================================
// EXCEL EXPORT (exceljs for now; FastAPI can replace this later)
// ============================================================

/**
 * Generate a two-sheet Excel workbook: Summary + Details.
 * @param {string} period - 'daily' | 'weekly' | 'monthly'
 * @param {object} filters - { status, mode_of_payment, from, to }
 * @returns {Buffer} xlsx file buffer
 */
export async function generateIncomeExcel(period, filters = {}) {
    validatePeriod(period);

    const [summary, records] = await Promise.all([
        getIncomeSummary(period, filters),
        incomeRepo.findAllIncome(filters)
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PerPoly Hospital Management System';
    workbook.created = new Date();

    buildSummarySheet(workbook, summary, records);
    buildDetailSheet(workbook, records);

    return await workbook.xlsx.writeBuffer();
}

/**
 * Summary sheet: header, grand totals, grouped totals, mode breakdown.
 */
function buildSummarySheet(workbook, summary, records) {
    const sheet = workbook.addWorksheet('Summary');
    sheet.columns = [{ width: 26 }, { width: 18 }, { width: 22 }];

    sheet.mergeCells('A1:C1');
    sheet.getCell('A1').value = 'PerPoly Hospital — Income Summary';
    sheet.getCell('A1').font = { bold: true, size: 16, color: { argb: BRAND_BLUE } };
    sheet.getCell('A1').alignment = { vertical: 'middle' };
    sheet.getRow(1).height = 26;

    sheet.mergeCells('A2:C2');
    sheet.getCell('A2').value = describeFilters(summary, records);
    sheet.getCell('A2').font = { size: 10, color: { argb: 'FF475569' } };

    sheet.getCell('A4').value = 'Total Income (PHP)';
    sheet.getCell('A4').font = { bold: true };
    sheet.getCell('B4').value = Number(summary.totals.total || 0);
    sheet.getCell('B4').numFmt = '#,##0.00';
    sheet.getCell('B4').font = { bold: true, color: { argb: BRAND_GREEN } };

    sheet.getCell('A5').value = 'Transactions';
    sheet.getCell('A5').font = { bold: true };
    sheet.getCell('B5').value = Number(summary.totals.count || 0);

    // Grouped totals
    let row = 7;
    sheet.getCell(`A${row}`).value = 'Period';
    sheet.getCell(`B${row}`).value = 'Transactions';
    sheet.getCell(`C${row}`).value = 'Total (PHP)';
    styleHeaderRow(sheet.getRow(row));

    row += 1;
    if (summary.groups.length === 0) {
        sheet.getCell(`A${row}`).value = 'No income records for this period.';
        sheet.getCell(`A${row}`).font = { italic: true, color: { argb: 'FF64748B' } };
        row += 1;
    } else {
        for (const group of summary.groups) {
            sheet.getCell(`A${row}`).value = periodLabel(summary.period, group.period_start);
            sheet.getCell(`B${row}`).value = Number(group.count);
            sheet.getCell(`C${row}`).value = Number(group.total);
            sheet.getCell(`C${row}`).numFmt = '#,##0.00';
            row += 1;
        }
    }

    // Mode of payment breakdown
    row += 1;
    sheet.getCell(`A${row}`).value = 'Mode of Payment';
    sheet.getCell(`B${row}`).value = 'Transactions';
    sheet.getCell(`C${row}`).value = 'Total (PHP)';
    styleHeaderRow(sheet.getRow(row), BRAND_GREEN);

    row += 1;
    if (summary.by_mode.length === 0) {
        sheet.getCell(`A${row}`).value = 'No payments recorded.';
        sheet.getCell(`A${row}`).font = { italic: true, color: { argb: 'FF64748B' } };
        row += 1;
    } else {
        for (const mode of summary.by_mode) {
            sheet.getCell(`A${row}`).value = titleCase(mode.mode_of_payment);
            sheet.getCell(`B${row}`).value = Number(mode.count);
            sheet.getCell(`C${row}`).value = Number(mode.total);
            sheet.getCell(`C${row}`).numFmt = '#,##0.00';
            row += 1;
        }
    }

    sheet.getCell(`A${row + 1}`).value = `Generated ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}`;
    sheet.getCell(`A${row + 1}`).font = { size: 9, italic: true, color: { argb: 'FF94A3B8' } };
}

/**
 * Details sheet: one row per income record.
 */
function buildDetailSheet(workbook, records) {
    const sheet = workbook.addWorksheet('Details');
    sheet.columns = [
        { header: 'Receipt No', key: 'receipt_no', width: 22 },
        { header: 'Date', key: 'issued_at_local', width: 18 },
        { header: 'Patient', key: 'patient_name', width: 30 },
        { header: 'Cashier', key: 'cashier_name', width: 30 },
        { header: 'Mode of Payment', key: 'mode_of_payment', width: 20 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Amount (PHP)', key: 'amount', width: 16 }
    ];

    styleHeaderRow(sheet.getRow(1));
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: 'A1', to: 'G1' };

    for (const record of records) {
        const row = sheet.addRow({
            receipt_no: record.receipt_no,
            issued_at_local: record.issued_at_local,
            patient_name: record.patient_name || '—',
            cashier_name: record.cashier_name || '—',
            mode_of_payment: titleCase(record.mode_of_payment),
            status: titleCase(record.status),
            amount: Number(record.amount)
        });
        row.getCell('amount').numFmt = '#,##0.00';
    }

    if (records.length > 0) {
        const totalRow = sheet.addRow({
            receipt_no: 'TOTAL',
            amount: records.reduce((sum, r) => sum + Number(r.amount), 0)
        });
        totalRow.font = { bold: true };
        totalRow.getCell('amount').numFmt = '#,##0.00';
        totalRow.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GREY } };
        });
    }
}

// ============================================================
// FORMATTING HELPERS
// ============================================================

function styleHeaderRow(row, fillColor = BRAND_BLUE) {
    row.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: WHITE } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    row.height = 20;
}

function periodLabel(period, value) {
    if (period === 'weekly') return `Week of ${value}`;
    if (period === 'monthly') return value.slice(0, 7);
    return value;
}

function describeFilters(summary, records) {
    const parts = [
        `Period: ${titleCase(summary.period)}`,
        `Status: ${summary.filters.status ? titleCase(summary.filters.status) : 'All'}`,
        `Mode: ${summary.filters.mode_of_payment ? titleCase(summary.filters.mode_of_payment) : 'All'}`,
        `Range: ${summary.filters.from || 'Start'} → ${summary.filters.to || 'Today'}`,
        `Records: ${records.length}`
    ];
    return parts.join('   |   ');
}

function titleCase(value) {
    if (!value) return '';
    return String(value)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}
