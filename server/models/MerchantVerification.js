const { DataTypes } = require('sequelize');
const { sequelize }  = require('../config/database');

const MerchantVerification = sequelize.define('MerchantVerification', {
    id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id:       { type: DataTypes.UUID, allowNull: false },
    merchant_type: { type: DataTypes.ENUM('partner', 'store_owner', 'car_seller'), allowNull: false },
    status:        {
        type: DataTypes.ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected'),
        defaultValue: 'draft',
    },

    // Business info
    business_name: { type: DataTypes.STRING },
    business_type: { type: DataTypes.STRING },   // "Restaurant", "Boutique", "Concessionnaire"…
    rccm_number:   { type: DataTypes.STRING },
    tax_id:        { type: DataTypes.STRING },
    address:       { type: DataTypes.STRING },
    city:          { type: DataTypes.STRING },
    phone:         { type: DataTypes.STRING },
    email:         { type: DataTypes.STRING },
    website:       { type: DataTypes.STRING },

    // Documents (JSON): rccm_doc, id_card, tax_cert, storefront_photo
    docs:          { type: DataTypes.JSON, defaultValue: {} },
    // Bank / mobile money (JSON): bank_name, account_number, account_holder
    bank_info:     { type: DataTypes.JSON, defaultValue: {} },

    // Admin
    admin_notes:      { type: DataTypes.TEXT },
    rejection_reason: { type: DataTypes.TEXT },
    reviewed_at:      { type: DataTypes.DATE },
    reviewed_by:      { type: DataTypes.UUID },
}, {
    tableName:   'merchant_verifications',
    timestamps:  true,
    underscored: true,
});

module.exports = MerchantVerification;
