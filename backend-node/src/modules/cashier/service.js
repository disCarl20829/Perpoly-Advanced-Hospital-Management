import * as cashierRepo from './repository.js';

// ============================================================
// PATIENTS
// ============================================================

/**
 * Create a new patient.
 * @param {object} data - { full_name, gender, birthdate, address, contact_no, created_by }
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

// ============================================================
// TRANSACTION TYPES
// ============================================================

/**
 * Create a new transaction type.
 * @param {object} data - { name, category }
 * @returns {object} created transaction type
 */
export async function createTransactionType(data) {
    return await cashierRepo.createTransactionType(data);
}

/**
 * Get all transaction types.
 * @returns {array} list of transaction types
 */
export async function getAllTransactionTypes() {
    return await cashierRepo.findAllTransactionTypes();
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
 * Update transaction status.
 * @param {string} id - UUID
 * @param {string} status - 'paid' or 'unpaid'
 * @returns {object} updated transaction
 */
export async function updateTransactionStatus(id, status) {
    const transaction = await cashierRepo.findTransactionById(id);
    if (!transaction) {
        const err = new Error('Transaction not found');
        err.status = 404;
        throw err;
    }

    return await cashierRepo.updateTransactionStatus(id, status);
}
