import db from '../../config/db.js';

// ============================================================
// MATERIAL TYPES
// ============================================================

/**
 * Create a new material type.
 * @param {object} data - { name }
 * @returns {object} created material type
 */
export async function createMaterialType({ name }) {
    const query = `
        INSERT INTO inventory.material_types (name)
        VALUES ($1)
        RETURNING *
    `;
    const { rows } = await db.query(query, [name]);
    return rows[0];
}

/**
 * Find all material types.
 * @returns {array} list of material types
 */
export async function findAllMaterialTypes() {
    const query = `SELECT * FROM inventory.material_types ORDER BY name`;
    const { rows } = await db.query(query);
    return rows;
}

/**
 * Find a material type by ID.
 * @param {string} id - UUID
 * @returns {object|null}
 */
export async function findMaterialTypeById(id) {
    const query = `SELECT * FROM inventory.material_types WHERE id = $1`;
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
}

/**
 * Find a material type by name.
 * @param {string} name
 * @returns {object|null}
 */
export async function findMaterialTypeByName(name) {
    const query = `SELECT * FROM inventory.material_types WHERE name ILIKE $1`;
    const { rows } = await db.query(query, [name]);
    return rows[0] || null;
}

// ============================================================
// MATERIALS
// ============================================================

/**
 * Create a new material.
 * @param {object} data - { name, material_type_id, unit, current_stock, reorder_threshold }
 * @returns {object} created material
 */
export async function createMaterial({ name, material_type_id, unit, current_stock, reorder_threshold }) {
    const query = `
        INSERT INTO inventory.materials (name, material_type_id, unit, current_stock, reorder_threshold)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    `;
    const { rows } = await db.query(query, [name, material_type_id, unit, current_stock, reorder_threshold]);
    return rows[0];
}

/**
 * Find all materials.
 * @returns {array} list of materials
 */
export async function findAllMaterials() {
    const query = `
        SELECT m.*, mt.name AS material_type_name
        FROM inventory.materials m
        LEFT JOIN inventory.material_types mt ON mt.id = m.material_type_id
        ORDER BY m.name
    `;
    const { rows } = await db.query(query);
    return rows;
}

/**
 * Find a material by ID.
 * @param {string} id - UUID
 * @returns {object|null}
 */
export async function findMaterialById(id) {
    const query = `
        SELECT m.*, mt.name AS material_type_name
        FROM inventory.materials m
        LEFT JOIN inventory.material_types mt ON mt.id = m.material_type_id
        WHERE m.id = $1
    `;
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
}

/**
 * Find a material by name.
 * @param {string} name
 * @returns {object|null}
 */
export async function findMaterialByName(name) {
    const query = `SELECT * FROM inventory.materials WHERE name ILIKE $1`;
    const { rows } = await db.query(query, [name]);
    return rows[0] || null;
}

/**
 * Update a material.
 * @param {string} id - UUID
 * @param {object} data - { name, material_type_id, unit, reorder_threshold }
 * @returns {object} updated material
 */
export async function updateMaterial(id, { name, material_type_id, unit, reorder_threshold }) {
    const query = `
        UPDATE inventory.materials
        SET name = $1, material_type_id = $2, unit = $3, reorder_threshold = $4
        WHERE id = $5
        RETURNING *
    `;
    const { rows } = await db.query(query, [name, material_type_id, unit, reorder_threshold, id]);
    return rows[0];
}

/**
 * Update a material's current stock.
 * @param {string} id - UUID
 * @param {number} currentStock
 * @returns {object} updated material
 */
export async function updateMaterialStock(id, currentStock) {
    const query = `
        UPDATE inventory.materials
        SET current_stock = $1
        WHERE id = $2
        RETURNING *
    `;
    const { rows } = await db.query(query, [currentStock, id]);
    return rows[0];
}

// ============================================================
// STOCK MOVEMENTS
// ============================================================

