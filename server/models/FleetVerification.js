const { DataTypes } = require('sequelize');
const { sequelize }  = require('../config/database');

const FleetVerification = sequelize.define('FleetVerification', {
    id:      { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    status:  {
        type: DataTypes.ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected'),
        defaultValue: 'draft',
    },

    // ── Owner identity ────────────────────────────────────────────────────────
    full_name:          { type: DataTypes.STRING },
    phone:              { type: DataTypes.STRING },
    address:            { type: DataTypes.STRING },
    city:               { type: DataTypes.STRING },
    national_id_number: { type: DataTypes.STRING },

    // ── Vehicle details ───────────────────────────────────────────────────────
    make:         { type: DataTypes.STRING },
    model:        { type: DataTypes.STRING },
    year:         { type: DataTypes.INTEGER },
    color:        { type: DataTypes.STRING },
    plate_number: { type: DataTypes.STRING },
    seats:        { type: DataTypes.INTEGER },
    fuel_type:    { type: DataTypes.ENUM('essence', 'diesel', 'hybride', 'electrique') },
    transmission: { type: DataTypes.ENUM('manuelle', 'automatique') },
    mileage:      { type: DataTypes.INTEGER },

    // ── Documents (JSON) ──────────────────────────────────────────────────────
    // id_docs: { id_front, id_back }
    id_docs: { type: DataTypes.JSON, defaultValue: {} },
    // vehicle_docs: { carte_grise_front, carte_grise_back, insurance, inspection_cert }
    vehicle_docs: { type: DataTypes.JSON, defaultValue: {} },
    // vehicle_photos: { front, back, left, right, interior }
    vehicle_photos: { type: DataTypes.JSON, defaultValue: {} },

    // ── Fleet agreement ───────────────────────────────────────────────────────
    agreement_accepted: { type: DataTypes.BOOLEAN, defaultValue: false },

    // ── Admin ─────────────────────────────────────────────────────────────────
    admin_notes:      { type: DataTypes.TEXT },
    rejection_reason: { type: DataTypes.TEXT },
    reviewed_at:      { type: DataTypes.DATE },
    reviewed_by:      { type: DataTypes.UUID },
}, {
    tableName:   'fleet_verifications',
    timestamps:  true,
    underscored: true,
});

module.exports = FleetVerification;
