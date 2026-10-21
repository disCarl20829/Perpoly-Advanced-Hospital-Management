import * as inventoryService from './service.js';
import {
    validateCreateMaterialType,
    validateCreateMaterial,
    validateUpdateMaterial,
    validateStockMovement,
    validateCreateStockReceiptOcr
} from './validation.js';

// ============================================================
// MATERIAL TYPES
// ============================================================

export async function createMaterialType(req, res, next) {
    try {
        validateCreateMaterialType(req.body);

        const { name } = req.body;
        const materialType = await inventoryService.createMaterialType({ name });
        res.status(201).json({ message: 'Material type created', materialType });
    } catch (err) {
        next(err);
    }
}

export async function getAllMaterialTypes(req, res, next) {
    try {
        const materialTypes = await inventoryService.getAllMaterialTypes();
        res.json({ materialTypes });
    } catch (err) {
        next(err);
    }
}

// ============================================================
// MATERIALS
// ============================================================

export async function createMaterial(req, res, next) {
    try {
        validateCreateMaterial(req.body);

        const { name, material_type_id, unit, current_stock, reorder_threshold } = req.body;
        const material = await inventoryService.createMaterial({
            name,
            material_type_id,
            unit,
            current_stock: current_stock || 0,
            reorder_threshold: reorder_threshold || 0
        });
        res.status(201).json({ message: 'Material created', material });
    } catch (err) {
        next(err);
    }
}

export async function getAllMaterials(req, res, next) {
    try {
        const materials = await inventoryService.getAllMaterials();
        res.json({ materials });
    } catch (err) {
        next(err);
    }
}

export async function getMaterialById(req, res, next) {
    try {
        const { id } = req.params;
        const material = await inventoryService.getMaterialById(id);
        res.json({ material });
    } catch (err) {
        next(err);
    }
}

export async function updateMaterial(req, res, next) {
    try {
        validateUpdateMaterial(req.body);

        const { id } = req.params;
        const { name, material_type_id, unit, reorder_threshold } = req.body;
        const material = await inventoryService.updateMaterial(id, {
            name,
            material_type_id,
            unit,
            reorder_threshold
        });
        res.json({ message: 'Material updated', material });
    } catch (err) {
        next(err);
    }
}

// ============================================================
// STOCK MOVEMENTS
// ============================================================

export async function recordStockMovement(req, res, next) {
    try {
        validateStockMovement(req.body);

        const { material_id, direction, qty, source, reference_id } = req.body;
        const result = await inventoryService.recordStockMovement({
            material_id,
            direction,
            qty,
            source,
            reference_id: reference_id || null,
            performed_by: req.user.id
        });
        res.status(201).json({ message: 'Stock movement recorded', ...result });
    } catch (err) {
        next(err);
    }
}

export async function getStockMovementsByMaterial(req, res, next) {
    try {
        const { id } = req.params;
        const movements = await inventoryService.getStockMovementsByMaterial(id);
        res.json({ movements });
    } catch (err) {
        next(err);
    }
}

export async function getAllStockMovements(req, res, next) {
    try {
        const movements = await inventoryService.getAllStockMovements();
        res.json({ movements });
    } catch (err) {
        next(err);
    }
}

// ============================================================
// STOCK RECEIPTS (OCR)
// ============================================================

export async function createStockReceiptOcr(req, res, next) {
    try {
        validateCreateStockReceiptOcr(req.body);

        const { raw_image_path, extracted_items } = req.body;
        const receipt = await inventoryService.createStockReceiptOcr({
            raw_image_path,
            extracted_items
        });
        res.status(201).json({ message: 'Stock receipt created for review', receipt });
    } catch (err) {
        next(err);
    }
}

export async function getAllStockReceiptsOcr(req, res, next) {
    try {
        const receipts = await inventoryService.getAllStockReceiptsOcr();
        res.json({ receipts });
    } catch (err) {
        next(err);
    }
}

export async function getStockReceiptOcrById(req, res, next) {
    try {
        const { id } = req.params;
        const receipt = await inventoryService.getStockReceiptOcrById(id);
        res.json({ receipt });
    } catch (err) {
        next(err);
    }
}

export async function confirmStockReceipt(req, res, next) {
    try {
        const { id } = req.params;
        const receipt = await inventoryService.confirmStockReceipt(id, req.user.id);
        res.json({ message: 'Stock receipt confirmed', receipt });
    } catch (err) {
        next(err);
    }
}

export async function flagStockReceiptMismatch(req, res, next) {
    try {
        const { id } = req.params;
        const receipt = await inventoryService.flagStockReceiptMismatch(id, req.user.id);
        res.json({ message: 'Stock receipt flagged as mismatch', receipt });
    } catch (err) {
        next(err);
    }
}

// ============================================================
// STOCK STATUS / ALERTS
// ============================================================

export async function getStockStatus(req, res, next) {
    try {
        const materials = await inventoryService.getStockStatus();
        res.json({ materials });
    } catch (err) {
        next(err);
    }
}

export async function getIncomingStock(req, res, next) {
    try {
        const receipts = await inventoryService.getIncomingStock();
        res.json({ receipts });
    } catch (err) {
        next(err);
    }
}
