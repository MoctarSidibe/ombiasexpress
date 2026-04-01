const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CouponRedemption = sequelize.define('CouponRedemption', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    coupon_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'coupons', key: 'id' },
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
    },
    ride_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'rides', key: 'id' },
    },
    original_fare: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    discount_applied: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    final_fare: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
}, {
    tableName: 'coupon_redemptions',
    updatedAt: false,
    indexes: [
        { fields: ['coupon_id'] },
        { fields: ['user_id'] },
        { fields: ['ride_id'] },
    ],
});

module.exports = CouponRedemption;
