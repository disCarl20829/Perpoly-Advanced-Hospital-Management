import pg from 'pg';
import { config } from './config/env.js'

const dbUrl = config.dbUrl;

const pool = new pg.Pool({
    connectionString: dbUrl,
    max: 20,
    idleTimeoutMillis: 30000,
})

module.exports = pool;