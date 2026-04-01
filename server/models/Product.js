const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
    id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    seller_id:   { type: DataTypes.UUID, allowNull: false },
    name:        { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    category: {
        type: DataTypes.ENUM(
            'restaurant', 'grocery', 'fashion', 'beauty',
            'electronics', 'home', 'sports', 'services', 'other'
        ),
        defaultValue: 'other',
    },
    price:       { type: DataTypes.DECIMAL(12, 0), allowNull: false },
    photos:      { type: DataTypes.JSON, defaultValue: [] },
    stock:       { type: DataTypes.INTEGER, defaultValue: -1 }, // -1 = unlimited
    unit:        { type: DataTypes.STRING, defaultValue: 'unité' },
    status: {
        type: DataTypes.ENUM('active', 'paused', 'out_of_stock'),
        defaultValue: 'active',
    },
    view_count: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'products', timestamps: true, underscored: true });

module.exports = Product;
