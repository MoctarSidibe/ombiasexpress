const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// ── CashbackTransaction — audit trail for every points movement ───────────────
const CashbackTransaction = sequelize.define('CashbackTransaction', {
    id: {
        type:         DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey:   true,
    },
    user_id: {
        type:      DataTypes.UUID,
        allowNull: false,
    },
    points: {
        type:      DataTypes.INTEGER,
        allowNull: false,
    },
    type: {
        type:      DataTypes.ENUM('earn', 'redeem', 'expire', 'adjustment', 'bonus'),
        allowNull: false,
    },
    source: {
        type:      DataTypes.ENUM('ride', 'rental', 'partner', 'ecommerce', 'transfer', 'admin', 'redemption'),
        allowNull: false,
    },
    reference_id: {
        type:      DataTypes.STRING(80),
        allowNull: true,
    },
    description: {
        type:      DataTypes.STRING(255),
        allowNull: true,
    },
    balance_after: {
        type:      DataTypes.INTEGER,
        allowNull: false,
    },
    expires_at: {
        type:      DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName:  'cashback_transactions',
    timestamps: true,
    indexes: [
        { fields: ['user_id'] },
        { fields: ['type'] },
        { fields: ['source'] },
        { fields: ['created_at'] },
    ],
});

module.exports = CashbackTransaction;
