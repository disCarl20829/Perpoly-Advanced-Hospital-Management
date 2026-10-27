import db from '../../config/db.js';

// ============================================================
// CASHIER SETTINGS
// ============================================================

/**
 * Read the single cashier settings row.
 * @returns {object|null}
 */
export async function findCashierSettings() {
    const { rows } = await db.query(`SELECT * FROM cashier.settings WHERE id = TRUE`);
    return rows[0] || null;
}

/**
 * Update the senior discount percentage.
 * @param {number} rate - 0..100
 * @param {string} userId - UUID of the user making the change
 * @returns {object|null}
 */
export async function updateSeniorDiscount(rate, userId) {
    const query = `
        UPDATE cashier.settings
        SET senior_discount_rate = $1,
            updated_at = now(),
            updated_by = $2
        WHERE id = TRUE
        RETURNING *
    `;
    const { rows } = await db.query(query, [rate, userId]);
    return rows[0] || null;
}

// ============================================================
// DEPARTMENTS (laboratory.laboratories)
// ============================================================

/**
 * Find all departments with their test counts.
 * @returns {array} list of departments
 */
export async function findAllDepartments() {
    const query = `
        SELECT
            l.id,
            l.name,
            l.is_active,
            count(tt.id)::int AS test_count,
            count(tt.id) FILTER (WHERE tt.is_active)::int AS active_test_count
        FROM laboratory.laboratories l
        LEFT JOIN cashier.transaction_types tt ON tt.category = l.name
        GROUP BY l.id
        ORDER BY l.is_active DESC, l.name
    `;
    const { rows } = await db.query(query);
    return rows;
}

/**
 * Find a department by ID.
 * @param {string} id - UUID
 * @returns {object|null}
 */
export async function findDepartmentById(id) {
    const query = `SELECT * FROM laboratory.laboratories WHERE id = $1`;
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
}

/**
 * Find a department by name (case-insensitive).
 * @param {string} name
 * @returns {object|null}
 */
export async function findDepartmentByName(name) {
    const query = `SELECT * FROM laboratory.laboratories WHERE lower(name) = lower($1)`;
    const { rows } = await db.query(query, [name]);
    return rows[0] || null;
}

/**
 * Create a department.
 * @param {object} data - { name, is_active }
 * @returns {object} created department
 */
export async function createDepartment({ name, is_active = true }) {
    const query = `
        INSERT INTO laboratory.laboratories (name, is_active)
        VALUES ($1, $2)
        RETURNING *
    `;
    const { rows } = await db.query(query, [name, is_active]);
    return rows[0];
}

/**
 * Update a department. Renaming cascades to transaction type categories so
 * laboratory routing keeps working. Deactivating also hides its tests.
 * @param {string} id - UUID
 * @param {object} data - { name, is_active }
 * @returns {object|null}
 */
