import * as cashierRepo from './repository.js';

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