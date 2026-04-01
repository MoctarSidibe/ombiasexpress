const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payment = sequelize.define('Payment', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    ride_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'rides',
            key: 'id'
        }
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    commission: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Platform commission'
    },
    driver_earnings: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    payment_method: {
        type: DataTypes.ENUM('card', 'cash', 'wallet'),
        defaultValue: 'card'
    },
    status: {
        type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'refunded'),
        defaultValue: 'pending'
    },
    transaction_id: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Stripe/PayPal transaction ID'
    },
    payment_intent_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true
    },
    completed_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'payments',
    indexes: [
        { fields: ['ride_id'] },
        { fields: ['status'] },
        { fields: ['transaction_id'] }
    ]
});

module.exports = Payment;
