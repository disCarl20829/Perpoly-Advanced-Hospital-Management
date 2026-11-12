import * as inventoryRepo from './repository.js';
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
// MATERIAL TYPES
// ============================================================

/**
 * Create a new material type.
 * @param {object} data - { name }
 * @returns {object} created material type
 */
export async function createMaterialType(data) {
    const existing = await inventoryRepo.findMaterialTypeByName(data.name);
    if (existing) {
        const err = new Error('Material type already exists');
        err.status = 409;
        throw err;
    }
    return await inventoryRepo.createMaterialType(data);
}

/**
 * Get all material types.
 * @returns {array} list of material types
 */
export async function getAllMaterialTypes() {
    return await inventoryRepo.findAllMaterialTypes();
}

// ============================================================
// MATERIALS
// ============================================================

/**
 * Create a new material.
 * @param {object} data - { name, material_type_id, unit, current_stock, reorder_threshold }
 * @returns {object} created material
 */
export async function createMaterial(data) {
    const existing = await inventoryRepo.findMaterialByName(data.name);
    if (existing) {
        const err = new Error('Material already exists');
        err.status = 409;
        throw err;
    }
    return await inventoryRepo.createMaterial(data);
}

/**
 * Get all materials.
 * @returns {array} list of materials
 */
export async function getAllMaterials() {
    return await inventoryRepo.findAllMaterials();
}

/**
 * Get a single material by ID.
 * @param {string} id - UUID
 * @returns {object} material
 */
export async function getMaterialById(id) {
    const material = await inventoryRepo.findMaterialById(id);
    if (!material) {
        const err = new Error('Material not found');
        err.status = 404;
        throw err;
    }
    return material;
}

/**
 * Update a material.
 * @param {string} id - UUID
 * @param {object} data - { name, material_type_id, unit, reorder_threshold }
 * @returns {object} updated material
 */
export async function updateMaterial(id, data) {
    const material = await inventoryRepo.findMaterialById(id);
    if (!material) {
        const err = new Error('Material not found');
        err.status = 404;
        throw err;
    }
    return await inventoryRepo.updateMaterial(id, data);
}

// ============================================================
// STOCK MOVEMENTS
// ============================================================

/**
 * Record a stock movement (in or out).
 * @param {object} data - { material_id, direction, qty, source, reference_id, performed_by }
 * @returns {object} { movement, material }
 */
export async function recordStockMovement(data) {
    const material = await inventoryRepo.findMaterialById(data.material_id);
    if (!material) {
        const err = new Error('Material not found');
        err.status = 404;
        throw err;
    }

    // Prevent negative stock
    if (data.direction === 'out' && data.qty > material.current_stock) {
        const err = new Error('Insufficient stock');
        err.status = 400;
        throw err;
    }

    return await inventoryRepo.createStockMovement(data);
}

/**
 * Deduct stock — used by the laboratory module when a lab result is recorded.
 * Joins an outer transaction when a client is provided.
 * @param {string} materialId - UUID
 * @param {number} qty
 * @param {string} referenceId - lab result id
 * @param {object} [client] - optional pg client from the caller's transaction
 * @returns {object} { movement, material }
 */
export async function deductStock(materialId, qty, referenceId, client) {
    return await inventoryRepo.createStockMovement(
        {
            material_id: materialId,
            direction: 'out',
            qty,
            source: 'lab_usage',
            reference_id: referenceId,
            performed_by: null
        },
        client
    );
}

/**
 * Get stock movements for a material.
 * @param {string} materialId - UUID
 * @returns {array} list of movements
 */
export async function getStockMovementsByMaterial(materialId) {
    return await inventoryRepo.findStockMovementsByMaterial(materialId);
}

/**
 * Get all stock movements.
 * @returns {array} list of movements
 */
export async function getAllStockMovements() {
    return await inventoryRepo.findAllStockMovements();
}

// ============================================================
// STOCK RECEIPTS (OCR)
// ============================================================

