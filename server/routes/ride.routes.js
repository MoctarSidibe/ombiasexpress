const express = require('express');
const { body, validationResult } = require('express-validator');
const { Ride, User, Vehicle, Payment, Wallet, WalletTransaction, Coupon, CouponRedemption, Rating } = require('../models');
const { applyCouponLogic } = require('./coupon.routes');
const { getOrCreateWallet } = require('./wallet.routes');
const { auth, requireRole } = require('../middleware/auth.middleware');
const { calculateFare } = require('../utils/helpers');
const { getSetting } = require('../services/settings.service');
const { getCommissionRate, awardCashback } = require('../services/commission.service');
const { Op } = require('sequelize');
const push = require('../services/notifications.service');

const router = express.Router();

/**
 * GET /api/rides/pricing
 * Returns dynamic fare settings so the mobile app never has hardcoded rates.
 * Requires auth but no specific role — any logged-in user can read pricing.
 */
router.get('/pricing', auth, async (req, res) => {
    try {
        const [
            baseFare, perKm, perMinute, bookingFee,
            hourlyBaseFare, perHour, hourlyBookingFee,
            commissionRate, walletDiscount,
            minFare, nightSurchargePct, nightStartHour, nightEndHour,
            longDistThresholdKm, longDistPerKm,
            promoFirstRidePct, hourlyEnabled
        ] = await Promise.all([
            getSetting('ride_base_fare',              500),
            getSetting('ride_per_km',                 200),
            getSetting('ride_per_minute',             50),
            getSetting('ride_booking_fee',            150),
            getSetting('ride_hourly_base_fare',       2000),
            getSetting('ride_hourly_per_hour',        3500),
            getSetting('ride_hourly_booking_fee',     500),
            getSetting('ride_commission_rate',        20),
            getSetting('wallet_discount_rate',        5),
            getSetting('ride_min_fare',               800),
            getSetting('ride_night_surcharge_pct',    20),
            getSetting('ride_night_start_hour',       22),
            getSetting('ride_night_end_hour',         6),
            getSetting('ride_long_dist_threshold_km', 25),
            getSetting('ride_long_dist_per_km',       120),
            getSetting('ride_promo_first_ride_pct',   50),
            getSetting('ride_hourly_enabled',         '1'),
        ]);
        res.json({
            // per-km fare
            base_fare:              parseFloat(baseFare),
            per_km:                 parseFloat(perKm),
            per_minute:             parseFloat(perMinute),
            booking_fee:            parseFloat(bookingFee),
            // hourly fare
            hourly_base_fare:       parseFloat(hourlyBaseFare),
            per_hour:               parseFloat(perHour),
            hourly_booking_fee:     parseFloat(hourlyBookingFee),
            hourly_enabled:         hourlyEnabled === '1' || hourlyEnabled === 'true' || hourlyEnabled === true,
            // platform rates
            commission_rate:        parseFloat(commissionRate),
            wallet_discount:        parseFloat(walletDiscount),
            // smart pricing
            min_fare:               parseFloat(minFare),
            night_surcharge_pct:    parseFloat(nightSurchargePct),
            night_start_hour:       parseInt(nightStartHour),
            night_end_hour:         parseInt(nightEndHour),
            long_dist_threshold_km: parseFloat(longDistThresholdKm),
            long_dist_per_km:       parseFloat(longDistPerKm),
            promo_first_ride_pct:   parseFloat(promoFirstRidePct),
            currency:               'XAF',
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch pricing' });
    }
});

/**
 * POST /api/rides/request
 * Request a new ride
 */
router.post('/request', [auth, requireRole('rider')], [
    body('pickup_address').trim().notEmpty(),
    body('dropoff_address').trim().notEmpty(),
    body('pickup_lat').isFloat(),
    body('pickup_lng').isFloat(),
    body('dropoff_lat').isFloat(),
    body('dropoff_lng').isFloat(),
    body('distance_km').isFloat({ min: 0 }),
    body('duration_minutes').isInt({ min: 0 }),
    body('fare_type').optional().isIn(['per_km', 'per_hour']),
    body('booked_hours').optional().isFloat({ min: 0.5 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            pickup_address,
            dropoff_address,
            pickup_lat,
            pickup_lng,
            dropoff_lat,
            dropoff_lng,
            distance_km,
            duration_minutes,
            surge_multiplier,
            fare_type = 'per_km',
            booked_hours,
            coupon_code,
        } = req.body;

        // ── Calculate fare using admin settings ─────────────────────────────
        const [
            commissionRate,
            minFare, nightSurchargePct, nightStartHour, nightEndHour,
            longDistThresholdKm, longDistPerKm,
            promoFirstRidePct,
        ] = await Promise.all([
            getSetting('ride_commission_rate',        20),
            getSetting('ride_min_fare',               800),
            getSetting('ride_night_surcharge_pct',    20),
            getSetting('ride_night_start_hour',       22),
            getSetting('ride_night_end_hour',         6),
            getSetting('ride_long_dist_threshold_km', 25),
            getSetting('ride_long_dist_per_km',       120),
            getSetting('ride_promo_first_ride_pct',   50),
        ]).then(vals => vals.map(v => parseFloat(v)));

        let totalFare, appliedRules = [];

        if (fare_type === 'per_hour') {
            const hours      = parseFloat(booked_hours) || 1;
            const hourlyBase = parseFloat(await getSetting('ride_hourly_base_fare',   2000));
            const perHour    = parseFloat(await getSetting('ride_hourly_per_hour',    3500));
            const hourlyFee  = parseFloat(await getSetting('ride_hourly_booking_fee', 500));
            totalFare = hourlyBase + (perHour * hours) + hourlyFee;
        } else {
            const baseFare   = parseFloat(await getSetting('ride_base_fare',   500));
            const perKm      = parseFloat(await getSetting('ride_per_km',      200));
            const perMinute  = parseFloat(await getSetting('ride_per_minute',  50));
            const bookingFee = parseFloat(await getSetting('ride_booking_fee', 150));
            const dist       = parseFloat(distance_km) || 0;
            const dur        = parseInt(duration_minutes) || 0;

            // Long distance: first N km at normal rate, remainder at reduced rate
            let distCost;
            if (longDistThresholdKm > 0 && dist > longDistThresholdKm) {
                distCost = (longDistThresholdKm * perKm) + ((dist - longDistThresholdKm) * longDistPerKm);
                appliedRules.push(`long_distance`);
            } else {
                distCost = dist * perKm;
            }

            totalFare = baseFare + distCost + (dur * perMinute) + bookingFee;
        }

        // Minimum fare floor
        if (totalFare < minFare) {
            totalFare = minFare;
            appliedRules.push('min_fare');
        }

        // Night surcharge
        const currentHour = new Date().getHours();
        const isNight = nightStartHour > nightEndHour
            ? (currentHour >= nightStartHour || currentHour < nightEndHour)   // crosses midnight
            : (currentHour >= nightStartHour && currentHour < nightEndHour);
        if (nightSurchargePct > 0 && isNight) {
            totalFare = totalFare * (1 + nightSurchargePct / 100);
            appliedRules.push(`night_surcharge_${nightSurchargePct}pct`);
        }

        // First ride promo: check rider's completed ride count
        if (promoFirstRidePct > 0) {
            const rideCount = await Ride.count({
                where: { rider_id: req.user.id, status: 'completed' }
            });
            if (rideCount === 0) {
                totalFare = totalFare * (1 - promoFirstRidePct / 100);
                appliedRules.push(`first_ride_promo_${promoFirstRidePct}pct`);
            }
        }

        // Apply coupon if provided
        let couponDiscount = 0, couponRecord = null;
        if (coupon_code) {
            couponRecord = await Coupon.findOne({ where: { code: coupon_code.toUpperCase().trim() } });
            if (!couponRecord) return res.status(400).json({ error: 'Code promo invalide.' });
            try {
                const couponResult = await applyCouponLogic(couponRecord, req.user.id, totalFare);
                couponDiscount = couponResult.discount;
                totalFare      = couponResult.finalFare;
                appliedRules.push(`coupon_${couponRecord.code}`);
            } catch (err) {
                return res.status(400).json({ error: err.message });
            }
        }

        const commission     = totalFare * (parseFloat(commissionRate) / 100);
        const driverEarnings = totalFare - commission;
        const fareDetails    = {
            totalFare:      totalFare.toFixed(2),
            commission:     commission.toFixed(2),
            driverEarnings: driverEarnings.toFixed(2),
            couponDiscount: couponDiscount.toFixed(2),
            appliedRules,
        };

        // Create ride
        const ride = await Ride.create({
            rider_id: req.user.id,
            pickup_address,
            dropoff_address,
            pickup_lat,
            pickup_lng,
            dropoff_lat,
            dropoff_lng,
            distance_km,
            duration_minutes,
            fare_type,
            booked_hours: fare_type === 'per_hour' ? (booked_hours || 1) : null,
            fare: fareDetails.totalFare,
            surge_multiplier: surge_multiplier || 1.0,
            status: 'requested'
        });

        // Record coupon redemption and increment usage counter
        if (couponRecord && couponDiscount > 0) {
            await CouponRedemption.create({
                coupon_id:        couponRecord.id,
                user_id:          req.user.id,
                ride_id:          ride.id,
                original_fare:    (parseFloat(fareDetails.totalFare) + couponDiscount).toFixed(2),
                discount_applied: couponDiscount.toFixed(2),
                final_fare:       fareDetails.totalFare,
            });
            await couponRecord.increment('used_count');
        }

        // Emit to nearby drivers via Socket.io (handled in socket service)
        const io = req.app.get('io');
        if (io) {
            io.emit('new_ride_request', {
                ride_id: ride.id,
                rider: {
                    id: req.user.id,
                    name: req.user.name,
                    rating: req.user.rating
                },
                pickup_address,
                pickup_location: { lat: pickup_lat, lng: pickup_lng },
                dropoff_address,
                fare: fareDetails.totalFare,
                distance_km,
                duration_minutes
            });
        }

        res.status(201).json({
            message: 'Ride requested successfully',
            ride,
            fareDetails
        });
    } catch (error) {
        console.error('Ride request error:', error);
        res.status(500).json({ error: 'Failed to request ride' });
    }
});

/**
 * POST /api/rides/:id/accept
 * Driver accepts a ride
 */
router.post('/:id/accept', [auth, requireRole('driver')], async (req, res) => {
    try {
        const ride = await Ride.findByPk(req.params.id);

        if (!ride) {
            return res.status(404).json({ error: 'Ride not found' });
        }

        if (ride.status !== 'requested') {
            return res.status(400).json({ error: 'Ride is no longer available' });
        }

        // Get driver's active vehicle
        const vehicle = await Vehicle.findOne({
            where: {
                driver_id: req.user.id,
                status: 'approved',
                is_active: true
            }
        });

        if (!vehicle) {
            return res.status(400).json({ error: 'No approved vehicle found' });
        }

        // Update ride
        await ride.update({
            driver_id: req.user.id,
            vehicle_id: vehicle.id,
            status: 'accepted',
            accepted_at: new Date()
        });

        // Notify rider (socket + push)
        const io = req.app.get('io');
        if (io) {
            io.to(`user_${ride.rider_id}`).emit('ride_accepted', {
                ride_id: ride.id,
                driver: {
                    id: req.user.id,
                    name: req.user.name,
                    rating: req.user.rating,
                    profile_photo: req.user.profile_photo,
                    phone: req.user.phone
                },
                vehicle: {
                    make: vehicle.make,
                    model: vehicle.model,
                    color: vehicle.color,
                    license_plate: vehicle.license_plate
                }
            });
        }
        const rider = await User.findByPk(ride.rider_id, { attributes: ['push_token'] });
        push.rideAccepted(rider, ride.id, req.user.name);

        res.json({
            message: 'Ride accepted successfully',
            ride
        });
    } catch (error) {
        console.error('Ride accept error:', error);
        res.status(500).json({ error: 'Failed to accept ride' });
    }
});

/**
 * POST /api/rides/:id/start
 * Driver starts the ride
 */
router.post('/:id/start', [auth, requireRole('driver')], async (req, res) => {
    try {
        const ride = await Ride.findOne({
            where: {
                id: req.params.id,
                driver_id: req.user.id
            }
        });

        if (!ride) {
            return res.status(404).json({ error: 'Ride not found' });
        }

        if (ride.status !== 'accepted' && ride.status !== 'driver_arrived') {
            return res.status(400).json({ error: 'Cannot start ride in current status' });
        }

        await ride.update({
            status: 'in_progress',
            started_at: new Date()
        });

        // Notify rider (socket + push)
        const io = req.app.get('io');
        if (io) {
            io.to(`user_${ride.rider_id}`).emit('ride_started', {
                ride_id: ride.id
            });
        }
        const riderForStart = await User.findByPk(ride.rider_id, { attributes: ['push_token'] });
        push.rideStarted(riderForStart, ride.id);

        res.json({
            message: 'Ride started successfully',
            ride
        });
    } catch (error) {
        console.error('Ride start error:', error);
        res.status(500).json({ error: 'Failed to start ride' });
    }
});

/**
 * POST /api/rides/:id/complete
 * Complete the ride.
 * Accepts optional actual_distance_km + actual_duration_minutes to recalculate
 * the fare based on the real trip (e.g. user stopped before the planned dropoff).
 */
router.post('/:id/complete', [auth, requireRole('driver')], async (req, res) => {
    try {
        const ride = await Ride.findOne({
            where: {
                id: req.params.id,
                driver_id: req.user.id
            }
        });

        if (!ride) {
            return res.status(404).json({ error: 'Ride not found' });
        }

        if (ride.status !== 'in_progress') {
            return res.status(400).json({ error: 'Ride is not in progress' });
        }

        // ── Recalculate fare if driver reports actual distance ───────────────
        let finalFare = parseFloat(ride.fare);

        if (ride.fare_type === 'per_km') {
            const actualDist = req.body.actual_distance_km != null
                ? parseFloat(req.body.actual_distance_km)
                : null;
            const actualDur  = req.body.actual_duration_minutes != null
                ? parseInt(req.body.actual_duration_minutes)
                : null;

            if (actualDist !== null) {
                const [
                    baseFare, perKm, perMinute, bookingFee,
                    minFare, nightSurchargePct, nightStartHour, nightEndHour,
                    longDistThresholdKm, longDistPerKm,
                ] = (await Promise.all([
                    getSetting('ride_base_fare',              500),
                    getSetting('ride_per_km',                 200),
                    getSetting('ride_per_minute',             50),
                    getSetting('ride_booking_fee',            150),
                    getSetting('ride_min_fare',               800),
                    getSetting('ride_night_surcharge_pct',    20),
                    getSetting('ride_night_start_hour',       22),
                    getSetting('ride_night_end_hour',         6),
                    getSetting('ride_long_dist_threshold_km', 25),
                    getSetting('ride_long_dist_per_km',       120),
                ])).map(v => parseFloat(v));

                const dur = actualDur !== null ? actualDur : parseInt(ride.duration_minutes) || 0;

                let distCost;
                if (longDistThresholdKm > 0 && actualDist > longDistThresholdKm) {
                    distCost = (longDistThresholdKm * perKm) + ((actualDist - longDistThresholdKm) * longDistPerKm);
                } else {
                    distCost = actualDist * perKm;
                }

                finalFare = baseFare + distCost + (dur * perMinute) + bookingFee;

                // Night surcharge
                const h = new Date().getHours();
                const isNight = nightStartHour > nightEndHour
                    ? (h >= nightStartHour || h < nightEndHour)
                    : (h >= nightStartHour && h < nightEndHour);
                if (nightSurchargePct > 0 && isNight) finalFare *= (1 + nightSurchargePct / 100);

                finalFare = Math.max(finalFare, minFare);

                // Update ride with actual values
                await ride.update({
                    distance_km:      actualDist,
                    duration_minutes: dur,
                    fare:             finalFare.toFixed(2),
                });
            }
        }

        await ride.update({
            status: 'completed',
            completed_at: new Date()
        });

        // Create payment record — commission rate from CommissionRule (falls back to setting)
        const commissionRate = await getCommissionRate('ride', finalFare);
        const commission = finalFare * commissionRate;
        const driverEarnings = finalFare - commission;

        const payment = await Payment.create({
            ride_id: ride.id,
            amount: finalFare.toFixed(2),
            commission: commission.toFixed(2),
            driver_earnings: driverEarnings.toFixed(2),
            status: 'pending'
        });

        // ── Auto-debit rider wallet ───────────────────────────────────────────
        try {
            const riderWallet = await getOrCreateWallet(ride.rider_id);
            if (parseFloat(riderWallet.balance) >= finalFare) {
                const newRiderBal = parseFloat(riderWallet.balance) - finalFare;
                await riderWallet.update({ balance: newRiderBal });
                await WalletTransaction.create({
                    wallet_id: riderWallet.id,
                    type:         'debit',
                    amount:       finalFare,
                    balance_after: newRiderBal,
                    source:       'ride_payment',
                    reference:    ride.id,
                    status:       'completed',
                    description:  `Course — paiement de ${finalFare.toFixed(0)} XAF`,
                    metadata:     { card_number: riderWallet.card_number },
                });
                await payment.update({ status: 'completed', payment_method: 'wallet' });
                // Award cashback points to rider
                await awardCashback(ride.rider_id, 'ride', finalFare, ride.id);
            }
            // insufficient balance → payment stays 'pending' (cash/manual)
        } catch (_) {}

        // ── Credit driver wallet ──────────────────────────────────────────────
        await User.increment('total_earnings', {
            by: driverEarnings,
            where: { id: ride.driver_id }
        });
        try {
            const driverWallet = await getOrCreateWallet(ride.driver_id);
            const newBalance = parseFloat(driverWallet.balance) + driverEarnings;
            await driverWallet.update({ balance: newBalance });
            await WalletTransaction.create({
                wallet_id: driverWallet.id,
                type: 'credit',
                amount: driverEarnings,
                balance_after: newBalance,
                source: 'ride_earning',
                reference: ride.id,
                status: 'completed',
                description: `Course complétée — gain de ${driverEarnings.toFixed(0)} XAF`
            });
        } catch (_) {}

        // Notify rider (socket + push)
        const io = req.app.get('io');
        if (io) {
            io.to(`user_${ride.rider_id}`).emit('ride_completed', {
                ride_id: ride.id,
                fare: ride.fare
            });
        }
        const riderForComplete = await User.findByPk(ride.rider_id, { attributes: ['push_token'] });
        push.rideCompleted(riderForComplete, ride.id, ride.fare);

        res.json({
            message: 'Ride completed successfully',
            ride,
            earnings: driverEarnings.toFixed(2)
        });
    } catch (error) {
        console.error('Ride complete error:', error);
        res.status(500).json({ error: 'Failed to complete ride' });
    }
});

/**
 * POST /api/rides/:id/cancel
 * Cancel a ride
 */
router.post('/:id/cancel', [auth, requireRole('rider', 'driver')], [
    body('reason').optional().trim()
], async (req, res) => {
    try {
        const ride = await Ride.findByPk(req.params.id);

        if (!ride) {
            return res.status(404).json({ error: 'Ride not found' });
        }

        // Check authorization
        const isRider = ride.rider_id === req.user.id;
        const isDriver = ride.driver_id === req.user.id;

        if (!isRider && !isDriver) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        if (ride.status === 'completed') {
            return res.status(400).json({ error: 'Cannot cancel completed ride' });
        }

        const cancelStatus = isRider ? 'cancelled_rider' : 'cancelled_driver';

        await ride.update({
            status: cancelStatus,
            cancelled_at: new Date(),
            cancellation_reason: req.body.reason
        });

        // Notify other party via socket + push
        const io = req.app.get('io');
        const notifyUserId = isRider ? ride.driver_id : ride.rider_id;
        if (io && notifyUserId) {
            io.to(`user_${notifyUserId}`).emit('ride_cancelled', {
                ride_id: ride.id,
                cancelled_by: isRider ? 'rider' : 'driver',
                reason: req.body.reason
            });
        }
        if (notifyUserId) {
            const { User } = require('../models');
            const otherUser = await User.findByPk(notifyUserId);
            if (otherUser) push.rideCancelled(otherUser, ride.id);
        }

        res.json({
            message: 'Ride cancelled successfully',
            ride
        });
    } catch (error) {
        console.error('Ride cancel error:', error);
        res.status(500).json({ error: 'Failed to cancel ride' });
    }
});

/**
 * POST /api/rides/:id/rate
 * Rate a completed ride
 */
router.post('/:id/rate', [auth, requireRole('rider', 'driver')], [
    body('rating').isInt({ min: 1, max: 5 }),
    body('comment').optional().trim()
], async (req, res) => {
    try {
        const ride = await Ride.findByPk(req.params.id);

        if (!ride) {
            return res.status(404).json({ error: 'Ride not found' });
        }

        if (ride.status !== 'completed') {
            return res.status(400).json({ error: 'Can only rate completed rides' });
        }

        const isRider = ride.rider_id === req.user.id;
        const isDriver = ride.driver_id === req.user.id;

        if (!isRider && !isDriver) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { rating, comment, categories } = req.body;
        const updateData = {};

        let ratedUserId;
        if (isRider) {
            updateData.driver_rating  = rating;
            updateData.driver_comment = comment;
            ratedUserId = ride.driver_id;
            // Update driver's overall rating
            const driver = await User.findByPk(ride.driver_id);
            const newTotalRatings = (driver.total_ratings || 0) + 1;
            const newRating = (((driver.rating || 0) * (driver.total_ratings || 0)) + rating) / newTotalRatings;
            await driver.update({ rating: newRating.toFixed(2), total_ratings: newTotalRatings });
        } else {
            updateData.rider_rating  = rating;
            updateData.rider_comment = comment;
            ratedUserId = ride.rider_id;
            // Update rider's overall rating
            const rider = await User.findByPk(ride.rider_id);
            const newTotalRatings = (rider.total_ratings || 0) + 1;
            const newRating = (((rider.rating || 0) * (rider.total_ratings || 0)) + rating) / newTotalRatings;
            await rider.update({ rating: newRating.toFixed(2), total_ratings: newTotalRatings });
        }

        await ride.update(updateData);

        // Persist to ratings table
        await Rating.create({
            service_type:  'ride',
            service_id:    ride.id,
            rater_id:      req.user.id,
            rated_user_id: ratedUserId,
            rating,
            comment:    comment || null,
            categories: categories || null,
        });

        res.json({ message: 'Rating submitted successfully', ride });
    } catch (error) {
        console.error('Rating error:', error);
        res.status(500).json({ error: 'Failed to submit rating' });
    }
});

/**
 * GET /api/rides/history
 * Get ride history
 */
router.get('/history', [auth, requireRole('rider', 'driver')], async (req, res) => {
    try {
        const { page = 1, limit = 20, role } = req.query;
        const offset = (page - 1) * limit;

        const whereClause = {};

        const isDriver = req.user.role === 'driver' || req.user.active_services?.includes('driver');
        const isRider  = req.user.role === 'rider'  || req.user.active_services?.includes('rider');

        if (isDriver && isRider) {
            whereClause[Op.or] = [{ driver_id: req.user.id }, { rider_id: req.user.id }];
        } else if (isDriver) {
            whereClause.driver_id = req.user.id;
        } else {
            whereClause.rider_id = req.user.id;
        }

        const { count, rows: rides } = await Ride.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'rider',
                    attributes: ['id', 'name', 'rating', 'profile_photo']
                },
                {
                    model: User,
                    as: 'driver',
                    attributes: ['id', 'name', 'rating', 'profile_photo']
                },
                {
                    model: Vehicle,
                    as: 'vehicle',
                    attributes: ['make', 'model', 'color', 'license_plate']
                }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            rides,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Ride history error:', error);
        res.status(500).json({ error: 'Failed to fetch ride history' });
    }
});

/**
 * GET /api/rides/active
 * Get active ride
 */
router.get('/active', [auth, requireRole('rider', 'driver')], async (req, res) => {
    try {
        const whereClause = {
            status: {
                [Op.in]: ['requested', 'accepted', 'driver_arrived', 'in_progress']
            }
        };

        const isDriverActive = req.user.role === 'driver' || req.user.active_services?.includes('driver');
        const isRiderActive  = req.user.role === 'rider'  || req.user.active_services?.includes('rider');

        if (isDriverActive && isRiderActive) {
            whereClause[Op.or] = [{ driver_id: req.user.id }, { rider_id: req.user.id }];
        } else if (isDriverActive) {
            whereClause.driver_id = req.user.id;
        } else {
            whereClause.rider_id = req.user.id;
        }

        const ride = await Ride.findOne({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'rider',
                    attributes: ['id', 'name', 'rating', 'profile_photo', 'phone']
                },
                {
                    model: User,
                    as: 'driver',
                    attributes: ['id', 'name', 'rating', 'profile_photo', 'phone']
                },
                {
                    model: Vehicle,
                    as: 'vehicle'
                }
            ],
            order: [['created_at', 'DESC']]
        });

        res.json({ ride });
    } catch (error) {
        console.error('Active ride error:', error);
        res.status(500).json({ error: 'Failed to fetch active ride' });
    }
});

module.exports = router;
