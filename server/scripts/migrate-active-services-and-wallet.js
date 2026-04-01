/**
 * Migration: active_services + wallet creation for existing users
 * Run once: node server/scripts/migrate-active-services-and-wallet.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sequelize, User, Wallet, syncDatabase } = require('../models');

const roleToServices = {
    rider:        ['rider', 'renter'],
    renter:       ['rider', 'renter'],
    driver:       ['rider', 'renter', 'driver'],
    rental_owner: ['rider', 'renter', 'rental_owner'],
    fleet_owner:  ['rider', 'renter', 'fleet_owner'],
    admin:        ['rider', 'renter', 'driver', 'rental_owner', 'fleet_owner']
};

async function run() {
    try {
        await syncDatabase();
        console.log('DB synced — new columns created if not exist\n');

        // 1. Back-fill active_services for existing users
        const users = await User.findAll();
        let updated = 0;
        for (const u of users) {
            if (!u.active_services || u.active_services.length === 0) {
                const services = roleToServices[u.role] || ['rider', 'renter'];
                await u.update({ active_services: services });
                updated++;
                console.log(`  ✓ ${u.email} → [${services.join(', ')}]`);
            }
        }
        console.log(`\nUpdated ${updated} users with active_services\n`);

        // 2. Create wallets for users who don't have one
        let wallets = 0;
        for (const u of users) {
            const existing = await Wallet.findOne({ where: { user_id: u.id } });
            if (!existing) {
                await Wallet.create({ user_id: u.id, balance: 0.00 });
                wallets++;
                console.log(`  ✓ Wallet created for ${u.email}`);
            }
        }
        console.log(`\nCreated ${wallets} wallets\n`);

        console.log('Migration complete ✓');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    }
}

run();
