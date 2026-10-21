import * as inventoryRepo from './repository.js';

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
