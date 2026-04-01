const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// ── CommissionRule — flexible per-service commission rates ────────────────────
// Admin creates rules like: "Rides standard 20%", "Partners premium 15%", etc.
// Multiple rules per service_type possible; sort_order + amount range = priority
const CommissionRule = sequelize.define('CommissionRule', {
    id: {
        type:         DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey:   true,
    },
    service_type: {
        type:      DataTypes.ENUM('ride', 'rental', 'partner', 'ecommerce', 'transfer'),
        allowNull: false,
    },
    name: {
        type:         DataTypes.STRING(120),
        allowNull:    false,
        defaultValue: 'Standard',
    },
    rate: {
        type:         DataTypes.DECIMAL(5, 2),
        allowNull:    false,
        defaultValue: 20.00,
    },
    // Optional amount range — if set, only applies when fare is within range
    min_amount: {
        type:      DataTypes.DECIMAL(12, 2),
        allowNull: true,
    },
    max_amount: {
        type:      DataTypes.DECIMAL(12, 2),
        allowNull: true,
    },
    is_default: {
        type:         DataTypes.BOOLEAN,
        defaultValue: false,
    },
    enabled: {
        type:         DataTypes.BOOLEAN,
        defaultValue: true,
    },
    sort_order: {
        type:         DataTypes.INTEGER,
        defaultValue: 0,
    },
    description: {
        type:      DataTypes.STRING(255),
        allowNull: true,
    },
}, {
    tableName:  'commission_rules',
    timestamps: true,
    indexes: [
        { fields: ['service_type', 'enabled'] },
        { fields: ['sort_order'] },
    ],
});

module.exports = CommissionRule;
