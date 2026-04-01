const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DriverVerification = sequelize.define('DriverVerification', {
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
        type: DataTypes.ENUM('draft', 'submitted', 'under_review', 'appointment_scheduled', 'approved', 'rejected'),
        defaultValue: 'draft',
    },
    // Personal info
    full_name:            { type: DataTypes.STRING,   allowNull: true },
    date_of_birth:        { type: DataTypes.DATEONLY, allowNull: true },
    phone:                { type: DataTypes.STRING,   allowNull: true },
    address:              { type: DataTypes.STRING,   allowNull: true },
    city:                 { type: DataTypes.STRING,   allowNull: true },
    national_id_number:   { type: DataTypes.STRING,   allowNull: true },
    license_number:       { type: DataTypes.STRING,   allowNull: true },
    // Uploaded document paths  { id_front, id_back, license_front, license_back, selfie }
    docs: {
        type: DataTypes.JSON,
        defaultValue: {},
    },
    // Appointment
    appointment_date:   { type: DataTypes.DATE,   allowNull: true },
    office_location:    { type: DataTypes.STRING, allowNull: true },
    // Admin
    admin_notes:        { type: DataTypes.TEXT,   allowNull: true },
    rejection_reason:   { type: DataTypes.TEXT,   allowNull: true },
    reviewed_at:        { type: DataTypes.DATE,   allowNull: true },
    reviewed_by:        { type: DataTypes.STRING, allowNull: true },
}, {
    tableName: 'driver_verifications',
    indexes: [
        { fields: ['user_id'] },
        { fields: ['status'] },
    ],
});

module.exports = DriverVerification;
