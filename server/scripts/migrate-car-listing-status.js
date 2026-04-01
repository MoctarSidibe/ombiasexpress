/**
 * Migration: add 'pending' and 'rejected' values to enum_car_listings_status
 * Run once: node server/scripts/migrate-car-listing-status.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { sequelize } = require('../config/database');

(async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB');

        // PostgreSQL: add new enum values (safe to run multiple times — errors are caught)
        const addValues = [
            `ALTER TYPE "enum_car_listings_status" ADD VALUE IF NOT EXISTS 'pending'`,
            `ALTER TYPE "enum_car_listings_status" ADD VALUE IF NOT EXISTS 'rejected'`,
        ];

        for (const sql of addValues) {
            try {
                await sequelize.query(sql);
                console.log('OK:', sql);
            } catch (e) {
                // Older Postgres without IF NOT EXISTS — try without it
                const fallback = sql.replace(' IF NOT EXISTS', '');
                try {
                    await sequelize.query(fallback);
                    console.log('OK (fallback):', fallback);
                } catch (e2) {
                    // Value already exists — that's fine
                    console.log('Skipped (already exists):', fallback);
                }
            }
        }

        // Update existing listings that have no status set
        const [updated] = await sequelize.query(
            `UPDATE car_listings SET status = 'active' WHERE status IS NULL`
        );
        console.log('Nulls patched:', updated);

        console.log('Migration complete ✓');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        await sequelize.close();
    }
})();