/**
 * Create a stock receipt OCR record (pending review).
 * @param {object} data - { raw_image_path, extracted_items }
 * @returns {object} created receipt
 */
export async function createStockReceiptOcr(data) {
    return await inventoryRepo.createStockReceiptOcr(data);
}

/**
 * Get all stock receipts OCR.
 * @returns {array} list of receipts
 */
export async function getAllStockReceiptsOcr() {
    return await inventoryRepo.findAllStockReceiptsOcr();
}

/**
 * Get a single stock receipt OCR by ID.
 * @param {string} id - UUID
 * @returns {object} receipt
 */
export async function getStockReceiptOcrById(id) {
    const receipt = await inventoryRepo.findStockReceiptOcrById(id);
    if (!receipt) {
        const err = new Error('Stock receipt not found');
        err.status = 404;
        throw err;
    }
    return receipt;
}

/**
 * Confirm a stock receipt: create materials for new items and
 * record stock-in movements for each extracted item.
 * @param {string} id - UUID
 * @param {string} verifiedBy - UUID
 * @returns {object} updated receipt
 */
export async function confirmStockReceipt(id, verifiedBy) {
    const receipt = await inventoryRepo.findStockReceiptOcrById(id);
    if (!receipt) {
        const err = new Error('Stock receipt not found');
        err.status = 404;
        throw err;
    }

    if (receipt.status === 'confirmed') {
        const err = new Error('Stock receipt already confirmed');
        err.status = 400;
        throw err;
    }

    const items = receipt.extracted_items || [];
    for (const item of items) {
        // Find or create the material
        let material = await inventoryRepo.findMaterialByName(item.name);
        if (!material) {
            material = await inventoryRepo.createMaterial({
                name: item.name,
                material_type_id: null,
                unit: item.unit || null,
                current_stock: 0,
                reorder_threshold: 0
            });
        }

        // Record the stock-in movement
        await inventoryRepo.createStockMovement({
            material_id: material.id,
            direction: 'in',
            qty: item.qty,
            source: 'ocr_intake',
            reference_id: receipt.id,
            performed_by: verifiedBy
        });
    }

    return await inventoryRepo.updateStockReceiptOcrStatus(id, 'confirmed', verifiedBy);
}

/**
 * Flag a stock receipt as mismatched (OCR qty != physical count).
 * @param {string} id - UUID
 * @param {string} verifiedBy - UUID
 * @returns {object} updated receipt
 */
export async function flagStockReceiptMismatch(id, verifiedBy) {
    const receipt = await inventoryRepo.findStockReceiptOcrById(id);
    if (!receipt) {
        const err = new Error('Stock receipt not found');
        err.status = 404;
        throw err;
    }
    return await inventoryRepo.updateStockReceiptOcrStatus(id, 'mismatch', verifiedBy);
}

// ============================================================
// STOCK STATUS / ALERTS
// ============================================================

/**
 * Get stock status for all materials (low / out / ok).
 * @returns {array} materials with a computed status
 */
export async function getStockStatus() {
    const materials = await inventoryRepo.findAllMaterials();
    return materials.map(m => ({
        ...m,
        status: m.current_stock <= 0
            ? 'out_of_stock'
            : (m.reorder_threshold > 0 && m.current_stock <= m.reorder_threshold)
                ? 'low_stock'
                : 'ok'
    }));
}

/**
 * Get incoming stock (pending OCR receipts).
 * @returns {array} pending receipts
 */
export async function getIncomingStock() {
    return await inventoryRepo.findAllStockReceiptsOcr();
}

// ============================================================
// EXPORTS
// ============================================================

const STATUS_LABELS = {
    ok: 'OK',
    low_stock: 'LOW STOCK',
    out_of_stock: 'OUT OF STOCK'
};

const STATUS_PRIORITY = {
    out_of_stock: 0,
    low_stock: 1,
    ok: 2
};

/**
 * Generate an Excel workbook of materials with quantity, threshold, and status.
 * @param {object} filters - { material_type_id, status, sort, order }
 * @returns {Promise<{buffer: Buffer, filename: string, count: number}>}
 */
