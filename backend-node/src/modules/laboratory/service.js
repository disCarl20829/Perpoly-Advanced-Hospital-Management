import db from '../../config/db.js';
import * as labRepo from './repository.js';
import * as inventoryService from '../inventory/service.js';

// ============================================================
// LABORATORIES
// ============================================================

/**
 * Get all laboratories.
 * @returns {array} list of laboratories
 */
export async function getAllLaboratories() {
    return await labRepo.findAllLaboratories();
}

/**
 * Get a single laboratory by ID.
 * @param {string} id - UUID
 * @returns {object} laboratory
 */
export async function getLaboratoryById(id) {
    const laboratory = await labRepo.findLaboratoryById(id);
    if (!laboratory) {
        const err = new Error('Laboratory not found');
        err.status = 404;
        throw err;
    }
    return laboratory;
}

// ============================================================
// LAB MATERIAL DEFAULTS
// ============================================================

/**
 * Get material defaults for a laboratory.
 * @param {string} laboratoryId - UUID
 * @returns {array} list of material defaults
 */
export async function getLabMaterialDefaults(laboratoryId) {
    const laboratory = await labRepo.findLaboratoryById(laboratoryId);
    if (!laboratory) {
        const err = new Error('Laboratory not found');
        err.status = 404;
        throw err;
    }
    return await labRepo.findLabMaterialDefaults(laboratoryId);
}

/**
 * Set or update a material default for a laboratory.
 * @param {string} laboratoryId - UUID
 * @param {string} materialId - UUID
 * @param {number} defaultQty
 * @returns {object} updated default
 */
export async function upsertLabMaterialDefault(laboratoryId, materialId, defaultQty) {
    const laboratory = await labRepo.findLaboratoryById(laboratoryId);
    if (!laboratory) {
        const err = new Error('Laboratory not found');
        err.status = 404;
        throw err;
    }
    return await labRepo.upsertLabMaterialDefault(laboratoryId, materialId, defaultQty);
}

/**
 * Delete a material default from a laboratory.
 * @param {string} laboratoryId - UUID
 * @param {string} materialId - UUID
 */
export async function deleteLabMaterialDefault(laboratoryId, materialId) {
    const laboratory = await labRepo.findLaboratoryById(laboratoryId);
    if (!laboratory) {
        const err = new Error('Laboratory not found');
        err.status = 404;
        throw err;
    }
    await labRepo.deleteLabMaterialDefault(laboratoryId, materialId);
}

// ============================================================
// LAB RESULTS
// ============================================================

/**
 * Create a lab result with materials used, and deduct the materials
 * from inventory — all in one database transaction.
 *
 * If anything fails, BOTH the lab result and the stock deductions roll back,
 * so the data stays consistent.
 *
 * @param {object} data - { transaction_item_id, laboratory_id, doctor_id, result_data, materials_used }
 * @returns {object} created lab result
 */
export async function createLabResult(data) {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // 1. Create the lab result
        const result = await labRepo.createLabResult(data, client);

        // 2. Deduct each material from inventory (same transaction)
        for (const material of data.materials_used) {
            await inventoryService.deductStock(
                material.material_id,
                material.qty_used,
                result.id,
                client
            );
        }

        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Get lab results by laboratory.
 * @param {string} laboratoryId - UUID
 * @returns {array} list of lab results
 */
export async function getLabResultsByLaboratory(laboratoryId) {
    const laboratory = await labRepo.findLaboratoryById(laboratoryId);
    if (!laboratory) {
        const err = new Error('Laboratory not found');
        err.status = 404;
        throw err;
    }
    return await labRepo.findLabResultsByLaboratory(laboratoryId);
}

/**
 * Get lab results by doctor.
 * @param {string} doctorId - UUID
 * @returns {array} list of lab results
 */
export async function getLabResultsByDoctor(doctorId) {
    return await labRepo.findLabResultsByDoctor(doctorId);
}

/**
 * Get a single lab result by ID with materials used.
 * @param {string} id - UUID
 * @returns {object} lab result with materials
 */
export async function getLabResultById(id) {
    const result = await labRepo.findLabResultById(id);
    if (!result) {
        const err = new Error('Lab result not found');
        err.status = 404;
        throw err;
    }

    const materials = await labRepo.findLabResultMaterials(id);
    return { ...result, materials_used: materials };
}

/**
 * Get pending transactions for a laboratory.
 * @param {string} laboratoryId - UUID
 * @returns {array} list of pending transaction items
 */
export async function getPendingTransactions(laboratoryId) {
    const laboratory = await labRepo.findLaboratoryById(laboratoryId);
    if (!laboratory) {
        const err = new Error('Laboratory not found');
        err.status = 404;
        throw err;
    }
    return await labRepo.findPendingTransactions(laboratoryId);
}
