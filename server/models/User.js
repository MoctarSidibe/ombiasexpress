const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password_hash: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('rider', 'driver', 'renter', 'rental_owner', 'fleet_owner', 'partner', 'store_owner', 'car_seller', 'courier', 'admin'),
        defaultValue: 'rider'
    },
    profile_photo: {
        type: DataTypes.STRING,
        allowNull: true
    },
    rating: {
        type: DataTypes.DECIMAL(3, 2),
        defaultValue: 5.0,
        validate: {
            min: 0,
            max: 5
        }
    },
    total_ratings: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    is_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    last_lat: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true
    },
    last_lng: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true
    },
    is_online: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    total_earnings: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0
    },
    active_services: {
        type: DataTypes.JSON,
        defaultValue: ['rider', 'renter'],
        comment: 'List of services this user has unlocked'
    },
    cashback_points: {
        type:         DataTypes.INTEGER,
        defaultValue: 0,
    },
    push_token: {
        type:      DataTypes.STRING,
        allowNull: true,
        comment:   'Expo push notification token',
    },
    is_staff: {
        type:      DataTypes.BOOLEAN,
        defaultValue: false,
        comment:   'True for admin panel staff members',
    },
    mfa_secret: {
        type:      DataTypes.STRING,
        allowNull: true,
        comment:   'TOTP secret for 2FA (base32)',
    },
    mfa_enabled: {
        type:      DataTypes.BOOLEAN,
        defaultValue: false,
        comment:   'Whether TOTP 2FA is active',
    },
}, {
    tableName: 'users',
    indexes: [
        { fields: ['email'] },
        { fields: ['phone'] },
        { fields: ['role'] },
        { fields: ['is_online'] }
    ]
});

module.exports = User;
