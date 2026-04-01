/**
 * Migrates existing users' phone numbers to full international format.
 * Old format: 077724499  → New format: 24177724499 (Gabon +241)
 * Run: node server/scripts/migrate-phone-format.js
 *
 * Adjust DEFAULT_DIAL_CODE if needed for other countries.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { Sequelize, DataTypes } = require('sequelize');

const DEFAULT_DIAL_CODE = '241'; // Gabon

const sequelize = new Sequelize(
    process.env.DB_NAME || 'rideshare_db',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD,
    { host: process.env.DB_HOST || 'localhost', port: process.env.DB_PORT || 5432, dialect: 'postgres', logging: false }
);

(async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected.');

        const [users] = await sequelize.query(`SELECT id, phone FROM "Users"`);
        console.log(`Found ${users.length} users.`);

        let updated = 0;
        for (const u of users) {
            const p = u.phone || '';
            // Skip if already looks like international format (starts with country code, no +)
            if (p.startsWith(DEFAULT_DIAL_CODE) && p.length >= 10) continue;
            // Skip dummy admin phones
            if (p === '0000000000') continue;

            // Strip leading zero(s), prepend dial code
            const local = p.replace(/^0+/, '');
            const newPhone = DEFAULT_DIAL_CODE + local;

            try {
                await sequelize.query(
                    `UPDATE "Users" SET phone = :newPhone WHERE id = :id`,
                    { replacements: { newPhone, id: u.id } }
                );
                console.log(`  ${u.id}: ${p} → ${newPhone}`);
                updated++;
            } catch (e) {
                console.warn(`  Skip ${u.id} (${p}): ${e.message}`);
            }
        }

        console.log(`\nDone. Updated ${updated} / ${users.length} users.`);
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
})();
