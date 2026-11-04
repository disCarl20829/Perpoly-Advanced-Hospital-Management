import ExcelJS from 'exceljs';
import * as cashierRepo from './repository.js';
import { getPatientImportRowErrors } from './validation.js';

// ============================================================
// PATIENTS
// ============================================================

/**
 * Create a new patient.
 * @param {object} data - { last_name, first_name, middle_name, extra_name, gender, birthdate, address, contact_no, is_senior, created_by }
 * @returns {object} created patient
 */
export async function createPatient(data) {
    return await cashierRepo.createPatient({
        ...data,
        source: 'manual'
    });
}

/**
 * Search patients by name.
 * @param {string} name
 * @returns {array} matching patients
 */
export async function searchPatients(name) {
    if (!name || name.trim().length < 2) {
        const err = new Error('Search term must be at least 2 characters');
        err.status = 400;
        throw err;
    }
    return await cashierRepo.findPatientsByName(name.trim());
}

/**
 * Get all patients.
 * @returns {array} list of patients
 */
export async function getAllPatients() {
    return await cashierRepo.findAllPatients();
}

/**
 * Get a single patient by ID.
 * @param {string} id - UUID
 * @returns {object} patient
 */
export async function getPatientById(id) {
    const patient = await cashierRepo.findPatientById(id);
    if (!patient) {
        const err = new Error('Patient not found');
        err.status = 404;
        throw err;
    }
    return patient;
}

/**
 * Update a patient by ID.
 * @param {string} id - UUID
 * @param {object} data - { last_name, first_name, middle_name, extra_name, gender, birthdate, address, contact_no, is_senior }
 * @returns {object} updated patient
 */
export async function updatePatient(id, data) {
    const patient = await cashierRepo.findPatientById(id);
    if (!patient) {
        const err = new Error('Patient not found');
        err.status = 404;
        throw err;
    }
    return await cashierRepo.updatePatient(id, data);
}

/**
 * Delete a patient by ID.
 * @param {string} id - UUID
 * @returns {object} deleted patient
 */
export async function deletePatient(id) {
    const patient = await cashierRepo.findPatientById(id);
    if (!patient) {
        const err = new Error('Patient not found');
        err.status = 404;
        throw err;
    }
    return await cashierRepo.deletePatient(id);
}

// ============================================================
// PATIENT IMPORT
// ============================================================

const MAX_IMPORT_ROWS = 5000;
const IMPORT_SOURCE_TYPES = ['excel', 'ocr_scan'];

const MONTH_NAMES = {
    jan: 1,
    january: 1,
    feb: 2,
    february: 2,
    mar: 3,
    march: 3,
    apr: 4,
    april: 4,
    may: 5,
    jun: 6,
    june: 6,
    jul: 7,
    july: 7,
    aug: 8,
    august: 8,
    sep: 9,
    sept: 9,
    september: 9,
    oct: 10,
    october: 10,
    nov: 11,
    november: 11,
    dec: 12,
    december: 12
};

const IMPORT_HEADER_ALIASES = {
    last_name: ['last name', 'lastname', 'surname', 'family name', 'apelyido'],
    first_name: ['first name', 'firstname', 'given name', 'pangalan'],
    middle_name: ['middle name', 'middlename', 'middle initial', 'middle initials', 'mi'],
    extra_name: ['extra name', 'extraname', 'suffix', 'name extension', 'extension'],
    gender: ['gender', 'sex'],
    birthdate: ['birthdate', 'birth date', 'birthday', 'date of birth', 'dob'],
    address: ['address', 'home address', 'complete address'],
    contact_no: ['contact no', 'contact number', 'contact', 'phone', 'phone number', 'mobile', 'mobile number', 'cp number'],
    is_senior: ['is senior', 'senior', 'senior citizen', 'senior citizen?', 'senior discount'],
    name: ['name', 'full name', 'patient name']
};

const HEADER_LOOKUP = (() => {
    const lookup = {};
    for (const [canonical, aliases] of Object.entries(IMPORT_HEADER_ALIASES)) {
        for (const alias of [canonical, ...aliases]) {
            lookup[normalizeHeaderKey(alias)] = canonical;
        }
    }
    return lookup;
})();

