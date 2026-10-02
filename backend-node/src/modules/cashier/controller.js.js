import * as cashierService from './service.js';
import { validateCreatePatient, validateCreateTransactionType, validateCreateTransaction, validateUpdateTransactionStatus } from './validation.js';

// ============================================================
// PATIENTS
// ============================================================

/**
 * Create a new patient.
 */
export async function createPatient(req, res, next) {
    try {
        validateCreatePatient(req.body);

        const { full_name, gender, birthdate, address, contact_no } = req.body;

        const patient = await cashierService.createPatient({
            full_name,
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

// ============================================================
// TRANSACTIONS
// ============================================================

/**
 * Create a new transaction.
 */
export async function createTransaction(req, res, next) {
    try {
        validateCreateTransaction(req.body);

        const { patient_id, status, items } = req.body;

        const transaction = await cashierService.createTransaction({
            patient_id,
            cashier_id: req.user.id,
            status,
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
