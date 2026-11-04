import db from '../../config/db.js';
import * as labRepo from './repository.js';
import * as inventoryService from '../inventory/service.js';
import {
    addTitle,
    autoWidth,
    createWorkbook,
    formatManilaDate,
    formatManilaDateTime,
    freezeBelow,
    writeDataRow,
    writeHeaderRow
} from '../../utils/excel.js';

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

// ============================================================
// EXPORTS
// ============================================================

/**
 * Generate an Excel workbook of laboratory results and the materials used.
 * Supports selected result IDs or the full filtered list.
 * @param {object} filters - { laboratory_id, doctor_id, from, to, ids, status, sort, order }
 * @returns {Promise<{buffer: Buffer, filename: string, count: number}>}
 */
export async function generateLabResultsExcel(filters = {}) {
    if (filters.status && !['pending', 'completed'].includes(filters.status)) {
        const err = new Error('status must be pending or completed');
        err.status = 400;
        throw err;
    }

    const sortOptions = ['recorded_at', 'patient', 'examination', 'laboratory', 'doctor', 'status', 'receipt_no'];
    if (filters.sort && !sortOptions.includes(filters.sort)) {
        const err = new Error(`sort must be one of: ${sortOptions.join(', ')}`);
        err.status = 400;
        throw err;
    }

    const results = await labRepo.findLabResultsForExport(filters);
    const materials = await labRepo.findMaterialsUsedForResults(results.map((result) => result.id));

    const materialsByResult = new Map();
    for (const material of materials) {
        const key = material.lab_result_id;
        if (!materialsByResult.has(key)) materialsByResult.set(key, []);
        materialsByResult.get(key).push(material);
    }

    const workbook = createWorkbook();
    const fromLabel = filters.from ? formatManilaDate(filters.from) : 'All time';
    const toLabel = filters.to ? formatManilaDate(filters.to) : 'present';
    const subtitle = `Period: ${fromLabel} to ${toLabel} | Generated: ${formatManilaDateTime(new Date())}`;

    // Results sheet
    const resultsSheet = workbook.addWorksheet('Lab Results');
    const resultHeaders = [
        'Date Recorded',
        'Receipt No.',
        'Patient',
        'Laboratory',
        'Examination',
        'Doctor',
        'Status',
        'Result',
        'Materials Used'
    ];
    const resultHeaderRow = addTitle(resultsSheet, 'LABORATORY RESULTS REPORT', subtitle, resultHeaders.length);
    writeHeaderRow(resultsSheet, resultHeaderRow, resultHeaders);

    if (results.length === 0) {
        const row = resultHeaderRow + 1;
        resultsSheet.mergeCells(row, 1, row, resultHeaders.length);
        const cell = resultsSheet.getCell(row, 1);
        cell.value = 'No laboratory results found for the selected filters.';
        cell.font = { italic: true, size: 10, color: { argb: 'FF64748B' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    } else {
        results.forEach((result, index) => {
            const row = resultHeaderRow + 1 + index;
            const resultMaterials = materialsByResult.get(result.id) || [];
            writeDataRow(resultsSheet, row, [
                formatManilaDateTime(result.recorded_at),
                result.receipt_no || '',
                result.patient_name || '',
                result.laboratory_name || '',
                result.examination_name || '',
                result.doctor_name || '',
                result.status || '',
                formatResultData(result.result_data),
                resultMaterials.length
            ], { center: [1, 2, 7, 9] });

            const statusCell = resultsSheet.getCell(row, 7);
            statusCell.font = {
                bold: true,
                size: 10,
                color: { argb: result.status === 'completed' ? 'FF166534' : 'FF92400E' }
            };
        });

        const totalRow = resultHeaderRow + results.length + 2;
        resultsSheet.getCell(totalRow, 1).value = 'Total results';
        resultsSheet.getCell(totalRow, 1).font = { bold: true, size: 10 };
        resultsSheet.getCell(totalRow, 2).value = results.length;
        resultsSheet.getCell(totalRow, 2).font = { bold: true, size: 10 };
    }

    freezeBelow(resultsSheet, resultHeaderRow);
    autoWidth(resultsSheet, { min: 12, max: 60 });

    // Materials used sheet
    const materialsSheet = workbook.addWorksheet('Materials Used');
    const materialHeaders = [
        'Date Recorded',
        'Receipt No.',
        'Patient',
        'Laboratory',
        'Examination',
        'Material',
        'Qty Used',
        'Unit'
    ];
    const materialHeaderRow = addTitle(materialsSheet, 'MATERIALS USED', subtitle, materialHeaders.length);
    writeHeaderRow(materialsSheet, materialHeaderRow, materialHeaders);

    const resultById = new Map(results.map((result) => [result.id, result]));

    if (materials.length === 0) {
        const row = materialHeaderRow + 1;
        materialsSheet.mergeCells(row, 1, row, materialHeaders.length);
        const cell = materialsSheet.getCell(row, 1);
        cell.value = 'No materials used for the selected results.';
        cell.font = { italic: true, size: 10, color: { argb: 'FF64748B' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    } else {
        materials.forEach((material, index) => {
            const row = materialHeaderRow + 1 + index;
            const result = resultById.get(material.lab_result_id) || {};
            writeDataRow(materialsSheet, row, [
                formatManilaDateTime(result.recorded_at),
                result.receipt_no || '',
                result.patient_name || '',
                result.laboratory_name || '',
                result.examination_name || '',
                material.material_name || '',
                Number(material.qty_used || 0),
                material.material_unit || ''
            ], { center: [1, 2, 7] });
        });

        const totalRow = materialHeaderRow + materials.length + 2;
        materialsSheet.getCell(totalRow, 1).value = 'Total material lines';
        materialsSheet.getCell(totalRow, 1).font = { bold: true, size: 10 };
        materialsSheet.getCell(totalRow, 2).value = materials.length;
        materialsSheet.getCell(totalRow, 2).font = { bold: true, size: 10 };
    }

    freezeBelow(materialsSheet, materialHeaderRow);
    autoWidth(materialsSheet, { min: 12, max: 50 });

    const rangeName = filters.from || filters.to
        ? `${filters.from ? formatManilaDate(filters.from) : 'start'}-to-${filters.to ? formatManilaDate(filters.to) : 'end'}`
        : formatManilaDate(new Date());
    const filename = `laboratory-results-${rangeName}.xlsx`.replace(/[^a-zA-Z0-9._-]/g, '-');

    const buffer = await workbook.xlsx.writeBuffer();
    return { buffer, filename, count: results.length };
}

function formatResultData(value) {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'string') return value;
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}