/**
 * Create a patient import batch from an uploaded Excel file or a JSON rows array.
 * Every row is stored for review first; no patient is created here.
 * @param {object} data - { file, rows, source_type, uploaded_by }
 * @returns {object} { batch, rows }
 */
export async function createPatientImport({ file, rows, source_type = 'excel', uploaded_by }) {
    let rawRows;
    let sourceType = source_type;
    let rawFilePath = null;

    if (file) {
        if (!file.buffer || file.size === 0) {
            const err = new Error('The uploaded Excel file is empty');
            err.status = 400;
            throw err;
        }
        rawRows = await parsePatientWorkbook(file.buffer);
        sourceType = 'excel';
        rawFilePath = file.originalname || null;
    } else if (Array.isArray(rows)) {
        if (rows.length === 0) {
            const err = new Error('Provide at least one patient row');
            err.status = 400;
            throw err;
        }
        if (rows.length > MAX_IMPORT_ROWS) {
            const err = new Error(`A single import is limited to ${MAX_IMPORT_ROWS} rows`);
            err.status = 400;
            throw err;
        }
        rawRows = rows.map((row, index) => {
            if (!row || typeof row !== 'object' || Array.isArray(row)) {
                const err = new Error(`rows[${index}] must be an object`);
                err.status = 400;
                throw err;
            }
            return normalizeImportRow(row, index + 1);
        });
    } else {
        const err = new Error('Upload an .xlsx file or provide a rows array');
        err.status = 400;
        throw err;
    }

    if (!IMPORT_SOURCE_TYPES.includes(sourceType)) {
        const err = new Error(`source_type must be one of: ${IMPORT_SOURCE_TYPES.join(', ')}`);
        err.status = 400;
        throw err;
    }

    const seenKeys = new Map();
    const preparedRows = [];

    for (const raw of rawRows) {
        const validationErrors = getPatientImportRowErrors(raw);
        let status = 'new';
        let matchedPatientId = null;

        if (validationErrors.length === 0) {
            const match = await cashierRepo.findPotentialPatientMatch(raw);
            if (match) {
                status = 'duplicate_flagged';
                matchedPatientId = match.id;
            }

            const duplicateKey = buildDuplicateKey(raw);
            if (duplicateKey) {
                if (seenKeys.has(duplicateKey)) {
                    status = 'duplicate_flagged';
                    raw._duplicate_of_row_number = seenKeys.get(duplicateKey);
                } else {
                    seenKeys.set(duplicateKey, raw._row_number);
                }
            }
        }

        preparedRows.push({
            raw_data: raw,
            matched_patient_id: matchedPatientId,
            status
        });
    }

    const result = await cashierRepo.createPatientImportBatchWithRows({
        source_type: sourceType,
        uploaded_by,
        raw_file_path: rawFilePath,
        rows: preparedRows
    });

    return {
        batch: result.batch,
        rows: result.rows.map(decorateImportRow)
    };
}

/**
 * List import batches.
 * @returns {array} batches with row counts
 */
export async function getPatientImportBatches() {
    return await cashierRepo.findAllPatientImportBatches();
}

/**
 * Get one import batch with all review rows.
 * @param {string} id - UUID
 * @returns {object} batch with rows
 */
export async function getPatientImportBatch(id) {
    const batch = await cashierRepo.findPatientImportBatchById(id);
    if (!batch) {
        const err = new Error('Import batch not found');
        err.status = 404;
        throw err;
    }

    const rows = await cashierRepo.findPatientImportRows(id);
    return { ...batch, rows: rows.map(decorateImportRow) };
}

/**
 * Edit an import row and re-check it for duplicates.
 * @param {string} batchId - UUID
 * @param {string} rowId - UUID
 * @param {object} body - { raw_data?, matched_patient_id?, ...fields }
 * @returns {object} updated row with validation errors
 */
