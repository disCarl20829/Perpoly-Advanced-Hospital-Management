import pg from 'pg';
import { config } from './env.js';

const dbUrl = config.dbUrl;

const pool = new pg.Pool({
    connectionString: dbUrl,
    max: 20,
    idleTimeoutMillis: 30000,
})

export default pool;