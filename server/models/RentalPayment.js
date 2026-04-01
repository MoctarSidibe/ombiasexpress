const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RentalPayment = sequelize.define('RentalPayment', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    booking_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    commission: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    owner_earnings: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    payment_method: {
        type: DataTypes.ENUM('card', 'cash', 'wallet'),
        defaultValue: 'cash'
    },
    status: {
        type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'refunded'),
        defaultValue: 'pending'
    },
    transaction_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    completed_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'rental_payments',
    indexes: [
        { fields: ['booking_id'] },
        { fields: ['status'] }
    ]
});

module.exports = RentalPayment;
