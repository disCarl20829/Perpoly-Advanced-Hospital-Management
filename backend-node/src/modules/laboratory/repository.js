import db from '../../config/db.js';

// ============================================================
// LABORATORIES
// ============================================================

/**
 * Find all laboratories.
 * @returns {array} list of laboratories
 */
export async function findAllLaboratories() {
    const query = `SELECT * FROM laboratory.laboratories ORDER BY name`;
    const { rows } = await db.query(query);
    return rows;
}

/**
 * Find a laboratory by ID.
 * @param {string} id - UUID
 * @returns {object|null}
 */
export async function findLaboratoryById(id) {
    const query = `SELECT * FROM laboratory.laboratories WHERE id = $1`;
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
}

// ============================================================
// LAB MATERIAL DEFAULTS
// ============================================================

/**
 * Get material defaults for a laboratory.
 * @param {string} laboratoryId - UUID
 * @returns {array} list of material defaults
 */
export async function findLabMaterialDefaults(laboratoryId) {
    const query = `
        SELECT lmd.*, m.name AS material_name, m.unit AS material_unit
        FROM laboratory.lab_material_defaults lmd
        JOIN inventory.materials m ON m.id = lmd.material_id
        WHERE lmd.laboratory_id = $1
        ORDER BY m.name
    `;
    const { rows } = await db.query(query, [laboratoryId]);
    return rows;
}

/**
 * Set or update a material default for a laboratory.
 * @param {string} laboratoryId - UUID
 * @param {string} materialId - UUID
 * @param {number} defaultQty
 * @returns {object} updated default
 */
export async function upsertLabMaterialDefault(laboratoryId, materialId, defaultQty) {
    const query = `
        INSERT INTO laboratory.lab_material_defaults (laboratory_id, material_id, default_qty)
        VALUES ($1, $2, $3)
        ON CONFLICT (laboratory_id, material_id)
        DO UPDATE SET default_qty = $3
        RETURNING *
    `;
    const { rows } = await db.query(query, [laboratoryId, materialId, defaultQty]);
    return rows[0];
}

/**
 * Delete a material default from a laboratory.
 * @param {string} laboratoryId - UUID
 * @param {string} materialId - UUID
 */
export async function deleteLabMaterialDefault(laboratoryId, materialId) {
    const query = `
        DELETE FROM laboratory.lab_material_defaults
        WHERE laboratory_id = $1 AND material_id = $2
    `;
    await db.query(query, [laboratoryId, materialId]);
}

// ============================================================
// LAB RESULTS
// ============================================================

/**
 * Create a new lab result with materials used.
 *
 * Pass a `client` to join an existing transaction (e.g. when called from
 * another module). When omitted, this function manages its own transaction.
 *
 * @param {object} data - { transaction_item_id, laboratory_id, doctor_id, result_data, materials_used }
 * @param {object} [client] - optional pg client from an outer transaction
 * @returns {object} created lab result
 */
export async function createLabResult(data, client) {
    // No client passed: manage our own transaction
    if (!client) {
        const ownClient = await db.connect();
        try {
            await ownClient.query('BEGIN');
            const result = await createLabResult(data, ownClient);
            await ownClient.query('COMMIT');
            return result;
        } catch (err) {
            await ownClient.query('ROLLBACK');
            throw err;
        } finally {
            ownClient.release();
        }
    }

    const { transaction_item_id, laboratory_id, doctor_id, result_data, materials_used } = data;

    // Insert lab result
    const resultQuery = `
        INSERT INTO laboratory.lab_results (transaction_item_id, laboratory_id, doctor_id, result_data, status, recorded_at)
        VALUES ($1, $2, $3, $4, 'completed', NOW())
        RETURNING *
    `;
    const result = await client.query(resultQuery, [transaction_item_id, laboratory_id, doctor_id, result_data]);
    const labResult = result.rows[0];

    // Insert materials used
    for (const material of materials_used) {
        await client.query(`
            INSERT INTO laboratory.lab_result_materials_used (lab_result_id, material_id, qty_used)
            VALUES ($1, $2, $3)
        `, [labResult.id, material.material_id, material.qty_used]);
    }

    return labResult;
}