export async function updatePatientImportRow(batchId, rowId, body = {}) {
    const row = await cashierRepo.findPatientImportRowById(batchId, rowId);
    if (!row) {
        const err = new Error('Import row not found');
        err.status = 404;
        throw err;
    }
    if (row.status === 'imported') {
        const err = new Error('Imported rows cannot be edited');
        err.status = 400;
        throw err;
    }

    const explicitMatched = Object.prototype.hasOwnProperty.call(body, 'matched_patient_id');
    const hasRawData = body.raw_data !== undefined;
    const rawPatch = hasRawData
        ? { ...body.raw_data }
        : Object.fromEntries(Object.entries(body).filter(([key]) => key !== 'matched_patient_id'));

    delete rawPatch.matched_patient_id;
    const hasRawPatch = hasRawData || Object.keys(rawPatch).length > 0;
    if (!hasRawPatch && !explicitMatched) {
        const err = new Error('Provide row data or matched_patient_id');
        err.status = 400;
        throw err;
    }

    let nextRaw = { ...(row.raw_data || {}) };

    if (hasRawPatch) {
        if (Object.prototype.hasOwnProperty.call(rawPatch, 'name')) {
            delete nextRaw.last_name;
            delete nextRaw.first_name;
            delete nextRaw.middle_name;
            delete nextRaw.extra_name;
        }
        delete nextRaw._duplicate_of_row_number;
        nextRaw = { ...nextRaw, ...rawPatch };
        nextRaw = normalizeImportRow(nextRaw, row.raw_data?._row_number || 0);
    }

    let matchedPatientId = row.matched_patient_id;
    let status = row.status;

    if (explicitMatched) {
        if (body.matched_patient_id === null) {
            matchedPatientId = null;
            status = 'new';
        } else {
            const patient = await cashierRepo.findPatientById(body.matched_patient_id);
            if (!patient) {
                const err = new Error('Matched patient not found');
                err.status = 404;
                throw err;
            }
            matchedPatientId = body.matched_patient_id;
            status = 'duplicate_flagged';
        }
    } else {
        const validationErrors = getPatientImportRowErrors(nextRaw);
        if (validationErrors.length > 0) {
            matchedPatientId = null;
            status = 'new';
        } else {
            const match = await cashierRepo.findPotentialPatientMatch(nextRaw);
            matchedPatientId = match ? match.id : null;
            status = match ? 'duplicate_flagged' : 'new';
        }
    }

    await cashierRepo.updatePatientImportRow(rowId, {
        raw_data: nextRaw,
        matched_patient_id: matchedPatientId,
        status
    });

    const updated = await cashierRepo.findPatientImportRowById(batchId, rowId);
    return decorateImportRow(updated);
}

/**
 * Commit selected review rows.
 * With no explicit rows, all `new` rows are imported. Duplicate rows stay
 * pending until the reviewer chooses `create` or `link`.
 * @param {string} batchId - UUID
 * @param {object} body - { rows?: [{ row_id, action: 'create'|'link' }] }
 * @param {string} createdBy - user UUID
 * @returns {object} commit result with refreshed batch and rows
 */
