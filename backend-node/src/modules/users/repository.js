import db from '../../config/db.js';

/**
 * Find all users with their roles.
 * @returns {array} list of users
 */
export async function findAllUsers() {
    const query = `
        SELECT u.*, COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles
        FROM authentication.users u
        LEFT JOIN authentication.user_roles ur ON ur.user_id = u.id
        LEFT JOIN authentication.roles r ON r.id = ur.role_id
        GROUP BY u.id
        ORDER BY u.created_at DESC
    `;
    const { rows } = await db.query(query);
    return rows;
}

/**
 * Find a user by ID with their roles.
 * @param {string} id - UUID
 * @returns {object|null}
 */
export async function findUserById(id) {
    const query = `
        SELECT u.*, COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles
        FROM authentication.users u
        LEFT JOIN authentication.user_roles ur ON ur.user_id = u.id
        LEFT JOIN authentication.roles r ON r.id = ur.role_id
        WHERE u.id = $1
        GROUP BY u.id
    `;
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
}

/**
 * Update a user's profile.
 * @param {string} id - UUID
 * @param {object} data - { last_name, first_name, middle_name, extra_name, email, preferred_system }
 * @returns {object} updated user
 */
export async function updateUser(id, { last_name, first_name, middle_name, extra_name, email, preferred_system }) {
    const query = `
        UPDATE authentication.users
        SET last_name = $1, first_name = $2, middle_name = $3, extra_name = $4,
            email = $5, preferred_system = $6
        WHERE id = $7
        RETURNING id, last_name, first_name, middle_name, extra_name, email, preferred_system, is_active, created_at
    `;
    const { rows } = await db.query(query, [last_name, first_name, middle_name, extra_name, email, preferred_system, id]);
    return rows[0];
}

/**
 * Update a user's active status.
 * @param {string} id - UUID
 * @param {boolean} isActive
 * @returns {object} updated user
 */
export async function updateUserStatus(id, isActive) {
    const query = `
        UPDATE authentication.users
        SET is_active = $1
        WHERE id = $2
        RETURNING id, last_name, first_name, email, is_active
    `;
    const { rows } = await db.query(query, [isActive, id]);
    return rows[0];
}

/**
 * Replace a user's roles.
 * @param {string} userId - UUID
 * @param {array} roles - array of role names
 */
export async function replaceUserRoles(userId, roles) {
    // Delete existing roles
    await db.query('DELETE FROM authentication.user_roles WHERE user_id = $1', [userId]);

    // Insert new roles
    for (const role of roles) {
        await db.query(`
            INSERT INTO authentication.user_roles (user_id, role_id)
            VALUES ($1, (SELECT id FROM authentication.roles WHERE name = $2))
        `, [userId, role]);
    }
}

/**
 * Get all available roles.
 * @returns {array} list of roles
 */
export async function findAllRoles() {
    const query = `SELECT id, name FROM authentication.roles ORDER BY id`;
    const { rows } = await db.query(query);
    return rows;
}

/**
 * Get all laboratories.
 * @returns {array} list of laboratories
 */
export async function findAllLaboratories() {
    const query = `SELECT id, name FROM laboratory.laboratories ORDER BY name`;
    const { rows } = await db.query(query);
    return rows;
}

/**
 * Get a doctor's laboratory assignments.
 * @param {string} doctorId - UUID
 * @returns {array} list of laboratory IDs
 */
export async function findDoctorLaboratories(doctorId) {
    const query = `
        SELECT laboratory_id
        FROM laboratory.doctor_laboratory_assignments
        WHERE doctor_id = $1
    `;
    const { rows } = await db.query(query, [doctorId]);
    return rows.map(r => r.laboratory_id);
}

/**
 * Replace a doctor's laboratory assignments.
 * @param {string} doctorId - UUID
 * @param {array} laboratoryIds - array of laboratory UUIDs
 */
export async function replaceDoctorLaboratories(doctorId, laboratoryIds) {
    // Delete existing assignments
    await db.query('DELETE FROM laboratory.doctor_laboratory_assignments WHERE doctor_id = $1', [doctorId]);

    // Insert new assignments
    for (const labId of laboratoryIds) {
        await db.query(`
            INSERT INTO laboratory.doctor_laboratory_assignments (doctor_id, laboratory_id)
            VALUES ($1, $2)
        `, [doctorId, labId]);
    }
}
