/**
 * Seed default platform settings into the Settings table.
 * Safe to run multiple times — uses upsert (findOrCreate).
 * Run: node server/scripts/seed-settings.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sequelize } = require('../config/database');
const { Setting } = require('../models');

const DEFAULTS = [
    // ── Wallet / Physical Card ──────────────────────────────────────────────
    {
        key:         'physical_card_price',
        value:       '2500',
        label:       'Prix carte physique (XAF)',
        description: 'Montant facturé à l\'utilisateur lors de l\'achat d\'une carte NFC physique Ombia',
    },
    {
        key:         'physical_card_delivery',
        value:       '24–48h',
        label:       'Délai de livraison carte physique',
        description: 'Délai affiché à l\'utilisateur (ex: "24–48h", "2–3 jours")',
    },

    // ── Commission rates ────────────────────────────────────────────────────
    {
        key:         'commission_rate_ride',
        value:       '20',
        label:       'Commission courses (%)',
        description: 'Pourcentage prélevé par Ombia sur chaque course',
    },
    {
        key:         'commission_rate_rental',
        value:       '10',
        label:       'Commission location (%)',
        description: 'Pourcentage prélevé par Ombia sur chaque location de véhicule',
    },

    // ── Livraison Express — Delivery pricing ────────────────────────────────
    {
        key:         'delivery_base_fare',
        value:       '500',
        label:       'Livraison — Tarif de base (XAF)',
        description: 'Montant fixe prélevé sur chaque livraison, quelle que soit la distance',
    },
    {
        key:         'delivery_price_per_km',
        value:       '300',
        label:       'Livraison — Prix par kilomètre (XAF)',
        description: 'Tarif kilométrique appliqué à la distance réelle',
    },
    {
        key:         'delivery_size_multiplier_petit',
        value:       '1.0',
        label:       'Livraison — Multiplicateur Petit colis',
        description: 'Coefficient pour colis < 5 kg (1.0 = pas de majoration)',
    },
    {
        key:         'delivery_size_multiplier_moyen',
        value:       '1.3',
        label:       'Livraison — Multiplicateur Moyen colis',
        description: 'Coefficient pour colis 5–15 kg (1.3 = +30%)',
    },
    {
        key:         'delivery_size_multiplier_lourd',
        value:       '1.8',
        label:       'Livraison — Multiplicateur Lourd colis',
        description: 'Coefficient pour colis > 15 kg (1.8 = +80%)',
    },
    {
        key:         'delivery_courier_share',
        value:       '80',
        label:       'Livraison — Part coursier (%)',
        description: 'Pourcentage du tarif reversé au coursier après livraison',
    },

    // ── Wallet discount ──────────────────────────────────────────────────────
    {
        key:         'wallet_discount_rate',
        value:       '5',
        label:       'Remise paiement Ombia Wallet (%)',
        description: 'Réduction appliquée quand l\'utilisateur paie avec son solde Ombia',
    },
];

async function run() {
    try {
        await sequelize.authenticate();
        console.log('DB connected\n');

        let created = 0;
        let skipped = 0;

        for (const s of DEFAULTS) {
            const [, wasCreated] = await Setting.findOrCreate({
                where:    { key: s.key },
                defaults: s,
            });
            if (wasCreated) {
                console.log(`  ✓ Created  — ${s.key} = "${s.value}"`);
                created++;
            } else {
                console.log(`  · Exists   — ${s.key} (skipped)`);
                skipped++;
            }
        }

        console.log(`\nDone — ${created} created, ${skipped} already existed.`);
        process.exit(0);
    } catch (err) {
        console.error('Seed failed:', err.message);
        process.exit(1);
    }
}

run();
