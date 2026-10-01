import db from '../../config/db.js';

/**
 * Find a user by email, including their roles.
 * @param {string} email
 * @returns {object|null} user object with roles array, or null
 */
export async function findUserByEmail(email) {
    const query = `
        SELECT u.*, COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles
        FROM authentication.users u
        LEFT JOIN authentication.user_roles ur ON ur.user_id = u.id
        LEFT JOIN authentication.roles r ON r.id = ur.role_id
        WHERE u.email = $1
        GROUP BY u.id
    `;
    const { rows } = await db.query(query, [email]);
    return rows[0] || null;
}

/**
 * Find a user by ID, including their roles.
 * @param {string} id - UUID
 * @returns {object|null} user object with roles array, or null
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
 * Create a new user.
 * @param {object} user - { last_name, first_name, middle_name, extra_name, email, password_hash }
 * @returns {object} the created user (without roles)
 */
export async function createUser({ last_name, first_name, middle_name, extra_name, email, password_hash }) {
    const query = `
        INSERT INTO authentication.users (last_name, first_name, middle_name, extra_name, email, password_hash)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
    `;
    const { rows } = await db.query(query, [last_name, first_name, middle_name, extra_name, email, password_hash]);
    return rows[0];
}

/**
 * Assign a role to a user.
 * @param {string} userId - UUID
 * @param {string} roleName - e.g. 'cashier', 'doctor'
 */
export async function assignRole(userId, roleName) {
    const query = `
        INSERT INTO authentication.user_roles (user_id, role_id)
        VALUES ($1, (SELECT id FROM authentication.roles WHERE name = $2))
    `;
    await db.query(query, [userId, roleName]);
}
