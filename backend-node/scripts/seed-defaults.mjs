// Seed default laboratories and transaction types.
// Idempotent: skips anything that already exists.
// Usage:  node scripts/seed-defaults.mjs

import db from '../src/config/db.js';

const LABORATORIES = [
    'urinalysis',
    'fecalysis',
    'CBC',
    'x-ray',
    'ultrasound',
    '2D echo',
    'holter',
    'ECG'
];

const TRANSACTION_TYPES = [
    ['Urinalysis', 'urinalysis'],
    ['Fecalysis', 'fecalysis'],
    ['CBC', 'CBC'],
    ['X-Ray', 'x-ray'],
    ['Ultrasound', 'ultrasound'],
    ['2D Echo', '2D echo'],
    ['Holter', 'holter'],
    ['ECG', 'ECG']
];

const run = async () => {
    for (const name of LABORATORIES) {
        const exists = await db.query('SELECT 1 FROM laboratory.laboratories WHERE name = $1', [name]);
        if (exists.rows.length === 0) {
            await db.query('INSERT INTO laboratory.laboratories (name) VALUES ($1)', [name]);
            console.log(`  + laboratory: ${name}`);
        }
    }

    for (const [name, category] of TRANSACTION_TYPES) {
        const exists = await db.query(
            'SELECT 1 FROM cashier.transaction_types WHERE name = $1 AND category = $2',
            [name, category]
        );
        if (exists.rows.length === 0) {
            await db.query(
                'INSERT INTO cashier.transaction_types (name, category) VALUES ($1, $2)',
                [name, category]
            );
            console.log(`  + transaction type: ${name} (${category})`);
        }
    }

    const labs = await db.query('SELECT count(*)::int AS n FROM laboratory.laboratories');
    const types = await db.query('SELECT count(*)::int AS n FROM cashier.transaction_types');
    console.log(`\nDone. ${labs.rows[0].n} laboratories, ${types.rows[0].n} transaction types.`);
    process.exit(0);
};

run().catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
});
