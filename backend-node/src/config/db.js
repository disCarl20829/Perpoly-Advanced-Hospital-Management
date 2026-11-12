import pg from 'pg';
import { config } from './env.js';

const dbUrl = config.dbUrl;

const pool = new pg.Pool({
    connectionString: dbUrl,
    max: 20,
    idleTimeoutMillis: 30000,
})

pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err);
});

export default pool;