export async function generateMaterialsExcel(filters = {}) {
    const sortOptions = ['name', 'type', 'stock', 'threshold', 'status'];
    if (filters.sort && !sortOptions.includes(filters.sort)) {
        const err = new Error(`sort must be one of: ${sortOptions.join(', ')}`);
        err.status = 400;
        throw err;
    }
    if (filters.status && !Object.keys(STATUS_LABELS).includes(filters.status)) {
        const err = new Error(`status must be one of: ${Object.keys(STATUS_LABELS).join(', ')}`);
        err.status = 400;
        throw err;
    }

    let materials = await getStockStatus();

    if (filters.material_type_id) {
        materials = materials.filter((material) => material.material_type_id === filters.material_type_id);
    }
    if (filters.status) {
        materials = materials.filter((material) => material.status === filters.status);
    }

    const sortKey = filters.sort || 'name';
    const direction = filters.order === 'desc' ? -1 : 1;
    materials.sort((a, b) => {
        let left;
        let right;

        switch (sortKey) {
            case 'type':
                left = a.material_type_name || '';
                right = b.material_type_name || '';
                return direction * left.localeCompare(right);
            case 'stock':
                left = Number(a.current_stock || 0);
                right = Number(b.current_stock || 0);
                break;
            case 'threshold':
                left = Number(a.reorder_threshold || 0);
                right = Number(b.reorder_threshold || 0);
                break;
            case 'status':
                left = STATUS_PRIORITY[a.status];
                right = STATUS_PRIORITY[b.status];
                break;
            default:
                left = a.name || '';
                right = b.name || '';
                return direction * left.localeCompare(right);
        }

        if (left === right) return direction * String(a.name || '').localeCompare(String(b.name || ''));
        return direction * (left - right);
    });

    const workbook = createWorkbook();
    const sheet = workbook.addWorksheet('Materials');
    const headers = ['Material', 'Type', 'Unit', 'Current Stock', 'Reorder Threshold', 'Status'];
    const subtitle = `As of ${formatManilaDateTime(new Date())}`;
    const headerRow = addTitle(sheet, 'INVENTORY MATERIALS REPORT', subtitle, headers.length);
    writeHeaderRow(sheet, headerRow, headers);

    if (materials.length === 0) {
        const row = headerRow + 1;
        sheet.mergeCells(row, 1, row, headers.length);
        const cell = sheet.getCell(row, 1);
        cell.value = 'No materials found for the selected filters.';
        cell.font = { italic: true, size: 10, color: { argb: 'FF64748B' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    } else {
        materials.forEach((material, index) => {
            const row = headerRow + 1 + index;
            writeDataRow(sheet, row, [
                material.name || '',
                material.material_type_name || 'Unassigned',
                material.unit || '',
                Number(material.current_stock || 0),
                Number(material.reorder_threshold || 0),
                STATUS_LABELS[material.status] || material.status
            ], { center: [4, 5, 6] });

            const statusCell = sheet.getCell(row, 6);
            statusCell.font = {
                bold: true,
                size: 10,
                color: {
                    argb: material.status === 'out_of_stock'
                        ? 'FF991B1B'
                        : material.status === 'low_stock'
                            ? 'FF92400E'
                            : 'FF166534'
                }
            };
        });

        const totalRow = headerRow + materials.length + 2;
        sheet.getCell(totalRow, 1).value = 'Total materials';
        sheet.getCell(totalRow, 1).font = { bold: true, size: 10 };
        sheet.getCell(totalRow, 2).value = materials.length;
        sheet.getCell(totalRow, 2).font = { bold: true, size: 10 };
        sheet.getCell(totalRow, 5).value = 'Out of stock';
        sheet.getCell(totalRow, 5).font = { bold: true, size: 10 };
        sheet.getCell(totalRow, 6).value = materials.filter((material) => material.status === 'out_of_stock').length;
        sheet.getCell(totalRow, 6).font = { bold: true, size: 10 };
    }

    freezeBelow(sheet, headerRow);
    autoWidth(sheet, { min: 12, max: 45 });

    const filename = `inventory-materials-${formatManilaDate(new Date())}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    return { buffer, filename, count: materials.length };
}

/**
 * Generate an Excel workbook summarizing materials by material type.
 * @param {object} filters - { sort, order }
 * @returns {Promise<{buffer: Buffer, filename: string, count: number}>}
 */
export async function generateMaterialTypesExcel(filters = {}) {
    const sortOptions = ['name', 'materials', 'stock', 'low', 'out'];
    if (filters.sort && !sortOptions.includes(filters.sort)) {
        const err = new Error(`sort must be one of: ${sortOptions.join(', ')}`);
        err.status = 400;
        throw err;
    }

    const [types, materials] = await Promise.all([
        inventoryRepo.findAllMaterialTypes(),
        getStockStatus()
    ]);

    const byType = new Map();
    for (const type of types) {
        byType.set(type.id, {
            name: type.name,
            materials: 0,
            stock: 0,
            low: 0,
            out: 0
        });
    }

    for (const material of materials) {
        const key = material.material_type_id;
        if (!byType.has(key)) {
            byType.set(key, {
                name: 'Unassigned',
                materials: 0,
                stock: 0,
                low: 0,
                out: 0
            });
        }

        const entry = byType.get(key);
        entry.materials += 1;
        entry.stock += Number(material.current_stock || 0);
        if (material.status === 'low_stock') entry.low += 1;
        if (material.status === 'out_of_stock') entry.out += 1;
    }

    const rows = Array.from(byType.values());
    const sortKey = filters.sort || 'name';
    const direction = filters.order === 'desc' ? -1 : 1;
    rows.sort((a, b) => {
        if (sortKey === 'name') return direction * a.name.localeCompare(b.name);
        const left = a[sortKey];
        const right = b[sortKey];
        if (left === right) return direction * a.name.localeCompare(b.name);
        return direction * (left - right);
    });

    const workbook = createWorkbook();
    const sheet = workbook.addWorksheet('Material Types');
    const headers = ['Material Type', 'Materials', 'Total Stock', 'Low Stock', 'Out of Stock'];
    const subtitle = `As of ${formatManilaDateTime(new Date())}`;
    const headerRow = addTitle(sheet, 'INVENTORY MATERIAL TYPES REPORT', subtitle, headers.length);
    writeHeaderRow(sheet, headerRow, headers);

    if (rows.length === 0) {
        const row = headerRow + 1;
        sheet.mergeCells(row, 1, row, headers.length);
        const cell = sheet.getCell(row, 1);
        cell.value = 'No material types found.';
        cell.font = { italic: true, size: 10, color: { argb: 'FF64748B' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    } else {
        rows.forEach((entry, index) => {
            const row = headerRow + 1 + index;
            writeDataRow(sheet, row, [
                entry.name,
                entry.materials,
                entry.stock,
                entry.low,
                entry.out
            ], { center: [2, 3, 4, 5] });
        });

        const totalRow = headerRow + rows.length + 2;
        sheet.getCell(totalRow, 1).value = 'Total';
        sheet.getCell(totalRow, 1).font = { bold: true, size: 10 };
        [2, 3, 4, 5].forEach((column) => {
            const cell = sheet.getCell(totalRow, column);
            cell.value = rows.reduce((sum, entry) => {
                const key = column === 2 ? 'materials' : column === 3 ? 'stock' : column === 4 ? 'low' : 'out';
                return sum + entry[key];
            }, 0);
            cell.font = { bold: true, size: 10 };
            cell.alignment = { horizontal: 'center' };
        });
    }

    freezeBelow(sheet, headerRow);
    autoWidth(sheet, { min: 14, max: 40 });

    const filename = `inventory-material-types-${formatManilaDate(new Date())}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    return { buffer, filename, count: rows.length };
}
