const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// ── CashbackRule — admin-configured points earning rates per service ───────────
// earn_rate = points earned per 100 XAF spent (e.g. 5 = 5pts per 100 XAF)
const CashbackRule = sequelize.define('CashbackRule', {
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
        defaultValue: 'Standard cashback',
    },
    earn_rate: {
        type:         DataTypes.DECIMAL(6, 2),
        allowNull:    false,
        defaultValue: 5.00,
    },
    min_amount: {
        type:         DataTypes.DECIMAL(12, 2),
        allowNull:    true,
        defaultValue: 0,
    },
    // 0 = never expires
    expiry_days: {
        type:         DataTypes.INTEGER,
        defaultValue: 365,
    },
    enabled: {
        type:         DataTypes.BOOLEAN,
        defaultValue: true,
    },
    description: {
        type:      DataTypes.STRING(255),
        allowNull: true,
    },
}, {
    tableName:  'cashback_rules',
    timestamps: true,
    indexes: [
        { fields: ['service_type', 'enabled'] },
    ],
});

module.exports = CashbackRule;
