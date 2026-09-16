import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve('../../.env');
dotenv.config(envPath);

export const config = {
    // Database Configuration
    dbUrl: process.env.DATABASE_URL,
    // JWT Configuration
    jwt: process.env.JWT_SECRET,
    // Server Configuration
    server: process.env.PORT || 3000,
    // Other Configurations Can Be Added Here
};