export async function commitPatientImport(batchId, body = {}, createdBy) {
    const batch = await cashierRepo.findPatientImportBatchById(batchId);
    if (!batch) {
        const err = new Error('Import batch not found');
        err.status = 404;
        throw err;
    }
    if (batch.status === 'completed') {
        const err = new Error('Import batch is already completed');
        err.status = 400;
        throw err;
    }

    const allRows = await cashierRepo.findPatientImportRows(batchId);
    const rowMap = new Map(allRows.map((row) => [row.id, row]));
    let actions;
    let skippedInvalid = [];

    if (Array.isArray(body.rows) && body.rows.length > 0) {
        actions = body.rows;
    } else {
        const newRows = allRows.filter((row) => row.status === 'new');
        if (newRows.length === 0) {
            const err = new Error('No new rows to import. Select duplicate rows to resolve first.');
            err.status = 400;
            throw err;
        }

        const validNewRows = [];
        for (const row of newRows) {
            const validationErrors = getPatientImportRowErrors(row.raw_data || {});
            if (validationErrors.length > 0) {
                skippedInvalid.push({
                    row_id: row.id,
                    row_number: row.raw_data?._row_number || null,
                    validation_errors: validationErrors
                });
            } else {
                validNewRows.push(row);
            }
        }

        if (validNewRows.length === 0) {
            const err = new Error('No valid new rows to import. Correct the flagged rows first.');
            err.status = 400;
            throw err;
        }

        actions = validNewRows.map((row) => ({ row_id: row.id, action: 'create' }));
    }

    for (const action of actions) {
        const row = rowMap.get(action.row_id);
        if (!row) {
            const err = new Error('Import row not found in this batch');
            err.status = 404;
            throw err;
        }
        if (row.status === 'imported') {
            const err = new Error('Import row has already been imported');
            err.status = 400;
            throw err;
        }
        if (action.action === 'link') {
            if (!row.matched_patient_id) {
                const err = new Error('Import row has no matched patient to link');
                err.status = 400;
                throw err;
            }
            continue;
        }

        const validationErrors = getPatientImportRowErrors(row.raw_data || {});
        if (validationErrors.length > 0) {
            const rowNumber = row.raw_data?._row_number || row.id;
            const err = new Error(`Row ${rowNumber} has validation errors: ${validationErrors.join(', ')}`);
            err.status = 400;
            throw err;
        }
    }

    const result = await cashierRepo.commitPatientImportBatch({
        batchId,
        actions,
        createdBy
    });

    const refreshedBatch = await cashierRepo.findPatientImportBatchById(batchId);
    const rows = await cashierRepo.findPatientImportRows(batchId);

    return {
        ...result,
        skipped_invalid: skippedInvalid,
        batch: refreshedBatch,
        rows: rows.map(decorateImportRow)
    };
}

function decorateImportRow(row) {
    return {
        ...row,
        validation_errors: getPatientImportRowErrors(row.raw_data || {})
    };
}

function normalizeHeaderKey(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

async function parsePatientWorkbook(buffer) {
    const workbook = new ExcelJS.Workbook();
    try {
        await workbook.xlsx.load(buffer);
    } catch {
        const err = new Error('The uploaded file is not a valid .xlsx workbook');
        err.status = 400;
        throw err;
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
        const err = new Error('The workbook has no worksheets');
        err.status = 400;
        throw err;
    }

    const headerMap = {};
    const headerLabels = [];
    const headerRow = worksheet.getRow(1);

    headerRow.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
        const label = String(cell.value || '').trim();
        if (!label) return;
        headerLabels.push(label);
        const canonical = HEADER_LOOKUP[normalizeHeaderKey(label)];
        if (canonical && !headerMap[canonical]) {
            headerMap[canonical] = columnNumber;
        }
    });

    const hasSeparateNames = headerMap.last_name && headerMap.first_name;
    if (!hasSeparateNames && !headerMap.name) {
        const err = new Error(
            `Excel file must include last_name and first_name columns, or a name column in LAST, FIRST format. Found: ${headerLabels.join(', ') || 'no headers'}`
        );
        err.status = 400;
        throw err;
    }

    const rows = [];
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
        const row = worksheet.getRow(rowNumber);
        const raw = {};

        for (const [field, columnNumber] of Object.entries(headerMap)) {
            raw[field] = getCellValue(row, columnNumber);
        }

        const normalized = normalizeImportRow(raw, rowNumber);
        if (isEmptyImportRow(normalized)) continue;

        rows.push(normalized);
        if (rows.length > MAX_IMPORT_ROWS) {
            const err = new Error(`A single import is limited to ${MAX_IMPORT_ROWS} rows`);
            err.status = 400;
            throw err;
        }
    }

    if (rows.length === 0) {
        const err = new Error('No patient rows found in the workbook');
        err.status = 400;
        throw err;
    }

    return rows;
}

function getCellValue(row, columnNumber) {
    return unwrapCellValue(row.getCell(columnNumber).value);
}

