const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OrderItem = sequelize.define('OrderItem', {
    id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    order_id:     { type: DataTypes.UUID, allowNull: false },
    product_id:   { type: DataTypes.UUID, allowNull: true }, // nullable in case product deleted
    product_name: { type: DataTypes.STRING }, // snapshot of name at order time
    unit_price:   { type: DataTypes.DECIMAL(12, 0), allowNull: false },
    quantity:     { type: DataTypes.INTEGER, defaultValue: 1 },
    subtotal:     { type: DataTypes.DECIMAL(12, 0), allowNull: false },
}, { tableName: 'order_items', timestamps: true, underscored: true });

module.exports = OrderItem;
