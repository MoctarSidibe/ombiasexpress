/**
 * Migration: make users.email nullable (phone-first auth)
 * Run from project root: node server/scripts/migrate-email-nullable.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME || 'rideshare_db',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD,
    {
        host:    process.env.DB_HOST || 'localhost',
        port:    process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: false,
    }
);

(async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB:', process.env.DB_NAME);

        await sequelize.query(`ALTER TABLE "Users" ALTER COLUMN email DROP NOT NULL;`);
        console.log('✓ email column is now nullable — registration without email works.');

        await sequelize.close();
        process.exit(0);
    } catch (e) {
        if (e.message?.includes('already nullable') || e.message?.includes('does not exist')) {
            console.log('Already nullable, nothing to do.');
            process.exit(0);
        }
        console.error('Migration failed:', e.message);
        process.exit(1);
    }
})();
