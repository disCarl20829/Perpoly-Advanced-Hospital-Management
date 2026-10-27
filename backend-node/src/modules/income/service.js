import ExcelJS from 'exceljs';
import * as incomeRepo from './repository.js';
import { validatePeriod } from './validation.js';

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
// CLIENT SALES REPORT TEMPLATE
// ============================================================
//
// The client's printed report has a fixed set of examination columns.
// Anything else (X-Ray, Holter, newer tests) is aggregated in OTHERS
// and itemized on the "Other Tests" sheet so no revenue is lost.

const COMPANY_NAME = 'PERPETUAL MEDICAL MULTI-SPECIALTY AND DIAGNOSTIC CENTER, INC.';
const COMPANY_ADDRESS = 'Perpetual Polyclinic Bldg., Quirante II St., Magugpo Poblacion, Tagum City';

const MONEY_FMT = '#,##0.00';
const ORANGE = 'FFFCE4D6';
const MUTED = 'FF64748B';
const BLACK = 'FF000000';

const THIN = { style: 'thin', color: { argb: BLACK } };
const BORDER_ALL = { top: THIN, left: THIN, bottom: THIN, right: THIN };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Fixed columns from the client sample, in the same order.
// `matches` receives a normalized (uppercase, punctuation-free) name.
const REPORT_COLUMNS = [
    { key: 'FBS', label: 'FBS', matches: (n) => n === 'FBS' },
    { key: 'CREA', label: 'CREA', matches: (n) => n === 'CREATININE' || n === 'CREA' },
    { key: 'SUA', label: 'SUA', matches: (n) => n === 'S URIC ACID' || n === 'URIC ACID' || n === 'SUA' },
    { key: 'SGPT', label: 'SGPT', matches: (n) => n === 'SGPT' },
    { key: 'LIPID', label: 'LIPID', matches: (n) => n === 'LIPID PROFILE' || n === 'LIPID' },
    { key: 'BUN', label: 'BUN', matches: (n) => n === 'BUN' },
    { key: 'HBA1C', label: 'HBA1C', matches: (n) => n === 'HBA1C' },
    { key: 'TSH', label: 'TSH', matches: (n) => n === 'TSH' },
    { key: 'FT4', label: 'FT4', matches: (n) => n === 'FT4' },
    { key: 'FT3', label: 'FT3', matches: (n) => n === 'FT3' },
    { key: 'PT SERUM', label: 'PT SERUM', matches: (n) => n === 'PT SERUM' || n === 'PROTIME INR' || n === 'PT INR' || n === 'PT' },
    { key: 'DENGUE TEST', label: 'DENGUE TEST', matches: (n) => n.startsWith('DENGUE') },
    { key: 'CBC PLT', label: 'CBC PLT', matches: (n) => n === 'CBC PLT' || n === 'CBC' },
    { key: 'CT BT', label: 'CT BT', matches: (n) => n === 'CT BT' || n === 'BT' || n === 'CT' },
    { key: 'SEMINALYSIS', label: 'SEMINALYSIS', matches: (n) => n.includes('SEMINALYSIS') || n.includes('SEMENALYSIS') || n.includes('SEMEN ANALYSIS') },
    { key: 'UA', label: 'UA', matches: (n) => n.startsWith('URINALYSIS') || n === 'UA' },
    { key: 'USD SOFT TISSUE', label: 'USD SOFT TISSUE', matches: (n) => n.includes('SOFT TISSUE') },
    { key: 'USD W.AB', label: 'USD W.AB', matches: (n) => n === 'WHOLE ABDOMEN' || n === 'USD W AB' },
    { key: 'ECG', label: 'ECG', matches: (n) => n === 'ECG' },
    { key: '2D ECHO', label: '2D ECHO', matches: (n) => n.includes('2D ECHO') }
];

const FIRST_TEST_COL = 4;
const LAST_TEST_COL = FIRST_TEST_COL + REPORT_COLUMNS.length - 1;
const OTHER_COL = LAST_TEST_COL + 1;
const TOTAL_COL = OTHER_COL + 1;

const DEPARTMENT_ROWS = [
    { key: 'LABORATORY', label: 'LABORATORY' },
    { key: 'ULTRASOUND', label: 'ULTRASOUND' },
    { key: '2D ECHO', label: '2D ECHO' },
    { key: 'ECG', label: 'ECG' },
    { key: 'X-RAY', label: 'X-RAY' },
    { key: 'HOLTER', label: 'HOLTER' },
    { key: 'OTHERS', label: 'OTHER / UNCATEGORIZED' }
];

