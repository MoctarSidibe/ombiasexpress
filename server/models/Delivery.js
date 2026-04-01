const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Delivery = sequelize.define('Delivery', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    sender_id:   { type: DataTypes.UUID, allowNull: false },
    courier_id:  { type: DataTypes.UUID, allowNull: true },
    pickup_address:  { type: DataTypes.STRING, allowNull: false },
    pickup_lat:      { type: DataTypes.FLOAT },
    pickup_lng:      { type: DataTypes.FLOAT },
    dropoff_address: { type: DataTypes.STRING, allowNull: false },
    dropoff_lat:     { type: DataTypes.FLOAT },
    dropoff_lng:     { type: DataTypes.FLOAT },
    package_description: { type: DataTypes.STRING },
    package_size: {
        type: DataTypes.ENUM('petit', 'moyen', 'lourd'),
        defaultValue: 'petit',
    },
    status: {
        type: DataTypes.ENUM('pending', 'accepted', 'picked_up', 'delivered', 'cancelled'),
        defaultValue: 'pending',
    },
    fare:        { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    distance_km: { type: DataTypes.FLOAT },
    notes:       { type: DataTypes.TEXT },
    cancelled_by: { type: DataTypes.STRING }, // 'sender' | 'courier' | 'admin'
    order_id: { type: DataTypes.UUID, allowNull: true }, // linked e-commerce order
}, {
    tableName: 'deliveries',
    underscored: true,
});

module.exports = Delivery;
