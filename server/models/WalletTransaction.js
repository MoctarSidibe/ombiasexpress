const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WalletTransaction = sequelize.define('WalletTransaction', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    wallet_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'wallets', key: 'id' }
    },
    type: {
        type: DataTypes.ENUM('credit', 'debit'),
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
    },
    balance_after: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        comment: 'Wallet balance after this transaction'
    },
    source: {
        type: DataTypes.ENUM(
            'airtel_money',
            'moov_money',
            'bank_card',
            'cash',
            'ride_earning',
            'rental_earning',
            'ride_payment',
            'rental_payment',
            'ecommerce_payment',
            'withdrawal',
            'refund',
            'promo',
            'transfer_in',
            'transfer_out'
        ),
        allowNull: false
    },
    reference: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Provider transaction ID or internal reference'
    },
    status: {
        type: DataTypes.ENUM('pending', 'completed', 'failed'),
        defaultValue: 'completed'
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Raw provider response — will be populated when real APIs integrate'
    }
}, {
    tableName: 'wallet_transactions',
    indexes: [
        { fields: ['wallet_id'] },
        { fields: ['status'] },
        { fields: ['source'] },
        { fields: ['created_at'] }
    ]
});

module.exports = WalletTransaction;
