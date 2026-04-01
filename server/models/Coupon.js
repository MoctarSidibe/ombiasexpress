const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Coupon = sequelize.define('Coupon', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    code: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
        set(val) { this.setDataValue('code', val.toUpperCase().trim()); }
    },
    type: {
        type: DataTypes.ENUM('free_ride', 'percentage', 'fixed'),
        allowNull: false,
    },
    value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    min_fare: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
    },
    max_discount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
    max_uses: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    used_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    max_uses_per_user: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    tableName: 'coupons',
    indexes: [{ unique: true, fields: ['code'] }],
});

module.exports = Coupon;
