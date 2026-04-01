const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Rating = sequelize.define('Rating', {
    id: {
        type:         DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey:   true,
    },
    service_type: {
        type:     DataTypes.ENUM('ride', 'rental', 'delivery'),
        allowNull: false,
    },
    service_id: {
        type:     DataTypes.UUID,
        allowNull: false,
    },
    rater_id: {
        type:      DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
    },
    rated_user_id: {
        type:      DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
    },
    rating: {
        type:     DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1, max: 5 },
    },
    comment: {
        type:     DataTypes.TEXT,
        allowNull: true,
    },
    categories: {
        type:     DataTypes.JSON,
        allowNull: true,
    },
    is_hidden: {
        type:         DataTypes.BOOLEAN,
        defaultValue: false,
    },
}, {
    tableName:   'ratings',
    underscored: true,
    indexes: [
        { fields: ['service_type', 'service_id'] },
        { fields: ['rated_user_id'] },
        { fields: ['rater_id'] },
    ],
});

module.exports = Rating;
