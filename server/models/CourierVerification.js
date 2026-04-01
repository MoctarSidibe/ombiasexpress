const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CourierVerification = sequelize.define('CourierVerification', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
    },
    status: {
        type: DataTypes.ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected'),
        defaultValue: 'draft',
    },
    // Personal info
    full_name:          { type: DataTypes.STRING,   allowNull: true },
    date_of_birth:      { type: DataTypes.DATEONLY, allowNull: true },
    phone:              { type: DataTypes.STRING,   allowNull: true },
    address:            { type: DataTypes.STRING,   allowNull: true },
    city:               { type: DataTypes.STRING,   allowNull: true },
    national_id_number: { type: DataTypes.STRING,   allowNull: true },
    transport_type: {
        type: DataTypes.ENUM('scooter', 'velo', 'voiture', 'a_pied'),
        defaultValue: 'scooter',
    },
    // Uploaded docs: { id_front, id_back, selfie }
    docs: { type: DataTypes.JSON, defaultValue: {} },
    // Admin
    admin_notes:      { type: DataTypes.TEXT, allowNull: true },
    rejection_reason: { type: DataTypes.TEXT, allowNull: true },
    reviewed_at:      { type: DataTypes.DATE, allowNull: true },
    reviewed_by:      { type: DataTypes.STRING, allowNull: true },
}, {
    tableName: 'courier_verifications',
    underscored: true,
    indexes: [
        { fields: ['user_id'] },
        { fields: ['status'] },
    ],
});

module.exports = CourierVerification;
