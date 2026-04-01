const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Wallet = sequelize.define('Wallet', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' }
    },
    balance: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
        allowNull: false
    },
    currency: {
        type: DataTypes.STRING(3),
        defaultValue: 'XAF'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    card_number: {
        type: DataTypes.STRING(16),
        allowNull: true,
    },
    nfc_card_uid: {
        type: DataTypes.STRING(64),
        allowNull: true,
    },
    physical_card_requested: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    physical_card_status: {
        type: DataTypes.ENUM('none', 'pending', 'printing', 'shipped', 'delivered'),
        defaultValue: 'none',
    }
}, {
    tableName: 'wallets',
    indexes: [
        { fields: ['user_id'],      unique: true },
        { fields: ['card_number'],  unique: true, sparse: true },
        { fields: ['nfc_card_uid'], unique: true, sparse: true },
    ]
});

module.exports = Wallet;
