const express = require('express');
const { body, validationResult } = require('express-validator');
const { RentalCar, RentalBooking, RentalPayment, User, WalletTransaction, Rating } = require('../models');
const { getOrCreateWallet } = require('./wallet.routes');
const { auth, requireRole } = require('../middleware/auth.middleware');
const { Op } = require('sequelize');
const { getSetting } = require('../services/settings.service');
const { getCommissionRate, awardCashback } = require('../services/commission.service');
const push = require('../services/notifications.service');

const router = express.Router();

// ── Helpers ───────────────────────────────────────────────────────────────────
const haversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// commissionRate is passed in so it can be fetched async by the caller
const calcPrice = (car, start, end, commissionRate) => {
    const totalHours = (new Date(end) - new Date(start)) / 3600000;
    let basePrice;
    if (totalHours >= 24) {
        const days = Math.ceil(totalHours / 24);
        const hourly = totalHours * parseFloat(car.price_per_hour);
        const daily = days * parseFloat(car.price_per_day);
        basePrice = Math.min(hourly, daily);
    } else {
        basePrice = totalHours * parseFloat(car.price_per_hour);
    }
    const platformFee = basePrice * commissionRate;
    const ownerEarnings = basePrice * (1 - commissionRate);
    const depositAmount = parseFloat(car.deposit_amount);
    const totalCharged = basePrice + depositAmount;
    return { totalHours: +totalHours.toFixed(2), basePrice: +basePrice.toFixed(2), platformFee: +platformFee.toFixed(2), ownerEarnings: +ownerEarnings.toFixed(2), depositAmount: +depositAmount.toFixed(2), totalCharged: +totalCharged.toFixed(2) };
};

const hasOverlap = async (carId, start, end, excludeBookingId = null) => {
    const where = {
        rental_car_id: carId,
        status: { [Op.in]: ['approved', 'active'] },
        [Op.not]: [{ [Op.or]: [{ requested_end: { [Op.lte]: new Date(start) } }, { requested_start: { [Op.gte]: new Date(end) } }] }]
    };
    if (excludeBookingId) where.id = { [Op.ne]: excludeBookingId };
    return (await RentalBooking.count({ where })) > 0;
};

// ── Rental Car Endpoints ──────────────────────────────────────────────────────

// GET /api/rentals/cars/available  — all available cars (map view)
router.get('/cars/available', async (req, res) => {
    try {
        const { lat, lng, radius_km = 50, start, end, min_seats, fuel_type, max_price_per_day } = req.query;
        const now = new Date();
        const where = { status: 'available', is_active: true, available_from: { [Op.lte]: now }, available_until: { [Op.gte]: now } };
        if (min_seats) where.seats = { [Op.gte]: parseInt(min_seats) };
        if (fuel_type) where.fuel_type = fuel_type;
        if (max_price_per_day) where.price_per_day = { [Op.lte]: parseFloat(max_price_per_day) };

        let cars = await RentalCar.findAll({
            where,
            include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'rating', 'profile_photo'] }]
        });

        // Filter by date range overlap if start/end provided
        if (start && end) {
            const carIds = [];
            for (const car of cars) {
                const conflict = await hasOverlap(car.id, start, end);
                if (!conflict) carIds.push(car.id);
            }
            cars = cars.filter(c => carIds.includes(c.id));
        }

        // Filter by radius if lat/lng provided
        if (lat && lng) {
            const userLat = parseFloat(lat);
            const userLng = parseFloat(lng);
            cars = cars.filter(car => haversineKm(userLat, userLng, parseFloat(car.pickup_lat), parseFloat(car.pickup_lng)) <= parseFloat(radius_km));
        }

        res.json({ cars });
    } catch (error) {
        console.error('Get available cars error:', error);
        res.status(500).json({ error: 'Failed to fetch available cars' });
    }
});

