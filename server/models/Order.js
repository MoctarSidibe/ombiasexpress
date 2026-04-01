const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Order = sequelize.define('Order', {
    id:       { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    buyer_id: { type: DataTypes.UUID, allowNull: false },
    seller_id:{ type: DataTypes.UUID, allowNull: false },
    status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'ready', 'delivered', 'cancelled'),
        defaultValue: 'pending',
    },
    total_amount:     { type: DataTypes.DECIMAL(12, 0), allowNull: false },
    delivery_type:    { type: DataTypes.ENUM('pickup', 'delivery'), defaultValue: 'pickup' },
    delivery_address: { type: DataTypes.TEXT },
    notes:            { type: DataTypes.TEXT },
    payment_method: {
        type: DataTypes.ENUM('cash', 'ombia_wallet', 'airtel_money', 'moov_money'),
        defaultValue: 'cash',
    },
    payment_status: {
        type: DataTypes.ENUM('pending', 'paid', 'refunded'),
        defaultValue: 'pending',
    },
}, { tableName: 'orders', timestamps: true, underscored: true });

module.exports = Order;
