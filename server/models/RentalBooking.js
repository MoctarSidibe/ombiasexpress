const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RentalBooking = sequelize.define('RentalBooking', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    renter_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
    rental_car_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'rental_cars', key: 'id' } },
    owner_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
    requested_start: { type: DataTypes.DATE, allowNull: false },
    requested_end: { type: DataTypes.DATE, allowNull: false },
    confirmed_start: { type: DataTypes.DATE, allowNull: true },
    confirmed_end: { type: DataTypes.DATE, allowNull: true },
    actual_return_time: { type: DataTypes.DATE, allowNull: true },
    total_hours: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    base_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    deposit_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.0 },
    platform_fee: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    owner_earnings: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    total_charged: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    status: { type: DataTypes.ENUM('requested', 'approved', 'rejected', 'active', 'completed', 'cancelled', 'disputed'), defaultValue: 'requested' },
    cancellation_reason: { type: DataTypes.TEXT, allowNull: true },
    renter_rating: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 1, max: 5 } },
    owner_rating: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 1, max: 5 } },
    renter_comment: { type: DataTypes.TEXT, allowNull: true },
    owner_comment: { type: DataTypes.TEXT, allowNull: true },
    payment_status: { type: DataTypes.ENUM('pending', 'held', 'released', 'refunded'), defaultValue: 'pending' },
    payment_transaction_id: { type: DataTypes.STRING, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true }
}, {
    tableName: 'rental_bookings',
    indexes: [{ fields: ['renter_id'] }, { fields: ['rental_car_id'] }, { fields: ['owner_id'] }, { fields: ['status'] }, { fields: ['requested_start'] }]
});

module.exports = RentalBooking;