const DEPARTMENT_START_COL = 21; // U
const DEPARTMENT_LABEL_END_COL = 24; // X
const DEPARTMENT_AMOUNT_COL = 25; // Y

// ============================================================
// GENERATOR
// ============================================================

/**
 * Generate the client-format workbook. Daily ranges produce one
 * worksheet. Weekly/monthly ranges produce one worksheet per day plus
 * a summary sheet. Any non-template tests are itemized separately.
 * @param {string} period - 'daily' | 'weekly' | 'monthly'
 * @param {object} filters - { status, mode_of_payment, from, to }
 * @returns {object} { buffer, from, to }
 */
export async function generateIncomeExcel(period, filters = {}) {
    validatePeriod(period);

    const { from, to } = resolveReportRange(period, filters);
    const rows = await incomeRepo.findSalesReportTransactions({
        status: filters.status,
        mode_of_payment: filters.mode_of_payment,
        from,
        to
    });

    const transactions = groupTransactions(rows);
    let days = groupTransactionsByDay(transactions);

    if (days.length === 0) {
        days = [{ date: from, transactions: [], totals: summarizeDay([]) }];
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PerPoly Hospital Management System';
    workbook.created = new Date();

    if (period !== 'daily' || days.length > 1) {
        buildSummarySheet(workbook, days, period, from, to);
    }

    for (const day of days) {
        buildDailySheet(workbook, day);
    }

    buildOtherTestsSheet(workbook, days, from, to);

    const buffer = await workbook.xlsx.writeBuffer();
    return { buffer, from, to };
}

// ============================================================
// RANGE / DATA PREPARATION
// ============================================================

function manilaToday() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());
}

function startOfWeek(dateStr) {
    const date = new Date(`${dateStr}T00:00:00Z`);
    const day = date.getUTCDay(); // 0 = Sunday, 1 = Monday
    const diff = (day + 6) % 7;
    date.setUTCDate(date.getUTCDate() - diff);
    return date.toISOString().slice(0, 10);
}

function resolveReportRange(period, filters) {
    const today = manilaToday();
    let from = filters.from || '';
    let to = filters.to || '';

    if (from && !to) to = from;
    if (!from && to) from = to;

    if (!from && !to) {
        if (period === 'weekly') {
            from = startOfWeek(today);
            to = today;
        } else if (period === 'monthly') {
            from = `${today.slice(0, 7)}-01`;
            to = today;
        } else {
            from = today;
            to = today;
        }
    }

    if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
        const err = new Error('from and to must be valid YYYY-MM-DD dates');
        err.status = 400;
        throw err;
    }

    if (from > to) {
        const err = new Error('from must be before or equal to to');
        err.status = 400;
        throw err;
    }

    return { from, to };
}