function unwrapCellValue(value) {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value;
    if (typeof value === 'object') {
        if (Array.isArray(value.richText)) {
            return value.richText.map((part) => part.text || '').join('');
        }
        if (value.text !== undefined) return value.text;
        if (value.result !== undefined) return value.result;
        return '';
    }
    return value;
}

function normalizeImportRow(raw = {}, rowNumber = 0) {
    const normalized = {
        last_name: toNullableString(raw.last_name),
        first_name: toNullableString(raw.first_name),
        middle_name: toNullableString(raw.middle_name),
        extra_name: toNullableString(raw.extra_name),
        gender: normalizeGender(raw.gender),
        birthdate: normalizeDate(raw.birthdate),
        address: toNullableString(raw.address),
        contact_no: toNullableString(raw.contact_no),
        is_senior: normalizeBoolean(raw.is_senior),
        _row_number: Number(raw._row_number) || rowNumber || 0
    };

    if (raw.name) {
        const parsed = parseFullName(raw.name);
        if (!normalized.last_name && parsed.last_name) normalized.last_name = parsed.last_name;
        if (!normalized.first_name && parsed.first_name) normalized.first_name = parsed.first_name;
        if (!normalized.middle_name && parsed.middle_name) normalized.middle_name = parsed.middle_name;
        if (!normalized.extra_name && parsed.extra_name) normalized.extra_name = parsed.extra_name;
    }

    return normalized;
}

function isEmptyImportRow(raw) {
    const fields = [
        'last_name',
        'first_name',
        'middle_name',
        'extra_name',
        'gender',
        'birthdate',
        'address',
        'contact_no'
    ];
    return fields.every((field) => {
        const value = raw[field];
        return value === null || value === undefined || String(value).trim() === '';
    });
}

function toNullableString(value) {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text || null;
}

function normalizeGender(value) {
    const text = toNullableString(value);
    if (!text) return null;

    const lower = text.toLowerCase();
    if (['m', 'male', 'lalaki'].includes(lower)) return 'Male';
    if (['f', 'female', 'babae'].includes(lower)) return 'Female';
    return text;
}

function normalizeBoolean(value) {
    if (value === null || value === undefined || value === '') return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') {
        if (value === 1) return true;
        if (value === 0) return false;
        return null;
    }

    const text = String(value).trim().toLowerCase();
    if (!text) return false;
    if (['true', 'yes', 'y', '1', 'senior', 'senior citizen'].includes(text)) return true;
    if (['false', 'no', 'n', '0', 'not senior'].includes(text)) return false;
    return null;
}

function normalizeDate(value) {
    if (value === null || value === undefined || value === '') return null;

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : formatUtcDate(value);
    }

    if (typeof value === 'number') {
        const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86400000);
        return Number.isNaN(date.getTime()) ? null : formatUtcDate(date);
    }

    const text = String(value).trim();
    if (!text) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

    let match = text.match(/^(\d{4})-(\d{2})-(\d{2})[T\s].*$/);
    if (match) {
        return buildDateString(Number(match[1]), Number(match[2]), Number(match[3])) || text;
    }

    match = text.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (match) {
        return buildDateString(Number(match[1]), Number(match[2]), Number(match[3])) || text;
    }

    match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (match) {
        let month = Number(match[1]);
        let day = Number(match[2]);
        const year = Number(match[3]);
        if (month > 12 && day <= 12) {
            [month, day] = [day, month];
        }
        return buildDateString(year, month, day) || text;
    }

    match = text.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
    if (match) {
        const month = MONTH_NAMES[match[1].toLowerCase()];
        if (!month) return text;
        return buildDateString(Number(match[3]), month, Number(match[2])) || text;
    }

    match = text.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
    if (match) {
        const month = MONTH_NAMES[match[2].toLowerCase()];
        if (!month) return text;
        return buildDateString(Number(match[3]), month, Number(match[1])) || text;
    }

    return text;
}

function buildDateString(year, month, day) {
    if (!year || !month || !day) return null;
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
        date.getUTCFullYear() !== year
        || date.getUTCMonth() !== month - 1
        || date.getUTCDate() !== day
    ) {
        return null;
    }
    return formatUtcDate(date);
}