/**
 * Create a stock movement and update the material's stock.
 * Uses a transaction so the movement and the stock update are atomic.
 *
 * Pass a `client` to join an existing transaction (e.g. when called from
 * another module). When omitted, this function manages its own transaction.
 *
 * @param {object} data - { material_id, direction, qty, source, reference_id, performed_by }
 * @param {object} [client] - optional pg client from an outer transaction
 * @returns {object} { movement, material }
 */
export async function createStockMovement(data, client) {
    // No client passed: manage our own transaction
    if (!client) {
        const ownClient = await db.connect();
        try {
            await ownClient.query('BEGIN');
            const result = await createStockMovement(data, ownClient);
            await ownClient.query('COMMIT');
            return result;
        } catch (err) {
            await ownClient.query('ROLLBACK');
            throw err;
        } finally {
            ownClient.release();
        }
    }

    const { material_id, direction, qty, source, reference_id, performed_by } = data;

    // Insert movement
    const movementQuery = `
        INSERT INTO inventory.stock_movements (material_id, direction, qty, source, reference_id, performed_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
    `;
    const movement = await client.query(movementQuery, [material_id, direction, qty, source, reference_id, performed_by]);

    // Update material stock
    const delta = direction === 'in' ? qty : -qty;
    const stockQuery = `
        UPDATE inventory.materials
        SET current_stock = current_stock + $1
        WHERE id = $2
        RETURNING *
    `;
    const updated = await client.query(stockQuery, [delta, material_id]);

    return { movement: movement.rows[0], material: updated.rows[0] };
}

/**
 * Find stock movements by material.
 * @param {string} materialId - UUID
 * @returns {array} list of movements
 */
export async function findStockMovementsByMaterial(materialId) {
    const query = `
        SELECT * FROM inventory.stock_movements
        WHERE material_id = $1
        ORDER BY created_at DESC
    `;
    const { rows } = await db.query(query, [materialId]);
    return rows;
}

/**
 * Find all stock movements.
 * @returns {array} list of movements
 */
export async function findAllStockMovements() {
    const query = `
        SELECT sm.*, m.name AS material_name
        FROM inventory.stock_movements sm
        JOIN inventory.materials m ON m.id = sm.material_id
        ORDER BY sm.created_at DESC
    `;
    const { rows } = await db.query(query);
    return rows;
}

// ============================================================
// STOCK RECEIPTS (OCR)
// ============================================================

/**
 * Create a new stock receipt OCR record.
 * @param {object} data - { raw_image_path, extracted_items }
 * @returns {object} created receipt
 */
export async function createStockReceiptOcr({ raw_image_path, extracted_items }) {
    const query = `
        INSERT INTO inventory.stock_receipts_ocr (raw_image_path, extracted_items)
        VALUES ($1, $2)
        RETURNING *
    `;
    const { rows } = await db.query(query, [raw_image_path, extracted_items]);
    return rows[0];
}

/**
 * Find all stock receipts OCR.
 * @returns {array} list of receipts
 */
export async function findAllStockReceiptsOcr() {
    const query = `SELECT * FROM inventory.stock_receipts_ocr ORDER BY created_at DESC`;
    const { rows } = await db.query(query);
    return rows;
}

/**
 * Find a stock receipt OCR by ID.
 * @param {string} id - UUID
 * @returns {object|null}
 */
export async function findStockReceiptOcrById(id) {
    const query = `SELECT * FROM inventory.stock_receipts_ocr WHERE id = $1`;
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
}

/**
 * Update a stock receipt OCR status.
 * @param {string} id - UUID
 * @param {string} status - 'pending_review' | 'confirmed' | 'mismatch'
 * @param {string} verifiedBy - UUID
 * @returns {object} updated receipt
 */
export async function updateStockReceiptOcrStatus(id, status, verifiedBy) {
    const query = `
        UPDATE inventory.stock_receipts_ocr
        SET status = $1, verified_by = $2
        WHERE id = $3
        RETURNING *
    `;
    const { rows } = await db.query(query, [status, verifiedBy, id]);
    return rows[0];
}
