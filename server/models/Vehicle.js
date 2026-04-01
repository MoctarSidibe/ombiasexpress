const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Vehicle = sequelize.define('Vehicle', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    driver_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    make: {
        type: DataTypes.STRING,
        allowNull: false
    },
    model: {
        type: DataTypes.STRING,
        allowNull: false
    },
    year: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 2000,
            max: new Date().getFullYear() + 1
        }
    },
    color: {
        type: DataTypes.STRING,
        allowNull: false
    },
    license_plate: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    vehicle_type: {
        type: DataTypes.ENUM('economy', 'comfort', 'premium', 'xl'),
        defaultValue: 'economy'
    },
    seats: {
        type: DataTypes.INTEGER,
        defaultValue: 4,
        validate: {
            min: 1,
            max: 8
        }
    },
    photo_url: {
        type: DataTypes.STRING,
        allowNull: true
    },
    documents: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Insurance, registration, inspection documents'
    },
    status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'suspended'),
        defaultValue: 'pending'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    is_fleet_car: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'True when vehicle belongs to Ombia fleet (fleet_owner role)'
    },
    owner_drives: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'True when the fleet owner drives their own vehicle'
    }
}, {
    tableName: 'vehicles',
    indexes: [
        { fields: ['driver_id'] },
        { fields: ['license_plate'] },
        { fields: ['status'] }
    ]
});

module.exports = Vehicle;
