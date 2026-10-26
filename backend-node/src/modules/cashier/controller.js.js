import * as cashierService from './service.js';
import { validateCreatePatient, validateCreateTransactionType, validateCreateTransaction, validateUpdateTransactionStatus, validateUpdateTransaction, validateTransactionItem, validateTransactionItemUpdate } from './validation.js';

// ============================================================
// PATIENTS
// ============================================================

/**
 * Create a new patient.
 */
export async function createPatient(req, res, next) {
    try {
        validateCreatePatient(req.body);

        const { last_name, first_name, middle_name, extra_name, gender, birthdate, address, contact_no } = req.body;

        const patient = await cashierService.createPatient({
            last_name,
            first_name,
            middle_name,
            extra_name,
            gender,
            birthdate,
            address,
            contact_no,
            created_by: req.user.id
        });

        res.status(201).json({ message: 'Patient created successfully', patient });
    } catch (err) {
        next(err);
    }
}

/**
 * Search patients by name.
 */
export async function searchPatients(req, res, next) {
    try {
        const { name } = req.query;
        const patients = await cashierService.searchPatients(name);
        res.json({ patients });
    } catch (err) {
        next(err);
    }
}

/**
 * Get all patients.
 */
export async function getAllPatients(req, res, next) {
    try {
        const patients = await cashierService.getAllPatients();
        res.json({ patients });
    } catch (err) {
        next(err);
    }
}

/**
 * Get a single patient by ID.
 */
export async function getPatientById(req, res, next) {
    try {
        const { id } = req.params;
        const patient = await cashierService.getPatientById(id);
        res.json({ patient });
    } catch (err) {
        next(err);
    }
}

/**
 * Update a patient by ID.
 */
export async function updatePatient(req, res, next) {
    try {
        const { id } = req.params;
        const updatedPatient = await cashierService.updatePatient(id, req.body);
        res.json({ message: 'Patient updated successfully', patient: updatedPatient });
    } catch (err) {
        next(err);
    }
}

/**
 * Delete a patient by ID.
 */
export async function deletePatient(req, res, next) {
    try {
        const { id } = req.params;
        await cashierService.deletePatient(id);
        res.json({ message: 'Patient deleted successfully' });
    } catch (err) {
        next(err);
    }
}

// ============================================================
// TRANSACTION TYPES
// ============================================================

/**
 * Create a new transaction type.
 */
export async function createTransactionType(req, res, next) {
    try {
        validateCreateTransactionType(req.body);

        const { name, category } = req.body;
        const transactionType = await cashierService.createTransactionType({ name, category });
        res.status(201).json({ message: 'Transaction type created', transactionType });
    } catch (err) {
        next(err);
    }
}

/**
 * Get all transaction types.
 */
export async function getAllTransactionTypes(req, res, next) {
    try {
        const transactionTypes = await cashierService.getAllTransactionTypes();
        res.json({ transactionTypes });
    } catch (err) {
        next(err);
    }
}

/**
 * Get a single transaction type by ID.
 */
export async function getTransactionTypeById(req, res, next) {
    try {
        const { id } = req.params;
        const transactionType = await cashierService.getTransactionTypeById(id);
        res.json({ transactionType });
    } catch (err) {
        next(err);
    }
}

/**
 * Update a transaction type by ID.
 */
export async function updateTransactionType(req, res, next) {
    try {
        const { id } = req.params;
        const updatedTransactionType = await cashierService.updateTransactionType(id, req.body);
        res.json({ message: 'Transaction type updated', transactionType: updatedTransactionType });
    } catch (err) {
        next(err);
    }
}

/**
 * Delete a transaction type by ID.
 */
export async function deleteTransactionType(req, res, next) {
    try {
        const { id } = req.params;
        await cashierService.deleteTransactionType(id);
        res.json({ message: 'Transaction type deleted successfully' });
    } catch (err) {
        next(err);
    }
}

// ============================================================
// TRANSACTIONS
// ============================================================

/**
 * Create a new transaction.
 */
export async function createTransaction(req, res, next) {
    try {
        validateCreateTransaction(req.body);

        const { patient_id, status, mode_of_payment, items } = req.body;

        const transaction = await cashierService.createTransaction({
            patient_id,
            cashier_id: req.user.id,
            status,
            mode_of_payment,
            items
        });

        res.status(201).json({ message: 'Transaction created successfully', transaction });
    } catch (err) {
        next(err);
    }
}

/**
 * Get all transactions.
 */
export async function getAllTransactions(req, res, next) {
    try {
        const transactions = await cashierService.getAllTransactions();
        res.json({ transactions });
    } catch (err) {
        next(err);
    }
}

/**
 * Get a single transaction by ID.
 */
export async function getTransactionById(req, res, next) {
    try {
        const { id } = req.params;
        const transaction = await cashierService.getTransactionById(id);
        res.json({ transaction });
    } catch (err) {
        next(err);
    }
}

/**
 * Update transaction status.
 */
export async function updateTransactionStatus(req, res, next) {
    try {
        validateUpdateTransactionStatus(req.body);

        const { id } = req.params;
        const { status } = req.body;

        const transaction = await cashierService.updateTransactionStatus(id, status);
        res.json({ message: 'Transaction status updated', transaction });
    } catch (err) {
        next(err);
    }
}

/**
 * Update a transaction's status and/or mode of payment.
 */
export async function updateTransaction(req, res, next) {
    try {
        validateUpdateTransaction(req.body);

        const { id } = req.params;
        const transaction = await cashierService.updateTransaction(id, req.body);
        res.json({ message: 'Transaction updated', transaction });
    } catch (err) {
        next(err);
    }
}

/** * Delete a transaction by ID.
 */
export async function deleteTransaction(req, res, next) {
    try {
        const { id } = req.params;
        await cashierService.deleteTransaction(id);
        res.json({ message: 'Transaction deleted successfully' });
    } catch (err) {
        next(err);
    }
}

/**
 * Add an item to an existing transaction.
 */
export async function addTransactionItem(req, res, next) {
    try {
        validateTransactionItem(req.body);

        const { id } = req.params;
        const { transaction_type_id, qty, unit, description, unit_price } = req.body;

        const result = await cashierService.addTransactionItem(id, {
            transaction_type_id,
            qty,
            unit,
            description,
            unit_price
        });

        res.status(201).json({ message: 'Transaction item added', ...result });
    } catch (err) {
        next(err);
    }
}

/**
 * Update a transaction item.
 */
export async function updateTransactionItem(req, res, next) {
    try {
        validateTransactionItemUpdate(req.body);

        const { id, itemId } = req.params;
        const { transaction_type_id, qty, unit, description, unit_price } = req.body;

        const result = await cashierService.updateTransactionItem(id, itemId, {
            transaction_type_id,
            qty,
            unit,
            description,
            unit_price
        });

        res.json({ message: 'Transaction item updated', ...result });
    } catch (err) {
        next(err);
    }
}

/**
 * Delete a transaction item.
 */
export async function deleteTransactionItem(req, res, next) {
    try {
        const { id, itemId } = req.params;
        const result = await cashierService.deleteTransactionItem(id, itemId);
        res.json({ message: 'Transaction item deleted', ...result });
    } catch (err) {
        next(err);
    }
}