const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WalletFeature = sequelize.define('WalletFeature', {
    id: {
        type:          DataTypes.UUID,
        defaultValue:  DataTypes.UUIDV4,
        primaryKey:    true,
    },
    key: {
        type:      DataTypes.STRING(64),
        allowNull: false,
    },
    title: {
        type:      DataTypes.STRING(100),
        allowNull: false,
    },
    subtitle: {
        type:      DataTypes.STRING(200),
        allowNull: true,
    },
    // Ionicons name
    icon: {
        type:         DataTypes.STRING(80),
        allowNull:    false,
        defaultValue: 'card-outline',
    },
    icon_color:   { type: DataTypes.STRING(20), defaultValue: '#FFA726' },
    icon_bg:      { type: DataTypes.STRING(30), defaultValue: '#FFF8EE' },
    card_bg:      { type: DataTypes.STRING(30), defaultValue: '#FFFCF5' },
    border_color: { type: DataTypes.STRING(30), defaultValue: '#FFD580' },
    screen_route: {
        type:      DataTypes.STRING(80),
        allowNull: true,
    },
    // Optional promo badge text (e.g. "-5%" or "Nouveau")
    badge_text:  { type: DataTypes.STRING(30), allowNull: true },
    badge_color: { type: DataTypes.STRING(20), defaultValue: '#FFA726' },
    enabled:     { type: DataTypes.BOOLEAN,    defaultValue: true },
    sort_order:  { type: DataTypes.INTEGER,    defaultValue: 0 },
    full_width:  { type: DataTypes.BOOLEAN,    defaultValue: false },
}, {
    tableName:  'wallet_features',
    timestamps: true,
    indexes: [
        { fields: ['key'], unique: true },
    ],
});

module.exports = WalletFeature;
