const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AdminStaff = sequelize.define('AdminStaff', {
    id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id:    { type: DataTypes.UUID, allowNull: false, unique: true },
    role_id:    { type: DataTypes.UUID, allowNull: false },
    department: { type: DataTypes.STRING(100), allowNull: true },
    notes:      { type: DataTypes.TEXT,        allowNull: true },
    is_active:  { type: DataTypes.BOOLEAN,     defaultValue: true },
    invited_by: { type: DataTypes.UUID,        allowNull: true },
}, {
    tableName:   'admin_staff',
    underscored: true,
});

module.exports = AdminStaff;
