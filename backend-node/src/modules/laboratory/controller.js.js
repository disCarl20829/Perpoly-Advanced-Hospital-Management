import * as labService from './service.js';

// ============================================================
// LABORATORIES
// ============================================================

/**
 * Get all laboratories.
 */
export async function getAllLaboratories(req, res, next) {
    try {
        const laboratories = await labService.getAllLaboratories();
        res.json({ laboratories });
    } catch (err) {
        next(err);
    }
}

/**
 * Get a single laboratory by ID.
 */
export async function getLaboratoryById(req, res, next) {
    try {
        const { id } = req.params;
        const laboratory = await labService.getLaboratoryById(id);
        res.json({ laboratory });
    } catch (err) {
        next(err);
    }
}

// ============================================================
// LAB MATERIAL DEFAULTS
// ============================================================

/**
 * Get material defaults for a laboratory.
 */
export async function getLabMaterialDefaults(req, res, next) {
    try {
        const { laboratory_id } = req.params;
        const defaults = await labService.getLabMaterialDefaults(laboratory_id);
        res.json({ defaults });
    } catch (err) {
        next(err);
    }
}

/**
 * Set or update a material default.
 */
export async function upsertLabMaterialDefault(req, res, next) {
    try {
        const { laboratory_id, material_id } = req.params;
        const { default_qty } = req.body;

        const result = await labService.upsertLabMaterialDefault(laboratory_id, material_id, default_qty);
        res.json({ message: 'Material default updated', default: result });
    } catch (err) {
        next(err);
    }
}

/**
 * Delete a material default.
 */
export async function deleteLabMaterialDefault(req, res, next) {
    try {
        const { laboratory_id, material_id } = req.params;
        await labService.deleteLabMaterialDefault(laboratory_id, material_id);
        res.json({ message: 'Material default deleted' });
    } catch (err) {
        next(err);
    }
}

// ============================================================
// LAB RESULTS
// ============================================================

/**
 * Create a lab result.
 */
export async function createLabResult(req, res, next) {
    try {
        const { transaction_item_id, laboratory_id, result_data, materials_used } = req.body;

        const result = await labService.createLabResult({
            transaction_item_id,
            laboratory_id,
            doctor_id: req.user.id,
            result_data,
            materials_used
        });

        res.status(201).json({ message: 'Lab result created', result });
    } catch (err) {
        next(err);
    }
}

/**
 * Get lab results by laboratory.
 */
export async function getLabResultsByLaboratory(req, res, next) {
    try {
        const { laboratory_id } = req.params;
        const results = await labService.getLabResultsByLaboratory(laboratory_id);
        res.json({ results });
    } catch (err) {
        next(err);
    }
}

/**
 * Get lab results by doctor.
 */
export async function getLabResultsByDoctor(req, res, next) {
    try {
        const { doctor_id } = req.params;
        const results = await labService.getLabResultsByDoctor(doctor_id);
        res.json({ results });
    } catch (err) {
        next(err);
    }
}

/**
 * Get a single lab result by ID.
 */
export async function getLabResultById(req, res, next) {
    try {
        const { id } = req.params;
        const result = await labService.getLabResultById(id);
        res.json({ result });
    } catch (err) {
        next(err);
    }
}

/**
 * Get pending transactions for a laboratory.
 */
export async function getPendingTransactions(req, res, next) {
    try {
        const { laboratory_id } = req.params;
        const transactions = await labService.getPendingTransactions(laboratory_id);
        res.json({ transactions });
    } catch (err) {
        next(err);
    }
}
