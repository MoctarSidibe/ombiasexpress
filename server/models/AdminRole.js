const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AdminRole = sequelize.define('AdminRole', {
    id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name:        { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.STRING(300), allowNull: true },
    color:       { type: DataTypes.STRING(7),   defaultValue: '#1565C0' },
    permissions: { type: DataTypes.JSON,         defaultValue: [] },
    is_system:   { type: DataTypes.BOOLEAN,      defaultValue: false },
    created_by:  { type: DataTypes.UUID,         allowNull: true },
}, {
    tableName:   'admin_roles',
    underscored: true,
});

module.exports = AdminRole;
