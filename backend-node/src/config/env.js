import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve('../../.env');
dotenv.config(envPath);

export const config = {
    // Database Configuration
    dbUrl: process.env.DATABASE_URL,

    // JWT Configuration
    jwt: process.env.JWT_SECRET,
    jwt_expires_in: process.env.JWT_EXPIRES_IN || '15m',
    jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

    // Server Configuration
    server: process.env.PORT || 3000,

    // Other Configurations Can Be Added Here
    saltRounds: parseInt(process.env.SALT_ROUNDS, 10) || 12,
};