/**
 * Find lab results by laboratory.
 * @param {string} laboratoryId - UUID
 * @returns {array} list of lab results
 */
export async function findLabResultsByLaboratory(laboratoryId) {
    const query = `
        SELECT lr.*, TRIM(CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name)) AS patient_name, tt.name AS transaction_type_name
        FROM laboratory.lab_results lr
        JOIN cashier.transaction_items ti ON ti.id = lr.transaction_item_id
        JOIN cashier.transactions t ON t.id = ti.transaction_id
        JOIN cashier.patients p ON p.id = t.patient_id
        JOIN cashier.transaction_types tt ON tt.id = ti.transaction_type_id
        WHERE lr.laboratory_id = $1
        ORDER BY lr.recorded_at DESC
    `;
    const { rows } = await db.query(query, [laboratoryId]);
    return rows;
}

/**
 * Find lab results by doctor.
 * @param {string} doctorId - UUID
 * @returns {array} list of lab results
 */
export async function findLabResultsByDoctor(doctorId) {
    const query = `
        SELECT lr.*, TRIM(CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name)) AS patient_name, tt.name AS transaction_type_name
        FROM laboratory.lab_results lr
        JOIN cashier.transaction_items ti ON ti.id = lr.transaction_item_id
        JOIN cashier.transactions t ON t.id = ti.transaction_id
        JOIN cashier.patients p ON p.id = t.patient_id
        JOIN cashier.transaction_types tt ON tt.id = ti.transaction_type_id
        WHERE lr.doctor_id = $1
        ORDER BY lr.recorded_at DESC
    `;
    const { rows } = await db.query(query, [doctorId]);
    return rows;
}

/**
 * Find a lab result by ID with materials used.
 * @param {string} id - UUID
 * @returns {object|null}
 */
export async function findLabResultById(id) {
    const query = `
        SELECT lr.*, TRIM(CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name)) AS patient_name, tt.name AS transaction_type_name
        FROM laboratory.lab_results lr
        JOIN cashier.transaction_items ti ON ti.id = lr.transaction_item_id
        JOIN cashier.transactions t ON t.id = ti.transaction_id
        JOIN cashier.patients p ON p.id = t.patient_id
        JOIN cashier.transaction_types tt ON tt.id = ti.transaction_type_id
        WHERE lr.id = $1
    `;
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
}

/**
 * Get materials used for a lab result.
 * @param {string} labResultId - UUID
 * @returns {array} list of materials used
 */
export async function findLabResultMaterials(labResultId) {
    const query = `
        SELECT lrmu.*, m.name AS material_name, m.unit AS material_unit
        FROM laboratory.lab_result_materials_used lrmu
        JOIN inventory.materials m ON m.id = lrmu.material_id
        WHERE lrmu.lab_result_id = $1
    `;
    const { rows } = await db.query(query, [labResultId]);
    return rows;
}

/**
 * Get pending transactions for a laboratory (no lab result yet).
 * @param {string} laboratoryId - UUID
 * @returns {array} list of pending transaction items
 */
export async function findPendingTransactions(laboratoryId) {
    const query = `
        SELECT ti.*, tt.name AS transaction_type_name, tt.category AS transaction_type_category,
               TRIM(CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name)) AS patient_name, t.receipt_no, t.status AS payment_status
        FROM cashier.transaction_items ti
        JOIN cashier.transaction_types tt ON tt.id = ti.transaction_type_id
        JOIN cashier.transactions t ON t.id = ti.transaction_id
        JOIN cashier.patients p ON p.id = t.patient_id
        WHERE tt.category = (
            SELECT name FROM laboratory.laboratories WHERE id = $1
        )
        AND ti.id NOT IN (
            SELECT transaction_item_id FROM laboratory.lab_results
        )
        ORDER BY t.issued_at ASC
    `;
    const { rows } = await db.query(query, [laboratoryId]);
    return rows;
}
