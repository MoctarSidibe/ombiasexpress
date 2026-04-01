const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CarListing = sequelize.define('CarListing', {
    id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    seller_id: { type: DataTypes.UUID, allowNull: false },

    // ── Vehicle details ───────────────────────────────────────────────────────
    make:         { type: DataTypes.STRING, allowNull: false },
    model:        { type: DataTypes.STRING, allowNull: false },
    year:         { type: DataTypes.INTEGER, allowNull: false },
    color:        { type: DataTypes.STRING },
    mileage:      { type: DataTypes.INTEGER },
    fuel_type:    { type: DataTypes.ENUM('essence', 'diesel', 'hybride', 'electrique') },
    transmission: { type: DataTypes.ENUM('manuelle', 'automatique') },
    seats:        { type: DataTypes.INTEGER },

    // ── Listing details ───────────────────────────────────────────────────────
    price:       { type: DataTypes.DECIMAL(12, 0), allowNull: false },
    city:        { type: DataTypes.STRING },
    description: { type: DataTypes.TEXT },
    photos:      { type: DataTypes.JSON, defaultValue: [] },     // array of URL strings

    // ── Status ────────────────────────────────────────────────────────────────
    status:      {
        type: DataTypes.ENUM('pending', 'active', 'rejected', 'sold', 'paused'),
        defaultValue: 'pending',
    },
    view_count:  { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
    tableName:   'car_listings',
    timestamps:  true,
    underscored: true,
});

module.exports = CarListing;