function formatUtcDate(date) {
    return date.toISOString().slice(0, 10);
}

function parseFullName(value) {
    const text = toNullableString(value);
    if (!text) return {};

    const commaIndex = text.indexOf(',');
    if (commaIndex === -1) {
        // A single name column must be LAST, FIRST MIDDLE EXTRA. Without a
        // comma we cannot safely guess which part is the surname.
        return {
            last_name: text,
            first_name: null,
            middle_name: null,
            extra_name: null
        };
    }

    const last_name = text.slice(0, commaIndex).trim() || null;
    const rest = text.slice(commaIndex + 1).trim();
    const parts = rest.split(/\s+/).filter(Boolean);

    return {
        last_name,
        first_name: parts[0] || null,
        middle_name: parts.length > 2 ? parts.slice(1, -1).join(' ') : (parts[1] || null),
        extra_name: parts.length > 2 ? parts[parts.length - 1] : null
    };
}

function buildDuplicateKey(raw) {
    if (!raw.last_name || !raw.first_name) return null;

    const nameKey = [raw.last_name, raw.first_name, raw.middle_name]
        .map((part) => String(part || '').trim().toLowerCase())
        .join('|');

    if (raw.birthdate) return `${nameKey}|dob:${raw.birthdate}`;

    const contactDigits = String(raw.contact_no || '').replace(/\D/g, '');
    if (contactDigits) return `${nameKey}|contact:${contactDigits}`;

    return nameKey;
}

// ============================================================
// TRANSACTION TYPES
// ============================================================

/**
 * Create a new transaction type.
 * @param {object} data - { name, category, default_price, notes, is_active }
 * @returns {object} created transaction type
 */
export async function createTransactionType(data) {
    return await cashierRepo.createTransactionType(data);
}

/**
 * Get all transaction types.
 * @param {object} filters - { active, category }
 * @returns {array} list of transaction types
 */
export async function getAllTransactionTypes(filters = {}) {
    return await cashierRepo.findAllTransactionTypes(filters);
}

/**
 * Get a single transaction type by ID.
 * @param {string} id - UUID
 * @returns {object} transaction type
 */
export async function getTransactionTypeById(id) {
    const transactionType = await cashierRepo.findTransactionTypeById(id);
    if (!transactionType) {
        const err = new Error('Transaction type not found');
        err.status = 404;
        throw err;
    }
    return transactionType;
}

/**
 * Update a transaction type by ID.
 * @param {string} id - UUID
 * @param {object} data - { name, category, default_price, notes, is_active }
 * @returns {object}
 */
export async function updateTransactionType(id, data = {}) {
    const transactionType = await cashierRepo.findTransactionTypeById(id);
    if (!transactionType) {
        const err = new Error('Transaction type not found');
        err.status = 404;
        throw err;
    }
    return await cashierRepo.updateTransactionType(id, data);
}

/**
 * Delete a transaction type by ID.
 * @param {string} id - UUID
 * @returns {object}
 */
export async function deleteTransactionType(id) {
    const transactionType = await cashierRepo.findTransactionTypeById(id);
    if (!transactionType) {
        const err = new Error('Transaction type not found');
        err.status = 404;
        throw err;
    }
    return await cashierRepo.deleteTransactionType(id);
}

// ============================================================
// TRANSACTIONS
// ============================================================

/**
 * Create a new transaction.
 * @param {object} data - { patient_id, cashier_id, status, items }
 * @returns {object} created transaction
 */
export async function createTransaction(data) {
    if (!data.items || data.items.length === 0) {
        const err = new Error('At least one item is required');
        err.status = 400;
        throw err;
    }

    return await cashierRepo.createTransaction(data);
}

/**
 * Get all transactions.
 * @returns {array} list of transactions
 */
export async function getAllTransactions() {
    return await cashierRepo.findAllTransactions();
}

/**
 * Get a single transaction by ID with items.
 * @param {string} id - UUID
 * @returns {object} transaction with items
 */