// GET /api/rentals/cars/mine  — owner's cars
router.get('/cars/mine', [auth, requireRole('rental_owner')], async (req, res) => {
    try {
        const cars = await RentalCar.findAll({
            where: { owner_id: req.user.id, is_active: true },
            include: [{ model: RentalBooking, as: 'bookings', where: { status: { [Op.in]: ['requested', 'approved', 'active'] } }, required: false, attributes: ['id', 'status', 'requested_start', 'requested_end', 'renter_id'] }],
            order: [['created_at', 'DESC']]
        });
        res.json({ cars });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch your cars' });
    }
});

// GET /api/rentals/cars/:id/price  — price preview
router.get('/cars/:id/price', async (req, res) => {
    try {
        const { start, end } = req.query;
        if (!start || !end) return res.status(400).json({ error: 'start and end are required' });
        const car = await RentalCar.findByPk(req.params.id);
        if (!car) return res.status(404).json({ error: 'Car not found' });
        const startDate = new Date(start);
        const endDate = new Date(end);
        if (endDate <= startDate) return res.status(400).json({ error: 'End must be after start' });
        if ((endDate - startDate) / 3600000 < car.minimum_hours) return res.status(400).json({ error: 'Minimum rental duration is ' + car.minimum_hours + ' hour(s)' });
        const commissionRate = await getCommissionRate('rental', 0);
        const price = calcPrice(car, start, end, commissionRate);
        res.json({ price });
    } catch (error) {
        res.status(500).json({ error: 'Failed to calculate price' });
    }
});

// GET /api/rentals/cars/:id  — car detail (public)
router.get('/cars/:id', async (req, res) => {
    try {
        const car = await RentalCar.findOne({
            where: { id: req.params.id, is_active: true },
            include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'rating', 'profile_photo', 'phone'] }]
        });
        if (!car) return res.status(404).json({ error: 'Car not found' });
        res.json({ car });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch car' });
    }
});

// POST /api/rentals/cars  — list a car
router.post('/cars', [auth, requireRole('rental_owner')], [
    body('make').trim().notEmpty(),
    body('model').trim().notEmpty(),
    body('year').isInt({ min: 1990 }),
    body('color').trim().notEmpty(),
    body('license_plate').trim().notEmpty(),
    body('price_per_hour').isFloat({ min: 0.01 }),
    body('price_per_day').isFloat({ min: 0.01 }),
    body('pickup_lat').isFloat(),
    body('pickup_lng').isFloat(),
    body('pickup_address').trim().notEmpty(),
    body('available_from').isISO8601(),
    body('available_until').isISO8601()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        const { make, model, year, color, license_plate, photos, features, seats, fuel_type, price_per_hour, price_per_day, deposit_amount, minimum_hours, pickup_lat, pickup_lng, pickup_address, pickup_instructions, available_from, available_until } = req.body;
        const car = await RentalCar.create({
            owner_id: req.user.id, make, model, year, color, license_plate,
            photos: photos || [], features: features || [], seats: seats || 4,
            fuel_type: fuel_type || 'gasoline', price_per_hour, price_per_day,
            deposit_amount: deposit_amount || 0, minimum_hours: minimum_hours || 1,
            pickup_lat, pickup_lng, pickup_address, pickup_instructions, available_from, available_until
        });
        res.status(201).json({ message: 'Car listed successfully. Awaiting admin approval.', car });
    } catch (error) {
        console.error('Create rental car error:', error);
        res.status(500).json({ error: 'Failed to list car' });
    }
});

// PUT /api/rentals/cars/:id  — update listing
router.put('/cars/:id', [auth, requireRole('rental_owner')], async (req, res) => {
    try {
        const car = await RentalCar.findOne({ where: { id: req.params.id, owner_id: req.user.id, is_active: true } });
        if (!car) return res.status(404).json({ error: 'Car not found' });
        if (car.status === 'rented') return res.status(400).json({ error: 'Cannot update a car that is currently rented' });
        const allowed = ['photos', 'features', 'price_per_hour', 'price_per_day', 'deposit_amount', 'minimum_hours', 'pickup_lat', 'pickup_lng', 'pickup_address', 'pickup_instructions', 'available_from', 'available_until', 'color'];
        const updateData = {};
        allowed.forEach(field => { if (req.body[field] !== undefined) updateData[field] = req.body[field]; });
        await car.update(updateData);
        res.json({ message: 'Car updated successfully', car });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update car' });
    }
});

