/**
 * Migration: add 'store_owner' to enum_merchant_verifications_merchant_type
 *
 * Run once:  node server/scripts/migrate-store-owner.js
 *
 * PostgreSQL enums cannot be altered inside a transaction, so we use
 * a raw query outside any transaction block.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sequelize } = require('../config/database');

(async () => {
    try {
        // Add the new enum value — safe to run even if it already exists
        // (Postgres will raise "already exists" but we catch it gracefully)
        await sequelize.query(`
            ALTER TYPE "enum_merchant_verifications_merchant_type"
            ADD VALUE IF NOT EXISTS 'store_owner';
        `);
        console.log('✅  store_owner added to merchant_type enum');
    } catch (err) {
        // "IF NOT EXISTS" requires PG >= 9.3 — handle older fallback
        if (err.message?.includes('already exists')) {
            console.log('ℹ️  store_owner already exists in enum — skipping');
        } else {
            console.error('❌  Migration failed:', err.message);
            process.exit(1);
        }
    } finally {
        await sequelize.close();
    }
})();
