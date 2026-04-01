const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SupportTicket = sequelize.define('SupportTicket', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id:     { type: DataTypes.UUID, allowNull: false },
    type: {
        type: DataTypes.ENUM('chat', 'incident', 'complaint', 'question'),
        defaultValue: 'chat',
    },
    subject:     { type: DataTypes.STRING(200), allowNull: false },
    // Link to the service that caused the issue (optional)
    service_type: {
        type: DataTypes.ENUM('ride', 'rental', 'delivery', 'order', 'wallet', 'general'),
        defaultValue: 'general',
    },
    service_id:   { type: DataTypes.UUID, allowNull: true },
    // Incident-specific category
    incident_category: {
        type: DataTypes.ENUM(
            'driver_behavior', 'payment_issue', 'app_bug',
            'safety_concern', 'item_damaged', 'wrong_address',
            'overcharge', 'vehicle_condition', 'other'
        ),
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('open', 'in_progress', 'resolved', 'closed'),
        defaultValue: 'open',
    },
    priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
        defaultValue: 'medium',
    },
    last_message_at: { type: DataTypes.DATE, allowNull: true },
    unread_user:     { type: DataTypes.INTEGER, defaultValue: 0 },  // unread msgs for user
    unread_support:  { type: DataTypes.INTEGER, defaultValue: 1 },  // new ticket = 1 for support
    user_rating:     { type: DataTypes.INTEGER, allowNull: true },   // 1–5 after resolution
    resolved_at:     { type: DataTypes.DATE,    allowNull: true },
}, {
    tableName:   'support_tickets',
    underscored: true,
});

module.exports = SupportTicket;
