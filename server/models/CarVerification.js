const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CarVerification = sequelize.define('CarVerification', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
    },
    status: {
        type: DataTypes.ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected'),
        defaultValue: 'draft',
    },
    // Car details
    make:         { type: DataTypes.STRING, allowNull: true },
    model:        { type: DataTypes.STRING, allowNull: true },
    year:         { type: DataTypes.INTEGER, allowNull: true },
    color:        { type: DataTypes.STRING, allowNull: true },
    plate_number: { type: DataTypes.STRING, allowNull: true },
    seats:        { type: DataTypes.INTEGER, defaultValue: 5 },
    fuel_type: {
        type: DataTypes.ENUM('gasoline', 'diesel', 'electric', 'hybrid'),
        defaultValue: 'gasoline',
    },
    transmission: {
        type: DataTypes.ENUM('manual', 'automatic'),
        defaultValue: 'manual',
    },
    mileage:      { type: DataTypes.INTEGER, allowNull: true },
    price_per_day:{ type: DataTypes.DECIMAL(10,2), allowNull: true },
    description:  { type: DataTypes.TEXT, allowNull: true },
    // Uploaded document paths  { carte_grise_front, carte_grise_back, insurance, inspection_cert }
    docs: {
        type: DataTypes.JSON,
        defaultValue: {},
    },
    // Car photo paths  { front, back, left, right, interior }
    photos: {
        type: DataTypes.JSON,
        defaultValue: {},
    },
    // Admin
    admin_notes:      { type: DataTypes.TEXT,   allowNull: true },
    rejection_reason: { type: DataTypes.TEXT,   allowNull: true },
    reviewed_at:      { type: DataTypes.DATE,   allowNull: true },
    reviewed_by:      { type: DataTypes.STRING, allowNull: true },
    // Created RentalCar id on approval
    rental_car_id:    { type: DataTypes.UUID,   allowNull: true },
}, {
    tableName: 'car_verifications',
    indexes: [
        { fields: ['user_id'] },
        { fields: ['status'] },
    ],
});

module.exports = CarVerification;
