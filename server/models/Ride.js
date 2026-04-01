const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Ride = sequelize.define('Ride', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    rider_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    driver_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    vehicle_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'vehicles',
            key: 'id'
        }
    },
    pickup_address: {
        type: DataTypes.STRING,
        allowNull: false
    },
    dropoff_address: {
        type: DataTypes.STRING,
        allowNull: false
    },
    pickup_lat: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: false
    },
    pickup_lng: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: false
    },
    dropoff_lat: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: false
    },
    dropoff_lng: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM(
            'requested',
            'accepted',
            'driver_arrived',
            'in_progress',
            'completed',
            'cancelled_rider',
            'cancelled_driver'
        ),
        defaultValue: 'requested'
    },
    fare_type: {
        type: DataTypes.ENUM('per_km', 'per_hour'),
        defaultValue: 'per_km'
    },
    booked_hours: {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: true,
        comment: 'Number of hours booked — only set for per_hour rides'
    },
    fare: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    distance_km: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    duration_minutes: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    surge_multiplier: {
        type: DataTypes.DECIMAL(3, 2),
        defaultValue: 1.0
    },
    rider_rating: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 1,
            max: 5
        }
    },
    driver_rating: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 1,
            max: 5
        }
    },
    rider_comment: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    driver_comment: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    accepted_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    started_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    completed_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    cancelled_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    cancellation_reason: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'rides',
    indexes: [
        { fields: ['rider_id'] },
        { fields: ['driver_id'] },
        { fields: ['status'] },
        { fields: ['created_at'] }
    ]
});

module.exports = Ride;
