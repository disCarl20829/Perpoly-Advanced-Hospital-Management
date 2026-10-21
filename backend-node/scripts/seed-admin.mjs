// Seed the first superadmin account.
// Usage:  node scripts/seed-admin.mjs
// Reads ADMIN_EMAIL / ADMIN_PASSWORD (falls back to defaults).
//
// The superadmin is the only role allowed to create other accounts, so it
// has to be seeded directly in the database (chicken-and-egg problem).

import bcrypt from 'bcrypt';
import db from '../src/config/db.js';
import { config } from '../src/config/env.js';

const email = process.env.ADMIN_EMAIL || 'superadmin@perpoly.local';
const password = process.env.ADMIN_PASSWORD || 'SuperAdmin123!';

const run = async () => {
    const existing = await db.query('SELECT id FROM authentication.users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
        console.log(`Superadmin already exists (${email}). Nothing to do.`);
        process.exit(0);
    }

    const password_hash = await bcrypt.hash(password, config.saltRounds);

    const { rows } = await db.query(
        `INSERT INTO authentication.users (last_name, first_name, middle_name, extra_name, email, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        ['Admin', 'Super', null, null, email, password_hash]
    );

    await db.query(
        `INSERT INTO authentication.user_roles (user_id, role_id)
         VALUES ($1, (SELECT id FROM authentication.roles WHERE name = 'superadmin'))`,
        [rows[0].id]
    );

    console.log(`Superadmin created: ${email}`);
    console.log(`Password: ${password}`);
    process.exit(0);
};

run().catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
});