export async function updateDepartment(id, data = {}) {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const current = await client.query(
            `SELECT * FROM laboratory.laboratories WHERE id = $1 FOR UPDATE`,
            [id]
        );

        if (!current.rows[0]) {
            await client.query('ROLLBACK');
            return null;
        }

        const before = current.rows[0];
        const name = data.name !== undefined ? data.name : before.name;
        const isActive = data.is_active !== undefined ? data.is_active : before.is_active;

        const { rows } = await client.query(
            `
                UPDATE laboratory.laboratories
                SET name = $1, is_active = $2
                WHERE id = $3
                RETURNING *
            `,
            [name, isActive, id]
        );

        if (name !== before.name) {
            await client.query(
                `UPDATE cashier.transaction_types SET category = $1 WHERE category = $2`,
                [name, before.name]
            );
        }

        if (isActive === false && before.is_active === true) {
            await client.query(
                `UPDATE cashier.transaction_types SET is_active = FALSE WHERE category = $1`,
                [name]
            );
        }

        await client.query('COMMIT');
        return rows[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Count anything that references a department.
 * @param {string} id - UUID
 * @param {string} name - current department name
 * @returns {object} reference counts
 */
export async function countDepartmentReferences(id, name) {
    const query = `
        SELECT
            (SELECT count(*) FROM cashier.transaction_types WHERE category = $2)::int AS tests,
            (SELECT count(*) FROM laboratory.lab_results WHERE laboratory_id = $1)::int AS results,
            (SELECT count(*) FROM laboratory.doctor_laboratory_assignments WHERE laboratory_id = $1)::int AS assignments,
            (SELECT count(*) FROM laboratory.lab_material_defaults WHERE laboratory_id = $1)::int AS defaults
    `;
    const { rows } = await db.query(query, [id, name]);
    return rows[0];
}

/**
 * Deactivate a department and all of its tests.
 * @param {string} id - UUID
 * @returns {object|null}
 */
export async function deactivateDepartment(id) {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const { rows } = await client.query(
            `
                UPDATE laboratory.laboratories
                SET is_active = FALSE
                WHERE id = $1
                RETURNING *
            `,
            [id]
        );

        if (rows[0]) {
            await client.query(
                `UPDATE cashier.transaction_types SET is_active = FALSE WHERE category = $1`,
                [rows[0].name]
            );
        }

        await client.query('COMMIT');
        return rows[0] || null;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Permanently delete a department.
 * @param {string} id - UUID
 * @returns {object|null} deleted department
 */
export async function deleteDepartment(id) {
    const query = `DELETE FROM laboratory.laboratories WHERE id = $1 RETURNING *`;
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
}

// ============================================================
// TESTS (cashier.transaction_types)
// ============================================================

/**
 * Find all tests.
 * @param {object} filters - { active, category, search }
 * @returns {array} list of tests
 */
export async function findAllTests(filters = {}) {
    const clauses = [];
    const params = [];

    if (filters.active !== undefined) {
        params.push(filters.active);
        clauses.push(`tt.is_active = $${params.length}`);
    }
    if (filters.category) {
        params.push(filters.category);
        clauses.push(`tt.category = $${params.length}`);
    }
    if (filters.search) {
        params.push(`%${filters.search}%`);
        clauses.push(`tt.name ILIKE $${params.length}`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const query = `
        SELECT
            tt.*,
            l.is_active AS department_is_active
        FROM cashier.transaction_types tt
        LEFT JOIN laboratory.laboratories l ON l.name = tt.category
        ${where}
        ORDER BY tt.is_active DESC, tt.category, tt.name
    `;
    const { rows } = await db.query(query, params);
    return rows;
}

/**
 * Find a test by ID.
 * @param {string} id - UUID
 * @returns {object|null}
 */
export async function findTestById(id) {
    const query = `SELECT * FROM cashier.transaction_types WHERE id = $1`;
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
}

/**
 * Find a test by name within a department (case-insensitive).
 * @param {string} name
 * @param {string} category
 * @param {string} [excludeId] - ignore this test (for updates)
 * @returns {object|null}
 */
export async function findTestByNameAndCategory(name, category, excludeId = null) {
    const params = [name, category];
    let query = `
        SELECT * FROM cashier.transaction_types
        WHERE lower(name) = lower($1) AND category = $2
    `;
    if (excludeId) {
        params.push(excludeId);
        query += ` AND id <> $3`;
    }
    const { rows } = await db.query(query, params);
    return rows[0] || null;
}

/**
 * Create a test.
 * @param {object} data - { name, category, default_price, notes, is_active }
 * @returns {object} created test
 */
export async function createTest({ name, category, default_price = 0, notes = null, is_active = true }) {
    const query = `
        INSERT INTO cashier.transaction_types (name, category, default_price, notes, is_active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    `;
    const { rows } = await db.query(query, [name, category, default_price, notes, is_active]);
    return rows[0];
}

/**
 * Update a test. Only provided fields are changed.
 * @param {string} id - UUID
 * @param {object} data - { name, category, default_price, notes, is_active }
 * @returns {object|null}
 */
export async function updateTest(id, data = {}) {
    const fields = [];
    const params = [];

    for (const key of ['name', 'category', 'default_price', 'notes', 'is_active']) {
        if (data[key] !== undefined) {
            params.push(data[key]);
            fields.push(`${key} = $${params.length}`);
        }
    }

    if (fields.length === 0) {
        return await findTestById(id);
    }

    params.push(id);
    const query = `
        UPDATE cashier.transaction_types
        SET ${fields.join(', ')}
        WHERE id = $${params.length}
        RETURNING *
    `;
    const { rows } = await db.query(query, params);
    return rows[0] || null;
}

/**
 * Count how many transaction items use a test.
 * @param {string} id - UUID
 * @returns {number}
 */
export async function countTestUsage(id) {
    const query = `SELECT count(*)::int AS used FROM cashier.transaction_items WHERE transaction_type_id = $1`;
    const { rows } = await db.query(query, [id]);
    return rows[0].used;
}

/**
 * Permanently delete a test.
 * @param {string} id - UUID
 * @returns {object|null} deleted test
 */
export async function deleteTest(id) {
    const query = `DELETE FROM cashier.transaction_types WHERE id = $1 RETURNING *`;
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
}
