const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RentalCar = sequelize.define('RentalCar', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    owner_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
    make: { type: DataTypes.STRING, allowNull: false },
    model: { type: DataTypes.STRING, allowNull: false },
    year: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1990, max: new Date().getFullYear() + 1 } },
    color: { type: DataTypes.STRING, allowNull: false },
    license_plate: { type: DataTypes.STRING, allowNull: false },
    photos: { type: DataTypes.JSON, defaultValue: [] },
    features: { type: DataTypes.JSON, defaultValue: [] },
    seats: { type: DataTypes.INTEGER, defaultValue: 4, validate: { min: 1, max: 9 } },
    fuel_type: { type: DataTypes.ENUM('gasoline', 'diesel', 'hybrid', 'electric'), defaultValue: 'gasoline' },
    price_per_hour: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    price_per_day: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    deposit_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.0 },
    minimum_hours: { type: DataTypes.INTEGER, defaultValue: 1 },
    pickup_lat: { type: DataTypes.DECIMAL(10, 8), allowNull: false },
    pickup_lng: { type: DataTypes.DECIMAL(11, 8), allowNull: false },
    pickup_address: { type: DataTypes.STRING, allowNull: false },
    pickup_instructions: { type: DataTypes.TEXT, allowNull: true },
    available_from: { type: DataTypes.DATE, allowNull: false },
    available_until: { type: DataTypes.DATE, allowNull: false },
    status: { type: DataTypes.ENUM('pending_approval', 'available', 'rented', 'unavailable', 'suspended'), defaultValue: 'pending_approval' },
    admin_notes: { type: DataTypes.TEXT, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
    tableName: 'rental_cars',
    indexes: [{ fields: ['owner_id'] }, { fields: ['status'] }, { fields: ['available_from'] }, { fields: ['available_until'] }]
});

module.exports = RentalCar;