// PUT /api/rentals/cars/:id/toggle  — pause/resume availability
router.put('/cars/:id/toggle', [auth, requireRole('rental_owner')], async (req, res) => {
    try {
        const car = await RentalCar.findOne({ where: { id: req.params.id, owner_id: req.user.id, is_active: true } });
        if (!car) return res.status(404).json({ error: 'Car not found' });
        if (car.status === 'rented') return res.status(400).json({ error: 'Car is currently rented' });
        if (car.status === 'pending_approval' || car.status === 'suspended') return res.status(400).json({ error: 'Car cannot be toggled in current status' });
        const newStatus = car.status === 'available' ? 'unavailable' : 'available';
        await car.update({ status: newStatus });
        const io = req.app.get('io');
        if (newStatus === 'available') io.emit('rental_car_available', { carId: car.id, lat: car.pickup_lat, lng: car.pickup_lng });
        else io.emit('rental_car_unavailable', { carId: car.id });
        res.json({ message: 'Car is now ' + newStatus, car });
    } catch (error) {
        res.status(500).json({ error: 'Failed to toggle car availability' });
    }
});

// DELETE /api/rentals/cars/:id  — soft delete
router.delete('/cars/:id', [auth, requireRole('rental_owner')], async (req, res) => {
    try {
        const car = await RentalCar.findOne({ where: { id: req.params.id, owner_id: req.user.id, is_active: true } });
        if (!car) return res.status(404).json({ error: 'Car not found' });
        const activeBooking = await RentalBooking.findOne({ where: { rental_car_id: car.id, status: 'active' } });
        if (activeBooking) return res.status(400).json({ error: 'Cannot delete a car with an active booking' });
        await car.update({ is_active: false, status: 'unavailable' });
        const io = req.app.get('io');
        io.emit('rental_car_unavailable', { carId: car.id });
        res.json({ message: 'Car listing removed' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete car' });
    }
});

// ── Booking Endpoints ─────────────────────────────────────────────────────────

// POST /api/rentals/bookings  — request a booking
router.post('/bookings', [auth, requireRole('renter')], [
    body('rental_car_id').isUUID(),
    body('requested_start').isISO8601(),
    body('requested_end').isISO8601()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        const { rental_car_id, requested_start, requested_end, notes } = req.body;
        const car = await RentalCar.findOne({ where: { id: rental_car_id, status: 'available', is_active: true } });
        if (!car) return res.status(404).json({ error: 'Car not available' });
        if (car.owner_id === req.user.id) return res.status(400).json({ error: 'You cannot rent your own car' });
        const startDate = new Date(requested_start);
        const endDate = new Date(requested_end);
        if (endDate <= startDate) return res.status(400).json({ error: 'End must be after start' });
        const durationHours = (endDate - startDate) / 3600000;
        if (durationHours < car.minimum_hours) return res.status(400).json({ error: 'Minimum rental is ' + car.minimum_hours + ' hour(s)' });
        const conflict = await hasOverlap(rental_car_id, requested_start, requested_end);
        if (conflict) return res.status(409).json({ error: 'Car is not available for the selected dates' });
        const commissionRate = await getCommissionRate('rental', 0);
        const price = calcPrice(car, requested_start, requested_end, commissionRate);
        const booking = await RentalBooking.create({
            renter_id: req.user.id, rental_car_id, owner_id: car.owner_id,
            requested_start: startDate, requested_end: endDate,
            total_hours: price.totalHours, base_price: price.basePrice,
            deposit_amount: price.depositAmount, platform_fee: price.platformFee,
            owner_earnings: price.ownerEarnings, total_charged: price.totalCharged,
            notes
        });
        // Notify owner (socket + push)
        const io = req.app.get('io');
        io.to('user_' + car.owner_id).emit('rental_booking_request', {
            bookingId: booking.id, renterName: req.user.name, renterPhone: req.user.phone,
            carId: car.id, carName: car.make + ' ' + car.model,
            start: requested_start, end: requested_end, totalCharged: price.totalCharged
        });
        const owner = await User.findByPk(car.owner_id, { attributes: ['push_token'] });
        push.rentalBookingRequest(owner, booking.id, req.user.name);
        res.status(201).json({ message: 'Booking request sent to owner', booking, price });
    } catch (error) {
        console.error('Create booking error:', error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

// GET /api/rentals/bookings/mine  — renter's bookings
router.get('/bookings/mine', [auth, requireRole('renter')], async (req, res) => {
    try {
        const bookings = await RentalBooking.findAll({
            where: { renter_id: req.user.id },
            include: [
                { model: RentalCar, as: 'rentalCar', attributes: ['id', 'make', 'model', 'year', 'color', 'photos', 'pickup_address', 'pickup_lat', 'pickup_lng', 'pickup_instructions'] },
                { model: User, as: 'owner', attributes: ['id', 'name', 'phone', 'rating'] }
            ],
            order: [['created_at', 'DESC']]
        });
        res.json({ bookings });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// GET /api/rentals/bookings/received  — owner's received bookings
router.get('/bookings/received', [auth, requireRole('rental_owner')], async (req, res) => {
    try {
        const bookings = await RentalBooking.findAll({
            where: { owner_id: req.user.id },
            include: [
                { model: RentalCar, as: 'rentalCar', attributes: ['id', 'make', 'model', 'year', 'color', 'photos'] },
                { model: User, as: 'renter', attributes: ['id', 'name', 'phone', 'rating', 'profile_photo'] }
            ],
            order: [['created_at', 'DESC']]
        });
        res.json({ bookings });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch received bookings' });
    }
});

// GET /api/rentals/bookings/:id
router.get('/bookings/:id', auth, async (req, res) => {
    try {
        const booking = await RentalBooking.findOne({
            where: { id: req.params.id, [Op.or]: [{ renter_id: req.user.id }, { owner_id: req.user.id }] },
            include: [
                { model: RentalCar, as: 'rentalCar' },
                { model: User, as: 'renter', attributes: ['id', 'name', 'phone', 'rating', 'profile_photo'] },
                { model: User, as: 'owner', attributes: ['id', 'name', 'phone', 'rating', 'profile_photo'] }
            ]
        });
        if (!booking) return res.status(404).json({ error: 'Booking not found' });
        res.json({ booking });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch booking' });
    }
});

// POST /api/rentals/bookings/:id/approve  — owner approves
router.post('/bookings/:id/approve', [auth, requireRole('rental_owner')], async (req, res) => {
    try {
        const booking = await RentalBooking.findOne({ where: { id: req.params.id, owner_id: req.user.id, status: 'requested' }, include: [{ model: RentalCar, as: 'rentalCar' }] });
        if (!booking) return res.status(404).json({ error: 'Booking not found or not pending' });
        // Reject any other overlapping pending bookings for this car
        await RentalBooking.update(
            { status: 'rejected', cancellation_reason: 'Another booking was approved for this period' },
            { where: { rental_car_id: booking.rental_car_id, id: { [Op.ne]: booking.id }, status: 'requested', [Op.not]: [{ [Op.or]: [{ requested_end: { [Op.lte]: booking.requested_start } }, { requested_start: { [Op.gte]: booking.requested_end } }] }] } }
        );
        await booking.update({ status: 'approved', confirmed_start: booking.requested_start, confirmed_end: booking.requested_end, payment_status: 'held' });
        const io = req.app.get('io');
        io.to('user_' + booking.renter_id).emit('rental_booking_approved', {
            bookingId: booking.id, carName: booking.rentalCar.make + ' ' + booking.rentalCar.model,
            start: booking.confirmed_start, end: booking.confirmed_end,
            pickup_address: booking.rentalCar.pickup_address, pickup_instructions: booking.rentalCar.pickup_instructions
        });
        const renterForApprove = await User.findByPk(booking.renter_id, { attributes: ['push_token'] });
        push.rentalApproved(renterForApprove, booking.id);
        res.json({ message: 'Booking approved', booking });
    } catch (error) {
        res.status(500).json({ error: 'Failed to approve booking' });
    }
});

// POST /api/rentals/bookings/:id/reject  — owner rejects
router.post('/bookings/:id/reject', [auth, requireRole('rental_owner')], async (req, res) => {
    try {
        const { reason } = req.body;
        const booking = await RentalBooking.findOne({ where: { id: req.params.id, owner_id: req.user.id, status: 'requested' } });
        if (!booking) return res.status(404).json({ error: 'Booking not found or not pending' });
        await booking.update({ status: 'rejected', cancellation_reason: reason || 'Owner declined the request' });
        const io = req.app.get('io');
        io.to('user_' + booking.renter_id).emit('rental_booking_rejected', { bookingId: booking.id, reason: booking.cancellation_reason });
        const renterForReject = await User.findByPk(booking.renter_id, { attributes: ['push_token'] });
        push.rentalRejected(renterForReject, booking.id);
        res.json({ message: 'Booking rejected', booking });
    } catch (error) {
        res.status(500).json({ error: 'Failed to reject booking' });
    }
});

// POST /api/rentals/bookings/:id/cancel  — renter cancels
router.post('/bookings/:id/cancel', [auth, requireRole('renter')], async (req, res) => {
    try {
        const { reason } = req.body;
        const booking = await RentalBooking.findOne({ where: { id: req.params.id, renter_id: req.user.id, status: { [Op.in]: ['requested', 'approved'] } } });
        if (!booking) return res.status(404).json({ error: 'Booking not found or cannot be cancelled' });
        await booking.update({ status: 'cancelled', cancellation_reason: reason || 'Cancelled by renter', payment_status: 'refunded' });
        const io = req.app.get('io');
        io.to('user_' + booking.owner_id).emit('rental_booking_cancelled', { bookingId: booking.id, renterName: req.user.name });
        res.json({ message: 'Booking cancelled', booking });
    } catch (error) {
        res.status(500).json({ error: 'Failed to cancel booking' });
    }
});

// POST /api/rentals/bookings/:id/start  — owner hands over car (marks active)
router.post('/bookings/:id/start', [auth, requireRole('rental_owner')], async (req, res) => {
    try {
        const booking = await RentalBooking.findOne({ where: { id: req.params.id, owner_id: req.user.id, status: 'approved' }, include: [{ model: RentalCar, as: 'rentalCar' }] });
        if (!booking) return res.status(404).json({ error: 'Booking not found or not approved' });
        await booking.update({ status: 'active', payment_status: 'held' });
        await booking.rentalCar.update({ status: 'rented' });
        const io = req.app.get('io');
        io.to('user_' + booking.renter_id).emit('rental_started', { bookingId: booking.id, message: 'Your rental has started. Enjoy your drive!' });
        io.emit('rental_car_unavailable', { carId: booking.rental_car_id });
        const renterForStart = await User.findByPk(booking.renter_id, { attributes: ['push_token'] });
        push.rentalStarted(renterForStart, booking.id);
        res.json({ message: 'Rental started', booking });
    } catch (error) {
        res.status(500).json({ error: 'Failed to start rental' });
    }
});

// POST /api/rentals/bookings/:id/complete  — mark car returned
router.post('/bookings/:id/complete', auth, async (req, res) => {
    try {
        const booking = await RentalBooking.findOne({
            where: { id: req.params.id, status: 'active', [Op.or]: [{ owner_id: req.user.id }, { renter_id: req.user.id }] },
            include: [{ model: RentalCar, as: 'rentalCar' }]
        });
        if (!booking) return res.status(404).json({ error: 'Active booking not found' });
        const returnTime = new Date();
        await booking.update({ status: 'completed', actual_return_time: returnTime, payment_status: 'released' });
        await booking.rentalCar.update({ status: 'available' });

        // Create payment record and credit owner earnings
        await RentalPayment.create({
            booking_id: booking.id,
            amount: booking.base_price,
            commission: booking.platform_fee,
            owner_earnings: booking.owner_earnings,
            status: 'completed',
            completed_at: returnTime
        });

        // ── Auto-debit renter wallet ──────────────────────────────────────────
        const rentalAmount = parseFloat(booking.base_price);
        try {
            const renterWallet = await getOrCreateWallet(booking.renter_id);
            if (parseFloat(renterWallet.balance) >= rentalAmount) {
                const newRenterBal = parseFloat(renterWallet.balance) - rentalAmount;
                await renterWallet.update({ balance: newRenterBal });
                await WalletTransaction.create({
                    wallet_id:    renterWallet.id,
                    type:         'debit',
                    amount:       rentalAmount,
                    balance_after: newRenterBal,
                    source:       'rental_payment',
                    reference:    booking.id,
                    status:       'completed',
                    description:  `Location terminée — paiement de ${rentalAmount.toFixed(0)} XAF`,
                    metadata:     { card_number: renterWallet.card_number },
                });
                // Award cashback points to renter
                await awardCashback(booking.renter_id, 'rental', rentalAmount, booking.id);
            }
            // insufficient balance → owner still paid from platform float; renter marked pending
        } catch (_) {}

        // ── Credit owner wallet ───────────────────────────────────────────────
        await User.increment('total_earnings', { by: booking.owner_earnings, where: { id: booking.owner_id } });
        try {
            const ownerWallet = await getOrCreateWallet(booking.owner_id);
            const newBal = parseFloat(ownerWallet.balance) + parseFloat(booking.owner_earnings);
            await ownerWallet.update({ balance: newBal });
            await WalletTransaction.create({
                wallet_id: ownerWallet.id,
                type: 'credit',
                amount: parseFloat(booking.owner_earnings),
                balance_after: newBal,
                source: 'rental_earning',
                reference: booking.id,
                status: 'completed',
                description: `Location terminée — gain de ${parseFloat(booking.owner_earnings).toFixed(0)} XAF`
            });
        } catch (_) {}

        const io = req.app.get('io');
        io.to('user_' + booking.renter_id).emit('rental_completed', { bookingId: booking.id });
        io.to('user_' + booking.owner_id).emit('rental_completed', { bookingId: booking.id });
        io.emit('rental_car_available', { carId: booking.rental_car_id, lat: booking.rentalCar.pickup_lat, lng: booking.rentalCar.pickup_lng });
        const [renterForComplete, ownerForComplete] = await Promise.all([
            User.findByPk(booking.renter_id, { attributes: ['push_token'] }),
            User.findByPk(booking.owner_id, { attributes: ['push_token'] }),
        ]);
        push.rentalCompleted(renterForComplete, booking.id);
        push.rentalCompleted(ownerForComplete, booking.id);
        res.json({ message: 'Rental completed successfully', booking });
    } catch (error) {
        res.status(500).json({ error: 'Failed to complete rental' });
    }
});

// POST /api/rentals/bookings/:id/rate  — rate the experience
router.post('/bookings/:id/rate', auth, [
    body('rating').isInt({ min: 1, max: 5 }),
    body('comment').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        const { rating, comment, categories } = req.body;
        const booking = await RentalBooking.findOne({ where: { id: req.params.id, status: 'completed', [Op.or]: [{ renter_id: req.user.id }, { owner_id: req.user.id }] } });
        if (!booking) return res.status(404).json({ error: 'Completed booking not found' });
        const updateData = {};
        let ratedUserId;
        if (req.user.id === booking.renter_id) {
            if (booking.owner_rating) return res.status(400).json({ error: 'Already rated' });
            updateData.owner_rating   = rating;
            updateData.owner_comment  = comment;
            ratedUserId = booking.owner_id;
        } else {
            if (booking.renter_rating) return res.status(400).json({ error: 'Already rated' });
            updateData.renter_rating  = rating;
            updateData.renter_comment = comment;
            ratedUserId = booking.renter_id;
        }
        await booking.update(updateData);
        await Rating.create({
            service_type:  'rental',
            service_id:    booking.id,
            rater_id:      req.user.id,
            rated_user_id: ratedUserId,
            rating,
            comment:    comment || null,
            categories: categories || null,
        });
        res.json({ message: 'Rating submitted', booking });
    } catch (error) {
        res.status(500).json({ error: 'Failed to submit rating' });
    }
});

module.exports = router;
