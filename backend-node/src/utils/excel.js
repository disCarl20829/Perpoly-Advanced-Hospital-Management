import ExcelJS from 'exceljs';

export const MONEY_FMT = '#,##0.00';

const HEADER_FILL = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFCE4D6' }
};

const HEADER_BORDER = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } }
};

/**
 * Create a workbook with the system defaults.
 * @returns {ExcelJS.Workbook}
 */
export function createWorkbook() {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PerPoly Hospital Management System';
    workbook.created = new Date();
    return workbook;
}

/**
 * Add a centered report title and optional subtitle.
 * @param {ExcelJS.Worksheet} sheet
 * @param {string} title
 * @param {string} [subtitle]
 * @param {number} columnCount
 * @returns {number} first row available for the table header
 */
export function addTitle(sheet, title, subtitle, columnCount) {
    sheet.mergeCells(1, 1, 1, columnCount);
    const titleCell = sheet.getCell(1, 1);
    titleCell.value = title;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 24;

    if (!subtitle) return 2;

    sheet.mergeCells(2, 1, 2, columnCount);
    const subtitleCell = sheet.getCell(2, 1);
    subtitleCell.value = subtitle;
    subtitleCell.font = { size: 10, color: { argb: 'FF64748B' } };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 18;

    return 3;
}

/**
 * Write a styled header row and enable filtering.
 * @param {ExcelJS.Worksheet} sheet
 * @param {number} row
 * @param {string[]} headers
 */
export function writeHeaderRow(sheet, row, headers) {
    headers.forEach((label, index) => {
        const cell = sheet.getCell(row, index + 1);
        cell.value = label;
        cell.font = { bold: true, size: 10 };
        cell.fill = HEADER_FILL;
        cell.border = HEADER_BORDER;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });

    sheet.getRow(row).height = 28;
    sheet.autoFilter = {
        from: { row, column: 1 },
        to: { row, column: headers.length }
    };
}

/**
 * Write one data row with borders and alignment.
 * @param {ExcelJS.Worksheet} sheet
 * @param {number} row
 * @param {array} values
 * @param {object} [options] - { money: number[], date: number[], center: number[] }
 */
export function writeDataRow(sheet, row, values, options = {}) {
    const money = new Set(options.money || []);
    const center = new Set(options.center || []);

    values.forEach((value, index) => {
        const column = index + 1;
        const cell = sheet.getCell(row, column);
        cell.value = value;
        cell.font = { size: 10 };
        cell.border = HEADER_BORDER;
        cell.alignment = {
            horizontal: center.has(column) ? 'center' : 'left',
            vertical: 'middle',
            wrapText: false
        };
        if (money.has(column)) cell.numFmt = MONEY_FMT;
    });
}

/**
 * Size columns from their content.
 * @param {ExcelJS.Worksheet} sheet
 * @param {object} [options] - { min, max }
 */
export function autoWidth(sheet, { min = 10, max = 40 } = {}) {
    sheet.columns.forEach((column) => {
        let width = min;

        column.eachCell({ includeEmpty: false }, (cell) => {
            const raw = cell.value;
            if (raw === null || raw === undefined) return;
            const text = typeof raw === 'object' && raw instanceof Date
                ? raw.toISOString().slice(0, 10)
                : String(raw);
            width = Math.max(width, Math.min(max, text.length + 2));
        });

        column.width = width;
    });
}

/**
 * Freeze the sheet below the header row.
 * @param {ExcelJS.Worksheet} sheet
 * @param {number} headerRow
 */
export function freezeBelow(sheet, headerRow) {
    sheet.views = [{ state: 'frozen', ySplit: headerRow }];
}

/**
 * Format a timestamp in Asia/Manila as YYYY-MM-DD HH:mm.
 * @param {string|Date} value
 * @returns {string}
 */
export function formatManilaDateTime(value) {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).formatToParts(date);

    const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}`;
}

/**
 * Format a date in Asia/Manila as YYYY-MM-DD.
 * @param {string|Date} value
 * @returns {string}
 */
export function formatManilaDate(value) {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date);
}

/**
 * Send an Excel buffer as a download.
 * @param {object} res - Express response
 * @param {Buffer} buffer
 * @param {string} filename
 */
export function sendBuffer(res, buffer, filename) {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
}

/**
 * Send an Excel workbook as a download.
 * @param {object} res - Express response
 * @param {ExcelJS.Workbook} workbook
 * @param {string} filename
 */
export async function sendWorkbook(res, workbook, filename) {
    const buffer = await workbook.xlsx.writeBuffer();
    sendBuffer(res, buffer, filename);
}