function normalizeName(value) {
    return String(value || '')
        .toUpperCase()
        .replace(/&/g, ' AND ')
        .replace(/[^A-Z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function findReportColumn(typeName) {
    const normalized = normalizeName(typeName);
    return REPORT_COLUMNS.find((column) => column.matches(normalized)) || null;
}

function departmentForItem(category, reportColumn) {
    if (reportColumn?.key === '2D ECHO') return '2D ECHO';

    const normalized = normalizeName(category);
    if (normalized === 'X RAY') return 'X-RAY';
    if (normalized === 'HOLTER') return 'HOLTER';
    if (normalized === 'ECG') return 'ECG';
    if (normalized === 'ULTRASOUND') return 'ULTRASOUND';
    if (normalized === '2D ECHO') return '2D ECHO';

    // Legacy departments deactivated during the price-list migration. Their
    // historical tests still belong to a real reporting group.
    if (
        normalized === 'LABORATORY' ||
        normalized === 'URINALYSIS' ||
        normalized === 'FECALYSIS' ||
        normalized === 'CBC'
    ) {
        return 'LABORATORY';
    }

    return 'OTHERS';
}

function roundMoney(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

/**
 * Allocate the transaction's net total across its gross item amounts.
 * The last item absorbs rounding cents so the row always sums exactly
 * to the transaction total.
 */
function allocateNetAmounts(items, netTotal) {
    if (items.length === 0) return [];

    const grossTotal = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    if (grossTotal <= 0) {
        return items.map((item, index) => ({
            ...item,
            netAmount: index === items.length - 1 ? roundMoney(netTotal) : 0
        }));
    }

    let remaining = roundMoney(netTotal);
    return items.map((item, index) => {
        if (index === items.length - 1) {
            return { ...item, netAmount: roundMoney(remaining) };
        }
        const share = roundMoney(netTotal * (Number(item.amount) / grossTotal));
        remaining = roundMoney(remaining - share);
        return { ...item, netAmount: share };
    });
}

function processTransaction(transaction) {
    const items = allocateNetAmounts(transaction.items, transaction.total_amount);
    const columns = {};
    const departments = Object.fromEntries(DEPARTMENT_ROWS.map((row) => [row.key, 0]));
    const otherItems = [];

    for (const item of items) {
        const reportColumn = findReportColumn(item.type_name);
        const columnKey = reportColumn ? reportColumn.key : 'OTHERS';
        const department = departmentForItem(item.category, reportColumn);

        columns[columnKey] = roundMoney((columns[columnKey] || 0) + item.netAmount);
        departments[department] = roundMoney((departments[department] || 0) + item.netAmount);

        if (!reportColumn) {
            otherItems.push({
                ...item,
                discountAmount: roundMoney(Number(item.amount) - item.netAmount)
            });
        }
    }

    // Transactions without items (legacy data) still need their total shown.
    if (items.length === 0 && transaction.total_amount > 0) {
        columns.OTHERS = roundMoney((columns.OTHERS || 0) + transaction.total_amount);
        departments.OTHERS = roundMoney((departments.OTHERS || 0) + transaction.total_amount);
    }

    // Keep the ledger row reconciled to the net transaction total.
    const columnSum = roundMoney(Object.values(columns).reduce((sum, value) => sum + value, 0));
    const difference = roundMoney(transaction.total_amount - columnSum);
    if (Math.abs(difference) >= 0.01) {
        columns.OTHERS = roundMoney((columns.OTHERS || 0) + difference);
        departments.OTHERS = roundMoney((departments.OTHERS || 0) + difference);
    }

    return {
        ...transaction,
        items,
        columns,
        departments,
        otherItems
    };
}

function groupTransactions(rows) {
    const byId = new Map();

    for (const row of rows) {
        if (!byId.has(row.id)) {
            byId.set(row.id, {
                id: row.id,
                receipt_no: row.receipt_no,
                issued_at: row.issued_at,
                local_date: row.local_date,
                status: row.status,
                mode_of_payment: row.mode_of_payment,
                subtotal: Number(row.subtotal || 0),
                discount_rate: Number(row.discount_rate || 0),
                discount_amount: Number(row.discount_amount || 0),
                total_amount: Number(row.total_amount || 0),
                is_senior: row.is_senior === true,
                last_name: row.last_name,
                first_name: row.first_name,
                middle_name: row.middle_name,
                extra_name: row.extra_name,
                items: []
            });
        }

        if (row.item_id) {
            byId.get(row.id).items.push({
                id: row.item_id,
                qty: Number(row.qty || 0),
                unit_price: Number(row.unit_price || 0),
                amount: Number(row.amount || 0),
                description: row.description,
                type_name: row.type_name,
                category: row.category
            });
        }
    }

    return [...byId.values()].map(processTransaction);
}

function summarizeDay(transactions) {
    const totals = {
        transactions: transactions.length,
        regular: 0,
        package: 0,
        senior: 0,
        totalSales: 0,
        totalDeposit: 0,
        cashEnd: 0,
        departments: Object.fromEntries(DEPARTMENT_ROWS.map((row) => [row.key, 0])),
        columns: {}
    };

    for (const transaction of transactions) {
        if (transaction.is_senior) {
            totals.senior = roundMoney(totals.senior + transaction.total_amount);
        } else {
            totals.regular = roundMoney(totals.regular + transaction.total_amount);
        }

        totals.totalSales = roundMoney(totals.totalSales + transaction.total_amount);

        for (const [key, value] of Object.entries(transaction.departments)) {
            totals.departments[key] = roundMoney((totals.departments[key] || 0) + value);
        }
        for (const [key, value] of Object.entries(transaction.columns)) {
            totals.columns[key] = roundMoney((totals.columns[key] || 0) + value);
        }
    }

    // Packages are not configured yet. Deposits are not tracked yet.
    totals.package = 0;
    totals.totalDeposit = 0;
    totals.cashEnd = roundMoney(totals.totalSales - totals.totalDeposit);

    return totals;
}

function groupTransactionsByDay(transactions) {
    const byDay = new Map();

    for (const transaction of transactions) {
        if (!byDay.has(transaction.local_date)) {
            byDay.set(transaction.local_date, []);
        }
        byDay.get(transaction.local_date).push(transaction);
    }

    return [...byDay.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([date, dayTransactions]) => {
            const sorted = [...dayTransactions].sort((left, right) => {
                const byIssued = new Date(left.issued_at) - new Date(right.issued_at);
                if (byIssued !== 0) return byIssued;
                return String(left.receipt_no).localeCompare(String(right.receipt_no));
            });

            return {
                date,
                transactions: sorted,
                totals: summarizeDay(sorted)
            };
        });
}

function sumDayTotals(days) {
    const total = {
        transactions: 0,
        regular: 0,
        package: 0,
        senior: 0,
        totalSales: 0,
        totalDeposit: 0,
        cashEnd: 0,
        departments: Object.fromEntries(DEPARTMENT_ROWS.map((row) => [row.key, 0]))
    };

    for (const day of days) {
        total.transactions += day.totals.transactions;
        total.regular = roundMoney(total.regular + day.totals.regular);
        total.package = roundMoney(total.package + day.totals.package);
        total.senior = roundMoney(total.senior + day.totals.senior);
        total.totalSales = roundMoney(total.totalSales + day.totals.totalSales);
        total.totalDeposit = roundMoney(total.totalDeposit + day.totals.totalDeposit);

        for (const [key, value] of Object.entries(day.totals.departments)) {
            total.departments[key] = roundMoney((total.departments[key] || 0) + value);
        }
    }

    total.cashEnd = roundMoney(total.totalSales - total.totalDeposit);
    return total;
}

// ============================================================
// SHEET BUILDERS
// ============================================================

function buildDailySheet(workbook, day) {
    const sheet = workbook.addWorksheet(day.date);
    setupSheet(sheet, { freeze: true, headerRows: 5 });

    sheet.getColumn(1).width = 4.5;
    sheet.getColumn(2).width = 12;
    sheet.getColumn(3).width = 28;
    for (let col = FIRST_TEST_COL; col <= LAST_TEST_COL; col += 1) {
        sheet.getColumn(col).width = 4.6;
    }
    sheet.getColumn(OTHER_COL).width = 9;
    sheet.getColumn(TOTAL_COL).width = 11;

    mergeAndSet(sheet, 1, 1, 1, TOTAL_COL, COMPANY_NAME, { bold: true, size: 12 }, 'center');
    mergeAndSet(sheet, 2, 1, 2, TOTAL_COL, COMPANY_ADDRESS, { size: 9 }, 'center');
    sheet.getRow(1).height = 18;
    sheet.getRow(2).height = 13;

    mergeAndSet(sheet, 3, 1, 3, 3, 'DAILY SALES REPORT-REGULAR', { bold: true, size: 10 }, 'left');
    setCell(sheet, 3, 4, 'DATE:', { bold: true, size: 9 }, 'right');
    mergeAndSet(sheet, 3, 5, 3, 7, formatReportDate(day.date), { size: 9 }, 'left');

    mergeAndSet(sheet, 4, FIRST_TEST_COL, 4, LAST_TEST_COL, 'SERVICE INVOICE', { bold: true, size: 10 }, 'center');

    setCell(sheet, 5, 1, 'No.', { bold: true, size: 7 }, 'center');
    setCell(sheet, 5, 2, 'Service Invoice Number', { bold: true, size: 7 }, 'center');
    setCell(sheet, 5, 3, "Patient's Name", { bold: true, size: 7 }, 'center');

    REPORT_COLUMNS.forEach((column, index) => {
        const cell = setCell(sheet, 5, FIRST_TEST_COL + index, column.label, { bold: true, size: 7 }, 'center');
        cell.alignment = { horizontal: 'center', vertical: 'middle', textRotation: 90, wrapText: false };
    });

    const otherHeader = setCell(sheet, 5, OTHER_COL, 'OTHERS', { bold: true, size: 7 }, 'center');
    otherHeader.alignment = { horizontal: 'center', vertical: 'middle', textRotation: 90, wrapText: false };

    setCell(sheet, 5, TOTAL_COL, 'TOTAL', { bold: true, size: 7 }, 'center');
    sheet.getRow(5).height = 108;
    borderRange(sheet, 1, 5, TOTAL_COL, 5);

    let row = 6;
    for (const transaction of day.transactions) {
        const values = [];
        values[1] = row - 5;
        values[2] = invoiceSuffix(transaction.receipt_no);
        values[3] = formatPatientName(transaction);

        for (let col = FIRST_TEST_COL; col <= TOTAL_COL; col += 1) {
            values[col] = null;
        }

        REPORT_COLUMNS.forEach((column, index) => {
            const amount = transaction.columns[column.key];
            if (amount) values[FIRST_TEST_COL + index] = roundMoney(amount);
        });

        if (transaction.columns.OTHERS) {
            values[OTHER_COL] = roundMoney(transaction.columns.OTHERS);
        }
        values[TOTAL_COL] = roundMoney(transaction.total_amount);

        for (let col = 1; col <= TOTAL_COL; col += 1) {
            const cell = sheet.getCell(row, col);
            cell.value = values[col] ?? null;
            cell.font = { name: 'Calibri', size: 8, bold: col === TOTAL_COL };
            cell.border = BORDER_ALL;

            if (col === 1 || col === 2) {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            } else if (col === 3) {
                cell.alignment = { horizontal: 'left', vertical: 'middle' };
            } else {
                cell.alignment = { horizontal: 'right', vertical: 'middle' };
                cell.numFmt = MONEY_FMT;
            }
        }

        row += 1;
    }

    if (day.transactions.length === 0) {
        mergeAndSet(sheet, row, 1, row, TOTAL_COL, 'No transactions for this date.', { italic: true, size: 9, color: { argb: MUTED } }, 'center');
        borderRange(sheet, 1, row, TOTAL_COL, row);
        row += 1;
    }

    const totalsRow = row;
    mergeAndSet(sheet, totalsRow, 1, totalsRow, 3, 'TOTAL', { bold: true, size: 8 }, 'right');

    for (let col = FIRST_TEST_COL; col <= TOTAL_COL; col += 1) {
        let value = 0;

        if (col === TOTAL_COL) {
            value = day.totals.totalSales;
        } else if (col === OTHER_COL) {
            value = day.totals.columns.OTHERS || 0;
        } else {
            const column = REPORT_COLUMNS[col - FIRST_TEST_COL];
            value = day.totals.columns[column.key] || 0;
        }

        const cell = sheet.getCell(totalsRow, col);
        cell.value = col === TOTAL_COL || value
            ? roundMoney(value)
            : null;
        cell.numFmt = MONEY_FMT;
        cell.font = { bold: true, size: 8 };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
    }

    for (let col = 1; col <= TOTAL_COL; col += 1) {
        const cell = sheet.getCell(totalsRow, col);
        cell.fill = solid(ORANGE);
        cell.border = BORDER_ALL;
    }
    sheet.getRow(totalsRow).height = 15;

    const summaryStart = totalsRow + 3;
    buildLeftSummary(sheet, summaryStart, day.totals);
    buildDepartmentSummary(sheet, summaryStart, day.totals);

    const noteRow = summaryStart + 9;
    mergeAndSet(
        sheet,
        noteRow,
        1,
        noteRow,
        TOTAL_COL,
        '✓ = senior citizen (discount applied). Ledger amounts are net of the senior discount. ' +
            'Package examinations are not yet configured; TOTAL DEPOSIT is not tracked and is shown as 0.00.',
        { italic: true, size: 8, color: { argb: MUTED } },
        'left'
    );
    sheet.getRow(noteRow).height = 30;

    return sheet;
}

function buildLeftSummary(sheet, startRow, totals) {
    mergeAndSet(sheet, startRow, 1, startRow, 3, 'SUMMARY:', { bold: true, size: 8 }, 'left');
    styleOrangeRow(sheet, startRow, 1, 3);

    const rows = [
        { label: 'REGULAR', value: totals.regular, bold: false, rule: false },
        { label: 'PACKAGE (Employment)', value: totals.package, bold: false, rule: false },
        { label: 'SENIOR', value: totals.senior, bold: false, rule: false },
        { label: 'TOTAL SALES', value: totals.totalSales, bold: true, rule: true },
        { label: 'TOTAL DEPOSIT', value: totals.totalDeposit, bold: false, rule: false },
        { label: 'CASH END', value: totals.cashEnd, bold: true, rule: true }
    ];

    rows.forEach((entry, index) => {
        const row = startRow + 1 + index;
        mergeAndSet(sheet, row, 1, row, 2, entry.label, { bold: entry.bold, size: 8 }, 'left');
        const amountCell = setCell(sheet, row, 3, roundMoney(entry.value), { bold: entry.bold, size: 8 }, 'right');
        amountCell.numFmt = MONEY_FMT;
        borderRange(sheet, 1, row, 3, row);

        if (entry.rule) {
            for (let col = 1; col <= 3; col += 1) {
                const cell = sheet.getCell(row, col);
                cell.border = {
                    ...cell.border,
                    top: { style: 'medium', color: { argb: BLACK } }
                };
            }
        }
    });
}

function buildDepartmentSummary(sheet, startRow, totals) {
    mergeAndSet(sheet, startRow, DEPARTMENT_START_COL, startRow, DEPARTMENT_LABEL_END_COL, 'DEPARTMENT', { bold: true, size: 8 }, 'center');
    setCell(sheet, startRow, DEPARTMENT_AMOUNT_COL, 'TOTAL', { bold: true, size: 8 }, 'center');
    styleOrangeRow(sheet, startRow, DEPARTMENT_START_COL, DEPARTMENT_AMOUNT_COL);

    const rows = [
        ...DEPARTMENT_ROWS.filter((entry) => Number(totals.departments[entry.key] || 0) > 0),
        { key: 'TOTAL', label: 'TOTAL' }
    ];

    rows.forEach((entry, index) => {
        const row = startRow + 1 + index;
        const isTotal = entry.key === 'TOTAL';
        const value = isTotal ? totals.totalSales : (totals.departments[entry.key] || 0);

        mergeAndSet(sheet, row, DEPARTMENT_START_COL, row, DEPARTMENT_LABEL_END_COL, entry.label, { bold: isTotal, size: 8 }, 'left');
        const amountCell = setCell(sheet, row, DEPARTMENT_AMOUNT_COL, roundMoney(value), { bold: isTotal, size: 8 }, 'right');
        amountCell.numFmt = MONEY_FMT;
        borderRange(sheet, DEPARTMENT_START_COL, row, DEPARTMENT_AMOUNT_COL, row);

        if (isTotal) {
            for (let col = DEPARTMENT_START_COL; col <= DEPARTMENT_AMOUNT_COL; col += 1) {
                const cell = sheet.getCell(row, col);
                cell.fill = solid(ORANGE);
                cell.border = {
                    ...cell.border,
                    top: { style: 'medium', color: { argb: BLACK } }
                };
            }
        }
    });
}

function buildSummarySheet(workbook, days, period, from, to) {
    const sheet = workbook.addWorksheet('Summary');
    const headers = [
        'Date',
        'Transactions',
        'Regular',
        'Package (Employment)',
        'Senior',
        'Total Sales',
        'Total Deposit',
        'Cash End',
        'Laboratory',
        'Ultrasound',
        '2D Echo',
        'ECG',
        'X-Ray',
        'Holter',
        'Others',
        'Total'
    ];

    const widths = [12, 11, 12, 14, 12, 13, 13, 12, 12, 12, 10, 10, 10, 10, 10, 14];
    widths.forEach((width, index) => {
        sheet.getColumn(index + 1).width = width;
    });

    setupSheet(sheet, { freeze: false, headerRows: 6 });

    mergeAndSet(sheet, 1, 1, 1, headers.length, COMPANY_NAME, { bold: true, size: 12 }, 'center');
    mergeAndSet(sheet, 2, 1, 2, headers.length, COMPANY_ADDRESS, { size: 9 }, 'center');
    mergeAndSet(sheet, 3, 1, 3, headers.length, summaryTitle(period), { bold: true, size: 11 }, 'center');
    mergeAndSet(sheet, 4, 1, 4, headers.length, formatRange(from, to), { size: 9 }, 'center');

    headers.forEach((label, index) => {
        setCell(sheet, 6, index + 1, label, { bold: true, size: 8 }, 'center');
    });
    sheet.getRow(6).height = 30;
    borderRange(sheet, 1, 6, headers.length, 6);

    let row = 7;
    for (const day of days) {
        const values = [
            formatReportDate(day.date),
            day.totals.transactions,
            day.totals.regular,
            day.totals.package,
            day.totals.senior,
            day.totals.totalSales,
            day.totals.totalDeposit,
            day.totals.cashEnd,
            day.totals.departments.LABORATORY || 0,
            day.totals.departments.ULTRASOUND || 0,
            day.totals.departments['2D ECHO'] || 0,
            day.totals.departments.ECG || 0,
            day.totals.departments['X-RAY'] || 0,
            day.totals.departments.HOLTER || 0,
            day.totals.departments.OTHERS || 0,
            day.totals.totalSales
        ];

        values.forEach((value, index) => {
            const cell = sheet.getCell(row, index + 1);
            cell.value = typeof value === 'number' ? roundMoney(value) : value;
            cell.font = { size: 8 };
            cell.border = BORDER_ALL;
            cell.alignment = {
                horizontal: index === 0 || index === 1 ? 'center' : 'right',
                vertical: 'middle'
            };
            if (index >= 2) cell.numFmt = MONEY_FMT;
        });

        row += 1;
    }

    const totals = sumDayTotals(days);
    const values = [
        'TOTAL',
        totals.transactions,
        totals.regular,
        totals.package,
        totals.senior,
        totals.totalSales,
        totals.totalDeposit,
        totals.cashEnd,
        totals.departments.LABORATORY || 0,
        totals.departments.ULTRASOUND || 0,
        totals.departments['2D ECHO'] || 0,
        totals.departments.ECG || 0,
        totals.departments['X-RAY'] || 0,
        totals.departments.HOLTER || 0,
        totals.departments.OTHERS || 0,
        totals.totalSales
    ];

    values.forEach((value, index) => {
        const cell = sheet.getCell(row, index + 1);
        cell.value = typeof value === 'number' ? roundMoney(value) : value;
        cell.font = { bold: true, size: 8 };
        cell.fill = solid(ORANGE);
        cell.border = BORDER_ALL;
        cell.alignment = {
            horizontal: index === 0 || index === 1 ? 'center' : 'right',
            vertical: 'middle'
        };
        if (index >= 2) cell.numFmt = MONEY_FMT;
    });

    return sheet;
}

function buildOtherTestsSheet(workbook, days, from, to) {
    const sheet = workbook.addWorksheet('Other Tests');
    const headers = [
        'Date',
        'Service Invoice No.',
        'Patient',
        'Department',
        'Examination',
        'Qty',
        'Unit Price',
        'Gross',
        'Discount',
        'Net'
    ];

    const widths = [12, 14, 28, 18, 30, 6, 12, 12, 12, 12];
    widths.forEach((width, index) => {
        sheet.getColumn(index + 1).width = width;
    });

    setupSheet(sheet, { freeze: false, headerRows: 6 });

    mergeAndSet(sheet, 1, 1, 1, headers.length, COMPANY_NAME, { bold: true, size: 12 }, 'center');
    mergeAndSet(sheet, 2, 1, 2, headers.length, COMPANY_ADDRESS, { size: 9 }, 'center');
    mergeAndSet(sheet, 3, 1, 3, headers.length, 'OTHER TESTS (not in the fixed report columns)', { bold: true, size: 11 }, 'center');
    mergeAndSet(sheet, 4, 1, 4, headers.length, formatRange(from, to), { size: 9 }, 'center');

    headers.forEach((label, index) => {
        setCell(sheet, 6, index + 1, label, { bold: true, size: 8 }, 'center');
    });
    sheet.getRow(6).height = 24;
    borderRange(sheet, 1, 6, headers.length, 6);

    const rows = [];
    for (const day of days) {
        for (const transaction of day.transactions) {
            for (const item of transaction.otherItems) {
                rows.push({
                    date: day.date,
                    invoice: invoiceSuffix(transaction.receipt_no),
                    patient: formatPatientName(transaction),
                    department: departmentForItem(item.category, null),
                    examination: item.type_name || item.description || 'Service',
                    qty: item.qty,
                    unitPrice: item.unit_price,
                    gross: item.amount,
                    discount: item.discountAmount,
                    net: item.netAmount
                });
            }
        }
    }

    if (rows.length === 0) {
        mergeAndSet(sheet, 7, 1, 7, headers.length, 'No other tests for this period.', { italic: true, size: 9, color: { argb: MUTED } }, 'center');
        borderRange(sheet, 1, 7, headers.length, 7);
        return sheet;
    }

    let row = 7;
    for (const entry of rows) {
        const values = [
            formatReportDate(entry.date),
            entry.invoice,
            entry.patient,
            entry.department,
            entry.examination,
            entry.qty,
            roundMoney(entry.unitPrice),
            roundMoney(entry.gross),
            roundMoney(entry.discount),
            roundMoney(entry.net)
        ];

        values.forEach((value, index) => {
            const cell = sheet.getCell(row, index + 1);
            cell.value = value;
            cell.font = { size: 8 };
            cell.border = BORDER_ALL;
            cell.alignment = {
                horizontal: [2, 3, 4].includes(index) ? 'left' : [0, 1, 5].includes(index) ? 'center' : 'right',
                vertical: 'middle'
            };
            if (index >= 6) cell.numFmt = MONEY_FMT;
        });

        row += 1;
    }

    const totalRow = row;
    mergeAndSet(sheet, totalRow, 1, totalRow, 5, 'TOTAL', { bold: true, size: 8 }, 'right');
    setCell(sheet, totalRow, 6, null, { bold: true, size: 8 }, 'center');
    setCell(sheet, totalRow, 7, null, { bold: true, size: 8 }, 'right');

    const gross = roundMoney(rows.reduce((sum, entry) => sum + entry.gross, 0));
    const discount = roundMoney(rows.reduce((sum, entry) => sum + entry.discount, 0));
    const net = roundMoney(rows.reduce((sum, entry) => sum + entry.net, 0));

    [gross, discount, net].forEach((value, index) => {
        const cell = sheet.getCell(totalRow, 8 + index);
        cell.value = value;
        cell.numFmt = MONEY_FMT;
        cell.font = { bold: true, size: 8 };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
    });

    for (let col = 1; col <= headers.length; col += 1) {
        const cell = sheet.getCell(totalRow, col);
        cell.fill = solid(ORANGE);
        cell.border = BORDER_ALL;
    }

    return sheet;
}

// ============================================================
// FORMATTING HELPERS
// ============================================================

function setupSheet(sheet, { freeze = false, headerRows = 5 } = {}) {
    sheet.properties.defaultRowHeight = 14;
    if (freeze) {
        sheet.views = [{ state: 'frozen', xSplit: 3, ySplit: headerRows }];
    }

    sheet.pageSetup = {
        paperSize: 9, // A4
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
            left: 0.25,
            right: 0.25,
            top: 0.4,
            bottom: 0.4,
            header: 0.2,
            footer: 0.2
        },
        printTitlesRow: `1:${headerRows}`,
        horizontalCentered: true
    };

    sheet.headerFooter = {
        oddFooter: '&LPerPoly Hospital Management System&CPage &P of &N&R'
    };
}

function setCell(sheet, row, col, value, style = {}, alignment = 'left') {
    const cell = sheet.getCell(row, col);
    cell.value = value;
    cell.font = { name: 'Calibri', size: 9, ...style };
    cell.alignment = { horizontal: alignment, vertical: 'middle', wrapText: true };
    return cell;
}

function mergeAndSet(sheet, startRow, startCol, endRow, endCol, value, style, alignment) {
    if (startRow !== endRow || startCol !== endCol) {
        sheet.mergeCells(startRow, startCol, endRow, endCol);
    }
    return setCell(sheet, startRow, startCol, value, style, alignment);
}

function borderRange(sheet, startCol, startRow, endCol, endRow) {
    for (let row = startRow; row <= endRow; row += 1) {
        for (let col = startCol; col <= endCol; col += 1) {
            sheet.getCell(row, col).border = BORDER_ALL;
        }
    }
}

function styleOrangeRow(sheet, row, startCol, endCol) {
    for (let col = startCol; col <= endCol; col += 1) {
        const cell = sheet.getCell(row, col);
        cell.fill = solid(ORANGE);
        cell.border = BORDER_ALL;
        cell.font = { ...cell.font, bold: true };
    }
}

function solid(argb) {
    return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function formatReportDate(dateStr) {
    const [year, month, day] = String(dateStr).split('-').map(Number);
    return `${day}-${MONTHS[month - 1]}-${String(year).slice(-2)}`;
}

function formatRange(from, to) {
    return from === to ? formatReportDate(from) : `${formatReportDate(from)} to ${formatReportDate(to)}`;
}

function summaryTitle(period) {
    if (period === 'weekly') return 'WEEKLY SALES SUMMARY';
    if (period === 'monthly') return 'MONTHLY SALES SUMMARY';
    return 'SALES SUMMARY';
}

function invoiceSuffix(receiptNo) {
    // TODO: replace this with the client's final invoice-number format later.
    const match = String(receiptNo || '').match(/(\d+)$/);
    if (!match) return String(receiptNo || '');
    return String(Number(match[1]));
}

function formatPatientName(transaction) {
    const last = String(transaction.last_name || '').trim();
    const rest = [transaction.first_name, transaction.middle_name, transaction.extra_name]
        .map((part) => String(part || '').trim())
        .filter(Boolean)
        .join(' ');

    const name = last ? `${last}${rest ? `, ${rest}` : ''}` : rest;
    return transaction.is_senior ? `✓ ${name}` : name;
}
