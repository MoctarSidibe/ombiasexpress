const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SupportMessage = sequelize.define('SupportMessage', {
    id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    ticket_id:   { type: DataTypes.UUID, allowNull: false },
    sender_type: {
        type: DataTypes.ENUM('user', 'support', 'bot'),
        defaultValue: 'user',
    },
    content:      { type: DataTypes.TEXT,    allowNull: false },
    sender_id:    { type: DataTypes.UUID,    allowNull: true },  // staff user ID when sender_type='support'
    sender_name:  { type: DataTypes.STRING,  allowNull: true },  // agent display name
    is_read:      { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
    tableName:   'support_messages',
    underscored: true,
});

module.exports = SupportMessage;
