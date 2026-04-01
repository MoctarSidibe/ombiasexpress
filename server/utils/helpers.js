const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Hash password
 */
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

/**
 * Compare password with hash
 */
const comparePassword = async (password, hash) => {
    return bcrypt.compare(password, hash);
};

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

/**
 * Calculate distance between two points (Haversine formula)
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const toRad = (value) => {
    return (value * Math.PI) / 180;
};

/**
 * Calculate fare based on distance, time, and surge
 * @param {number} distanceKm - Distance in kilometers
 * @param {number} durationMinutes - Duration in minutes
 * @param {number} surgeMultiplier - Surge pricing multiplier
 * @returns {object} Fare breakdown
 */
const calculateFare = (distanceKm, durationMinutes, surgeMultiplier = 1.0) => {
    const BASE_FARE = 2.0;
    const PER_KM = 1.5;
    const PER_MINUTE = 0.3;
    const BOOKING_FEE = parseFloat(process.env.BOOKING_FEE) || 1.5;

    const distanceCost = distanceKm * PER_KM;
    const timeCost = durationMinutes * PER_MINUTE;
    const subtotal = BASE_FARE + distanceCost + timeCost;
    const surgedFare = subtotal * surgeMultiplier;
    const totalFare = surgedFare + BOOKING_FEE;

    const commissionRate = parseFloat(process.env.COMMISSION_RATE) || 20;
    const commission = (totalFare * commissionRate) / 100;
    const driverEarnings = totalFare - commission;

    return {
        baseFare: BASE_FARE.toFixed(2),
        distanceCost: distanceCost.toFixed(2),
        timeCost: timeCost.toFixed(2),
        subtotal: subtotal.toFixed(2),
        surgeMultiplier,
        bookingFee: BOOKING_FEE.toFixed(2),
        totalFare: totalFare.toFixed(2),
        commission: commission.toFixed(2),
        driverEarnings: driverEarnings.toFixed(2)
    };
};

module.exports = {
    hashPassword,
    comparePassword,
    generateToken,
    calculateDistance,
    calculateFare
};