export async function getTransactionById(id) {
    const transaction = await cashierRepo.findTransactionById(id);
    if (!transaction) {
        const err = new Error('Transaction not found');
        err.status = 404;
        throw err;
    }

    const items = await cashierRepo.findTransactionItems(id);
    return { ...transaction, items };
}

/**
 * Update a transaction's status and/or mode of payment.
 * @param {string} id - UUID
 * @param {object} data - { status, mode_of_payment }
 * @returns {object} updated transaction
 */
export async function updateTransaction(id, data) {
    const transaction = await cashierRepo.findTransactionById(id);
    if (!transaction) {
        const err = new Error('Transaction not found');
        err.status = 404;
        throw err;
    }

    return await cashierRepo.updateTransaction(id, data);
}

/**
 * Update transaction status.
 * @param {string} id - UUID
 * @param {string} status - 'paid' or 'unpaid'
 * @returns {object} updated transaction
 */
export async function updateTransactionStatus(id, status) {
    return await updateTransaction(id, { status });
}

/**
 * Delete a transaction by ID.
 * @param {string} id - UUID
 * @returns {object} deleted transaction
 */
export async function deleteTransaction(id) {
    const transaction = await cashierRepo.findTransactionById(id);
    if (!transaction) {
        const err = new Error('Transaction not found');
        err.status = 404;
        throw err;
    }

    return await cashierRepo.deleteTransaction(id);
}

/**
 * Add an item to an existing transaction.
 * The transaction total (and income row) is recalculated automatically.
 * @param {string} transactionId - UUID
 * @param {object} data - { transaction_type_id, qty, unit, description, unit_price }
 * @returns {object} { item, transaction }
 */
export async function addTransactionItem(transactionId, data) {
    const transaction = await cashierRepo.findTransactionById(transactionId);
    if (!transaction) {
        const err = new Error('Transaction not found');
        err.status = 404;
        throw err;
    }

    return await cashierRepo.addTransactionItem(transactionId, data);
}

/**
 * Update a transaction item. Unspecified fields keep their current value.
 * @param {string} transactionId - UUID
 * @param {string} itemId - UUID
 * @param {object} data - { transaction_type_id, qty, unit, description, unit_price }
 * @returns {object} { item, transaction }
 */
export async function updateTransactionItem(transactionId, itemId, data) {
    const transaction = await cashierRepo.findTransactionById(transactionId);
    if (!transaction) {
        const err = new Error('Transaction not found');
        err.status = 404;
        throw err;
    }

    const item = await cashierRepo.findTransactionItem(transactionId, itemId);
    if (!item) {
        const err = new Error('Transaction item not found');
        err.status = 404;
        throw err;
    }

    const merged = {
        transaction_type_id: data.transaction_type_id ?? item.transaction_type_id,
        qty: data.qty ?? item.qty,
        unit: data.unit ?? item.unit,
        description: data.description ?? item.description,
        unit_price: data.unit_price ?? item.unit_price
    };

    return await cashierRepo.updateTransactionItem(transactionId, itemId, merged);
}

/**
 * Delete a transaction item. The last remaining item cannot be removed,
 * and items referenced by a laboratory result are protected.
 * @param {string} transactionId - UUID
 * @param {string} itemId - UUID
 * @returns {object} { item, transaction }
 */
export async function deleteTransactionItem(transactionId, itemId) {
    const transaction = await cashierRepo.findTransactionById(transactionId);
    if (!transaction) {
        const err = new Error('Transaction not found');
        err.status = 404;
        throw err;
    }

    const items = await cashierRepo.findTransactionItems(transactionId);
    if (!items.some((item) => item.id === itemId)) {
        const err = new Error('Transaction item not found');
        err.status = 404;
        throw err;
    }

    if (items.length <= 1) {
        const err = new Error('A transaction must keep at least one item.');
        err.status = 400;
        throw err;
    }

    try {
        return await cashierRepo.deleteTransactionItem(transactionId, itemId);
    } catch (err) {
        if (err.code === '23503') {
            err.status = 409;
            err.message = 'This item has a laboratory result and cannot be removed.';
        }
        throw err;
    }
}