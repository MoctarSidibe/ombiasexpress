const express = require('express');
const { User, Vehicle, Ride, Payment, RentalCar, RentalBooking, RentalPayment, Setting, WalletFeature, Wallet, WalletTransaction, CommissionRule, CashbackRule, CashbackTransaction, DriverVerification, CarVerification, MerchantVerification, FleetVerification, CarListing, Product, Order, OrderItem, CourierVerification, Delivery, Rating, SupportTicket, SupportMessage, AdminRole, AdminStaff } = require('../models');
const { getAllSettings, updateSetting } = require('../services/settings.service');
const { auth, adminGate, superAdminOnly, requirePermission } = require('../middleware/auth.middleware');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { hashPassword } = require('../utils/helpers');
const push = require('../services/notifications.service');

const router = express.Router();

// Legacy alias — keeps existing route guards working; now allows staff too
const adminOnly = adminGate;

router.get('/stats', [auth, adminOnly], async (req, res) => {
    try {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const pendingKycStatuses     = ['submitted', 'under_review', 'appointment_scheduled'];
        const pendingKycStatusesBase = ['submitted', 'under_review'];

        const [
            totalUsers, totalDrivers, totalRiders, totalRenters, totalRentalOwners, onlineDrivers,
            totalRides, todayRides, completedRides, activeRides,
            rideCommission, todayRideCommission, totalVehicles, pendingVehicles,
            totalRentalCars, availableRentalCars, totalRentalBookings, activeRentals,
            rentalCommission, todayRentalCommission,
            pendingDriverKyc, pendingCarKyc, pendingMerchantKyc, pendingFleetKyc, pendingCourierKyc,
            totalWallets, totalWalletBalance, pendingCards, printingCards, shippedCards, deliveredCards,
            totalDeliveries, todayDeliveries, pendingDeliveries, activeDeliveries, completedDeliveries, cancelledDeliveries,
            deliveryRevenue, todayDeliveryRevenue,
        ] = await Promise.all([
            User.count(),
            User.count({ where: { role: 'driver' } }),
            User.count({ where: { role: 'rider' } }),
            User.count({ where: { role: 'renter' } }),
            User.count({ where: { role: 'rental_owner' } }),
            User.count({ where: { is_online: true, role: 'driver' } }),
            Ride.count(), Ride.count({ where: { created_at: { [Op.gte]: today } } }),
            Ride.count({ where: { status: 'completed' } }),
            Ride.count({ where: { status: { [Op.in]: ['requested', 'accepted', 'in_progress'] } } }),
            Payment.sum('commission'), Payment.sum('commission', { where: { created_at: { [Op.gte]: today } } }),
            Vehicle.count(), Vehicle.count({ where: { status: 'pending' } }),
            RentalCar.count({ where: { is_active: true } }),
            RentalCar.count({ where: { status: 'available', is_active: true } }),
            RentalBooking.count(),
            RentalBooking.count({ where: { status: 'active' } }),
            RentalPayment.sum('commission'), RentalPayment.sum('commission', { where: { created_at: { [Op.gte]: today } } }),
            DriverVerification.count({ where: { status: { [Op.in]: pendingKycStatuses } } }),
            CarVerification.count({ where: { status: { [Op.in]: pendingKycStatusesBase } } }),
            MerchantVerification.count({ where: { status: { [Op.in]: pendingKycStatusesBase } } }),
            FleetVerification.count({ where: { status: { [Op.in]: pendingKycStatusesBase } } }),
            CourierVerification.count({ where: { status: { [Op.in]: pendingKycStatusesBase } } }),
            Wallet.count().catch(() => 0),
            Wallet.sum('balance').catch(() => 0),
            Wallet.count({ where: { physical_card_status: 'pending' } }).catch(() => 0),
            Wallet.count({ where: { physical_card_status: 'printing' } }).catch(() => 0),
            Wallet.count({ where: { physical_card_status: 'shipped' } }).catch(() => 0),
            Wallet.count({ where: { physical_card_status: 'delivered' } }).catch(() => 0),
            Delivery.count(),
            Delivery.count({ where: { created_at: { [Op.gte]: today } } }),
            Delivery.count({ where: { status: 'pending' } }),
            Delivery.count({ where: { status: { [Op.in]: ['accepted', 'picked_up'] } } }),
            Delivery.count({ where: { status: 'delivered' } }),
            Delivery.count({ where: { status: 'cancelled' } }),
            Delivery.sum('fare', { where: { status: 'delivered' } }),
            Delivery.sum('fare', { where: { status: 'delivered', created_at: { [Op.gte]: today } } }),
        ]);

        const revenueByPayment = await Payment.findAll({
            attributes: [
                'payment_method',
                [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
            ],
            group: ['payment_method'],
        });

        const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const ridesPerDay = await Ride.findAll({
            attributes: [
                [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
            ],
            where:  { created_at: { [Op.gte]: sevenDaysAgo } },
            group:  [sequelize.fn('DATE', sequelize.col('created_at'))],
            order:  [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']],
        });

        const totalCommission = (rideCommission || 0) + (rentalCommission || 0);
        const todayCommission = (todayRideCommission || 0) + (todayRentalCommission || 0);
        const totalPendingKyc = pendingDriverKyc + pendingCarKyc + pendingMerchantKyc + (pendingFleetKyc || 0) + (pendingCourierKyc || 0);

        res.json({
            users:   { total: totalUsers, drivers: totalDrivers, riders: totalRiders, renters: totalRenters, rentalOwners: totalRentalOwners, onlineDrivers },
            rides:   { total: totalRides, today: todayRides, completed: completedRides, active: activeRides, perDay: ridesPerDay },
            revenue: {
                total:                totalCommission,
                today:                todayCommission,
                rideCommission:       rideCommission || 0,
                todayRideCommission:  todayRideCommission || 0,
                rentalCommission:     rentalCommission || 0,
                todayRentalCommission: todayRentalCommission || 0,
                byPaymentMethod:      revenueByPayment,
            },
            vehicles: { total: totalVehicles, pending: pendingVehicles },
            rentals:  { total: totalRentalCars, available: availableRentalCars, totalBookings: totalRentalBookings, activeBookings: activeRentals },
            kyc: {
                pendingDrivers:   pendingDriverKyc,
                pendingCars:      pendingCarKyc,
                pendingMerchants: pendingMerchantKyc,
                pendingFleet:     pendingFleetKyc || 0,
                pendingCouriers:  pendingCourierKyc || 0,
                total:            totalPendingKyc,
            },
            deliveries: {
                total:      totalDeliveries     || 0,
                today:      todayDeliveries     || 0,
                pending:    pendingDeliveries   || 0,
                active:     activeDeliveries    || 0,
                completed:  completedDeliveries || 0,
                cancelled:  cancelledDeliveries || 0,
                revenue:    deliveryRevenue     || 0,
                todayRevenue: todayDeliveryRevenue || 0,
            },
            wallets: {
                total:          totalWallets   || 0,
                totalBalance:   totalWalletBalance || 0,
                pendingCards:   pendingCards   || 0,
                printingCards:  printingCards  || 0,
                shippedCards:   shippedCards   || 0,
                deliveredCards: deliveredCards || 0,
                inProduction:   (pendingCards || 0) + (printingCards || 0) + (shippedCards || 0),
            },
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

router.get('/users', [auth, adminOnly], async (req, res) => {
    try {
        const { page = 1, limit = 20, role, search } = req.query;
        const offset = (page - 1) * limit;
        const where = {};
        if (role) where.role = role;
        if (search) {
            where[Op.or] = [
                { name: { [Op.iLike]: '%' + search + '%' } },
                { email: { [Op.iLike]: '%' + search + '%' } },
                { phone: { [Op.iLike]: '%' + search + '%' } }
            ];
        }
        const { count, rows: users } = await User.findAndCountAll({
            where, attributes: { exclude: ['password_hash'] },
            order: [['created_at', 'DESC']], limit: parseInt(limit), offset: parseInt(offset)
        });

        // Fetch KYC verification status for all users on this page
        const userIds = users.map(u => u.id);
        const [driverVerifs, carVerifs, fleetVerifs, merchantVerifs] = await Promise.all([
            DriverVerification.findAll({ where: { user_id: { [Op.in]: userIds } }, attributes: ['user_id', 'status'] }),
            CarVerification.findAll({ where: { user_id: { [Op.in]: userIds } }, attributes: ['user_id', 'status'] }),
            FleetVerification.findAll({ where: { user_id: { [Op.in]: userIds } }, attributes: ['user_id', 'status'] }),
            MerchantVerification.findAll({ where: { user_id: { [Op.in]: userIds } }, attributes: ['user_id', 'merchant_type', 'status'] }),
        ]);

        // Build kyc map by user_id
        const kycMap = {};
        driverVerifs.forEach(v => { kycMap[v.user_id] = kycMap[v.user_id] || {}; kycMap[v.user_id].driver = v.status; });
        carVerifs.forEach(v => { kycMap[v.user_id] = kycMap[v.user_id] || {}; kycMap[v.user_id].rental_owner = v.status; });
        fleetVerifs.forEach(v => { kycMap[v.user_id] = kycMap[v.user_id] || {}; kycMap[v.user_id].fleet_owner = v.status; });
        merchantVerifs.forEach(v => { kycMap[v.user_id] = kycMap[v.user_id] || {}; kycMap[v.user_id][v.merchant_type] = v.status; });

        const usersWithKyc = users.map(u => ({
            ...u.toJSON(),
            kyc: kycMap[u.id] || {},
        }));

        res.json({ users: usersWithKyc, pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) } });
    } catch (error) { res.status(500).json({ error: 'Failed to fetch users' }); }
});

router.put('/users/:id/status', [auth, adminOnly], async (req, res) => {
    try {
        const { is_active } = req.body;
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        await user.update({ is_active });
        res.json({ message: 'User ' + (is_active ? 'activated' : 'deactivated') + ' successfully', user: { id: user.id, name: user.name, is_active: user.is_active } });
    } catch (error) { res.status(500).json({ error: 'Failed to update user status' }); }
});

router.get('/vehicles', [auth, adminOnly], async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const offset = (page - 1) * limit;
        const where = {};
        if (status) where.status = status;
        const { count, rows: vehicles } = await Vehicle.findAndCountAll({
            where, include: [{ model: User, as: 'driver', attributes: ['id', 'name', 'email', 'phone', 'rating'] }],
            order: [['created_at', 'DESC']], limit: parseInt(limit), offset: parseInt(offset)
        });
        res.json({ vehicles, pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) } });
    } catch (error) { res.status(500).json({ error: 'Failed to fetch vehicles' }); }
});

router.put('/vehicles/:id/status', [auth, adminOnly], async (req, res) => {
    try {
        const { status } = req.body;
        if (!['approved', 'rejected', 'suspended'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
        const vehicle = await Vehicle.findByPk(req.params.id, { include: [{ model: User, as: 'driver' }] });
        if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
        await vehicle.update({ status });
        const io = req.app.get('io');
        if (vehicle.driver) {
            io.to('user_' + vehicle.driver.id).emit('vehicle_status_changed', { vehicleId: vehicle.id, status });
            if (status === 'approved')  push.vehicleApproved(vehicle.driver, vehicle.id);
            if (status === 'rejected')  push.vehicleRejected(vehicle.driver, vehicle.id);
            if (status === 'suspended') push.vehicleSuspended(vehicle.driver, vehicle.id);
        }
        res.json({ message: 'Vehicle ' + status + ' successfully', vehicle });
    } catch (error) { res.status(500).json({ error: 'Failed to update vehicle status' }); }
});

router.get('/rides', [auth, adminOnly], async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const offset = (page - 1) * limit;
        const where = {};
        if (status) where.status = status;
        const { count, rows: rides } = await Ride.findAndCountAll({
            where,
            include: [
                { model: User, as: 'rider', attributes: ['id', 'name', 'phone'] },
                { model: User, as: 'driver', attributes: ['id', 'name', 'phone'] },
                { model: Vehicle, as: 'vehicle' },
                { model: Payment, as: 'payment' }
            ],
            order: [['created_at', 'DESC']], limit: parseInt(limit), offset: parseInt(offset)
        });
        res.json({ rides, pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) } });
    } catch (error) { res.status(500).json({ error: 'Failed to fetch rides' }); }
});

// ── Rental Admin Routes ───────────────────────────────────────────────────────
router.get('/rentals/cars', [auth, adminOnly], async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const offset = (page - 1) * limit;
        const where = { is_active: true };
        if (status) where.status = status;
        const { count, rows: cars } = await RentalCar.findAndCountAll({
            where, include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email', 'phone', 'rating'] }],
            order: [['created_at', 'DESC']], limit: parseInt(limit), offset: parseInt(offset)
        });
        res.json({ cars, pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) } });
    } catch (error) { res.status(500).json({ error: 'Failed to fetch rental cars' }); }
});

router.put('/rentals/cars/:id/status', [auth, adminOnly], async (req, res) => {
    try {
        const { status, admin_notes } = req.body;
        if (!['available', 'suspended', 'pending_approval'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
        const car = await RentalCar.findByPk(req.params.id);
        if (!car) return res.status(404).json({ error: 'Rental car not found' });
        const updateData = { status };
        if (admin_notes) updateData.admin_notes = admin_notes;
        await car.update(updateData);
        const io = req.app.get('io');
        if (status === 'available') io.to('user_' + car.owner_id).emit('rental_car_approved', { carId: car.id, make: car.make, model: car.model });
        if (status === 'suspended') io.to('user_' + car.owner_id).emit('rental_car_suspended', { carId: car.id, admin_notes });
        // Push notification to owner
        const owner = await User.findByPk(car.owner_id);
        if (owner) {
            if (status === 'available') push.rentalCarApproved(owner, car.id, car.make, car.model);
            if (status === 'suspended') push.rentalCarSuspended(owner, car.id, admin_notes);
        }
        res.json({ message: 'Rental car ' + status, car });
    } catch (error) { res.status(500).json({ error: 'Failed to update rental car status' }); }
});

router.get('/rentals/bookings', [auth, adminOnly], async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const offset = (page - 1) * limit;
        const where = {};
        if (status) where.status = status;
        const { count, rows: bookings } = await RentalBooking.findAndCountAll({
            where,
            include: [
                { model: User, as: 'renter', attributes: ['id', 'name', 'phone', 'email'] },
                { model: User, as: 'owner', attributes: ['id', 'name', 'phone', 'email'] },
                { model: RentalCar, as: 'rentalCar', attributes: ['id', 'make', 'model', 'year', 'license_plate'] }
            ],
            order: [['created_at', 'DESC']], limit: parseInt(limit), offset: parseInt(offset)
        });
        res.json({ bookings, pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) } });
    } catch (error) { res.status(500).json({ error: 'Failed to fetch rental bookings' }); }
});

// ── Settings Routes ───────────────────────────────────────────────────────────

// GET /api/admin/settings — list all platform settings
router.get('/settings', [auth, adminOnly], async (req, res) => {
    try {
        const settings = await getAllSettings();
        res.json({ settings });
    } catch (error) { res.status(500).json({ error: 'Failed to fetch settings' }); }
});

// PUT /api/admin/settings/:key — update a setting value
router.put('/settings/:key', [auth, adminOnly], async (req, res) => {
    try {
        const { value } = req.body;
        if (value === undefined || value === null || String(value).trim() === '') {
            return res.status(400).json({ error: 'Value is required' });
        }
        const setting = await Setting.findOne({ where: { key: req.params.key } });
        if (!setting) return res.status(404).json({ error: 'Setting not found' });

        // Validate commission rate is a valid percentage
        if (req.params.key.includes('commission_rate')) {
            const num = parseFloat(value);
            if (isNaN(num) || num < 0 || num > 100) {
                return res.status(400).json({ error: 'Commission rate must be between 0 and 100' });
            }
        }

        await updateSetting(req.params.key, value);
        res.json({ message: 'Setting updated successfully', key: req.params.key, value: String(value) });
    } catch (error) { res.status(500).json({ error: 'Failed to update setting' }); }
});

// Bug Fix: secured with ADMIN_SECRET env variable
router.post('/create', async (req, res) => {
    try {
        const { email, password, name, phone, admin_secret } = req.body;
        const expectedSecret = process.env.ADMIN_SECRET;
        if (!expectedSecret || admin_secret !== expectedSecret) return res.status(403).json({ error: 'Invalid admin secret' });
        const existingAdmin = await User.findOne({ where: { email } });
        if (existingAdmin) return res.status(400).json({ error: 'Email already registered' });
        const passwordHash = await hashPassword(password);
        const admin = await User.create({ name, email, phone: phone || '0000000000', password_hash: passwordHash, role: 'admin', is_verified: true });
        res.status(201).json({ message: 'Admin created successfully', admin: { id: admin.id, name: admin.name, email: admin.email } });
    } catch (error) { res.status(500).json({ error: 'Failed to create admin' }); }
});

// ══════════════════════════════════════════════════════════════════════════════
//  WALLET MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════


// GET /admin/wallets — all user wallets with owner info
router.get('/wallets', [auth, adminOnly], async (req, res) => {
    try {
        const { page = 1, limit = 30, card_status, search } = req.query;
        const offset = (page - 1) * limit;

        const userWhere = {};
        if (search) {
            userWhere[Op.or] = [
                { name:  { [Op.iLike]: `%${search}%` } },
                { email: { [Op.iLike]: `%${search}%` } },
                { phone: { [Op.iLike]: `%${search}%` } },
            ];
        }
        const walletWhere = {};
        if (card_status) walletWhere.physical_card_status = card_status;

        const { count, rows } = await Wallet.findAndCountAll({
            where: walletWhere,
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'], where: userWhere }],
            order: [['balance', 'DESC']],
            limit: parseInt(limit),
            offset,
        });

        // Stats
        const [totalBalance, totalWallets, pendingCards] = await Promise.all([
            Wallet.sum('balance') || 0,
            Wallet.count(),
            Wallet.count({ where: { physical_card_status: { [Op.in]: ['pending', 'printing', 'shipped'] } } }),
        ]);

        res.json({ wallets: rows, total: count, stats: { totalBalance, totalWallets, pendingCards } });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /admin/wallets/:id/transactions — transaction history for one wallet
router.get('/wallets/:id/transactions', [auth, adminOnly], async (req, res) => {
    try {
        const wallet = await Wallet.findByPk(req.params.id, {
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
        });
        if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

        const transactions = await WalletTransaction.findAll({
            where: { wallet_id: req.params.id },
            order: [['created_at', 'DESC']],
            limit: 50,
        });
        res.json({ wallet, transactions });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /admin/wallets/:id/card-status — update physical card delivery status
router.put('/wallets/:id/card-status', [auth, adminOnly], async (req, res) => {
    try {
        const { status } = req.body;
        const allowed = ['none', 'pending', 'printing', 'shipped', 'delivered'];
        if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
        const wallet = await Wallet.findByPk(req.params.id, {
            include: [{ model: User, as: 'user', attributes: ['id', 'push_token'] }],
        });
        if (!wallet) return res.status(404).json({ error: 'Not found' });
        await wallet.update({ physical_card_status: status });
        const io = req.app.get('io');
        if (wallet.user) {
            io.to('user_' + wallet.user.id).emit('card_status_changed', { walletId: wallet.id, status });
            if (['printing', 'shipped', 'delivered'].includes(status)) {
                push.cardStatusChanged(wallet.user, status);
            }
        }
        res.json({ wallet });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /admin/wallets/card-queue — cards awaiting production (pending/printing/shipped)
router.get('/wallets/card-queue', [auth, adminOnly], async (req, res) => {
    try {
        const { status } = req.query; // optional filter
        const where = { physical_card_requested: true };
        if (status && status !== 'all') {
            where.physical_card_status = status;
        } else if (!status) {
            where.physical_card_status = { [Op.in]: ['pending', 'printing', 'shipped'] };
        }
        // status === 'all' → no filter, show all including delivered
        const cards = await Wallet.findAll({
            where,
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }],
            order: [['updated_at', 'ASC']], // oldest first (FIFO queue)
        });
        // Attach delivery metadata from the latest physical card request transaction
        const cardIds = cards.map(c => c.id);
        const txMeta = await WalletTransaction.findAll({
            where: { wallet_id: cardIds, source: 'cash', description: { [Op.iLike]: '%carte physique%' } },
            order: [['created_at', 'DESC']],
        });
        const metaByWallet = {};
        txMeta.forEach(tx => { if (!metaByWallet[tx.wallet_id]) metaByWallet[tx.wallet_id] = tx.metadata; });

        const result = cards.map(c => ({
            ...c.toJSON(),
            delivery_meta: metaByWallet[c.id] || null,
        }));

        const stats = {
            pending:   cards.filter(c => c.physical_card_status === 'pending').length,
            printing:  cards.filter(c => c.physical_card_status === 'printing').length,
            shipped:   cards.filter(c => c.physical_card_status === 'shipped').length,
            delivered: cards.filter(c => c.physical_card_status === 'delivered').length,
        };
        res.json({ cards: result, stats });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /admin/wallets/:id/assign-nfc — assign NFC UID to wallet + advance to printing
router.put('/wallets/:id/assign-nfc', [auth, adminOnly], async (req, res) => {
    try {
        const { nfc_card_uid, advance_status } = req.body;
        if (!nfc_card_uid || nfc_card_uid.trim().length < 4) {
            return res.status(400).json({ error: 'nfc_card_uid requis (min 4 caractères)' });
        }
        // Check uniqueness
        const existing = await Wallet.findOne({ where: { nfc_card_uid: nfc_card_uid.trim() } });
        if (existing && existing.id !== req.params.id) {
            return res.status(409).json({ error: 'Cet UID NFC est déjà assigné à un autre portefeuille' });
        }
        const wallet = await Wallet.findByPk(req.params.id);
        if (!wallet) return res.status(404).json({ error: 'Portefeuille introuvable' });
        const updates = { nfc_card_uid: nfc_card_uid.trim() };
        if (advance_status) updates.physical_card_status = 'printing';
        await wallet.update(updates);
        res.json({ wallet });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /admin/wallets/:id/generate-nfc — auto-generate ISO 14443-A compatible NFC UID
router.post('/wallets/:id/generate-nfc', [auth, adminOnly], async (req, res) => {
    try {
        const wallet = await Wallet.findByPk(req.params.id);
        if (!wallet) return res.status(404).json({ error: 'Portefeuille introuvable' });
        // Generate 7-byte ISO 14443-A UID (04:XX:XX:XX:XX:XX:XX)
        // 04 = NXP/MIFARE manufacturer prefix (standard for emulated/generated UIDs)
        const crypto = require('crypto');
        const bytes = crypto.randomBytes(6);
        const uid = '04:' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(':');
        // Ensure uniqueness (retry once if collision)
        const existing = await Wallet.findOne({ where: { nfc_card_uid: uid } });
        if (existing) {
            const b2 = crypto.randomBytes(6);
            const uid2 = '04:' + Array.from(b2).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(':');
            await wallet.update({ nfc_card_uid: uid2 });
            return res.json({ nfc_card_uid: uid2, wallet });
        }
        await wallet.update({ nfc_card_uid: uid });
        res.json({ nfc_card_uid: uid, wallet });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /admin/wallets/:id/print-data — structured data for Evolis card printer
router.get('/wallets/:id/print-data', [auth, adminOnly], async (req, res) => {
    try {
        const wallet = await Wallet.findByPk(req.params.id, {
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }],
        });
        if (!wallet) return res.status(404).json({ error: 'Portefeuille introuvable' });
        // Fetch delivery metadata
        const tx = await WalletTransaction.findOne({
            where: { wallet_id: wallet.id, description: { [Op.iLike]: '%carte physique%' } },
            order: [['created_at', 'DESC']],
        });
        const meta = tx?.metadata || {};
        // Format card number for printing (groups of 4)
        const cn = wallet.card_number || '';
        const formattedCard = cn.match(/.{1,4}/g)?.join(' ') || cn;
        res.json({
            print_job: {
                job_id:       `OMBIA-${wallet.id.slice(0, 8).toUpperCase()}`,
                generated_at: new Date().toISOString(),
                printer:      'Evolis',
                card: {
                    holder_name:     (meta.full_name || wallet.user?.name || '').toUpperCase(),
                    card_number:     wallet.card_number,
                    card_number_fmt: formattedCard,
                    expiry:          `${new Date().getMonth() + 1 < 10 ? '0' : ''}${new Date().getMonth() + 1}/${new Date().getFullYear() + 4}`,
                    nfc_uid:         wallet.nfc_card_uid || null,
                    currency:        wallet.currency,
                    card_type:       'OMBIA EXPRESS',
                    logo_text:       'OMBIA',
                },
                delivery: {
                    full_name: meta.full_name || wallet.user?.name,
                    phone:     meta.phone     || wallet.user?.phone,
                    address:   meta.address   || null,
                    method:    meta.payment_method || null,
                },
                nfc_encode: wallet.nfc_card_uid ? {
                    uid:  wallet.nfc_card_uid,
                    data: JSON.stringify({ uid: wallet.nfc_card_uid, card: wallet.card_number, uid_user: wallet.user_id }),
                    standard: 'ISO/IEC 14443-A',
                } : null,
            },
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /admin/wallets/batch-print — generate batch print manifest for multiple cards
router.post('/wallets/batch-print', [auth, adminOnly], async (req, res) => {
    try {
        const { wallet_ids } = req.body;
        if (!Array.isArray(wallet_ids) || wallet_ids.length === 0) {
            return res.status(400).json({ error: 'wallet_ids array requis' });
        }
        const wallets = await Wallet.findAll({
            where: { id: { [Op.in]: wallet_ids } },
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }],
        });
        const jobs = wallets.map(w => {
            const cn = w.card_number || '';
            return {
                job_id:      `OMBIA-${w.id.slice(0, 8).toUpperCase()}`,
                holder_name: w.user?.name?.toUpperCase() || '',
                card_number: cn,
                card_number_fmt: cn.match(/.{1,4}/g)?.join(' ') || cn,
                nfc_uid:     w.nfc_card_uid || null,
                user_id:     w.user_id,
                card_status: w.physical_card_status,
            };
        });
        // Advance all to 'printing'
        await Wallet.update(
            { physical_card_status: 'printing' },
            { where: { id: { [Op.in]: wallet_ids }, physical_card_status: 'pending' } }
        );
        res.json({
            batch: {
                batch_id:     `BATCH-${Date.now()}`,
                generated_at: new Date().toISOString(),
                count:        jobs.length,
                printer:      'Evolis',
                jobs,
            },
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
//  COMMISSION RULES
// ══════════════════════════════════════════════════════════════════════════════

router.get('/commission-rules', [auth, adminOnly], async (req, res) => {
    try {
        // Only return the one default rule per service — no ambiguous multi-rule sets
        const rules = await CommissionRule.findAll({
            where: { is_default: true },
            order: [['service_type', 'ASC']],
        });
        res.json({ rules });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/commission-rules', [auth, adminOnly], async (req, res) => {
    try {
        const { service_type, name, rate, enabled, sort_order, description } = req.body;
        if (!service_type || rate === undefined) return res.status(400).json({ error: 'service_type and rate required' });
        if (rate < 0 || rate > 100) return res.status(400).json({ error: 'Rate must be 0–100' });
        // Prevent duplicate default rule for the same service
        const existing = await CommissionRule.findOne({ where: { service_type, is_default: true } });
        if (existing) {
            await existing.update({ rate, enabled: enabled !== false, name: name || existing.name });
            return res.json({ rule: existing });
        }
        const rule = await CommissionRule.create({ service_type, name: name || service_type, rate, is_default: true, enabled: enabled !== false, sort_order: sort_order || 0, description });
        res.json({ rule });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/commission-rules/:id', [auth, adminOnly], async (req, res) => {
    try {
        const rule = await CommissionRule.findByPk(req.params.id);
        if (!rule) return res.status(404).json({ error: 'Not found' });
        const { name, rate, min_amount, max_amount, is_default, enabled, sort_order, description } = req.body;
        if (rate !== undefined && (rate < 0 || rate > 100)) return res.status(400).json({ error: 'Rate must be 0–100' });
        await rule.update({ name, rate, min_amount: min_amount || null, max_amount: max_amount || null, is_default, enabled, sort_order, description });
        res.json({ rule });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/commission-rules/:id', [auth, adminOnly], async (req, res) => {
    try {
        const rule = await CommissionRule.findByPk(req.params.id);
        if (!rule) return res.status(404).json({ error: 'Not found' });
        if (rule.is_default) return res.status(400).json({ error: 'Cannot delete default rule — edit it instead' });
        await rule.destroy();
        res.json({ message: 'Deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
//  CASHBACK RULES
// ══════════════════════════════════════════════════════════════════════════════

router.get('/cashback-rules', [auth, adminOnly], async (req, res) => {
    try {
        const rules = await CashbackRule.findAll({ order: [['service_type', 'ASC']] });
        const redemptionRate = await require('../services/settings.service').getSetting('cashback_redemption_rate', 100);
        res.json({ rules, redemption_rate: parseFloat(redemptionRate) });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/cashback-rules/:id', [auth, adminOnly], async (req, res) => {
    try {
        const rule = await CashbackRule.findByPk(req.params.id);
        if (!rule) return res.status(404).json({ error: 'Not found' });
        const { name, earn_rate, min_amount, expiry_days, enabled, description } = req.body;
        await rule.update({ name, earn_rate, min_amount, expiry_days, enabled, description });
        res.json({ rule });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update redemption rate (how many pts = 1 XAF)
router.put('/cashback-settings', [auth, adminOnly], async (req, res) => {
    try {
        const { redemption_rate } = req.body;
        if (!redemption_rate || redemption_rate < 1) return res.status(400).json({ error: 'redemption_rate must be ≥ 1' });
        await require('../services/settings.service').updateSetting('cashback_redemption_rate', String(redemption_rate));
        res.json({ message: 'Updated', redemption_rate });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Cashback stats for dashboard
router.get('/cashback-stats', [auth, adminOnly], async (req, res) => {
    try {
        const [totalEarned, totalRedeemed, activeUsers] = await Promise.all([
            CashbackTransaction.sum('points', { where: { type: 'earn' } }),
            CashbackTransaction.sum('points', { where: { type: 'redeem' } }),
            User.count({ where: { cashback_points: { [Op.gt]: 0 } } }),
        ]);
        res.json({ total_earned: totalEarned || 0, total_redeemed: totalRedeemed || 0, active_users: activeUsers || 0, outstanding: (totalEarned || 0) - (totalRedeemed || 0) });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
//  KYC — DRIVER VERIFICATIONS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/verifications/drivers', [auth, adminOnly], async (req, res) => {
    try {
        const { status, page = 1, limit = 30 } = req.query;
        const where = {};
        if (status) where.status = status;
        const { count, rows } = await DriverVerification.findAndCountAll({
            where,
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: (page - 1) * limit,
        });
        const stats = await Promise.all(
            ['submitted', 'under_review', 'appointment_scheduled', 'approved', 'rejected'].map(async s => ({
                status: s, count: await DriverVerification.count({ where: { status: s } })
            }))
        );
        res.json({ verifications: rows, total: count, stats });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/verifications/drivers/:id', [auth, adminOnly], async (req, res) => {
    try {
        const v = await DriverVerification.findByPk(req.params.id, {
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone', 'role', 'active_services'] }],
        });
        if (!v) return res.status(404).json({ error: 'Not found' });
        res.json({ verification: v });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/verifications/drivers/:id', [auth, adminOnly], async (req, res) => {
    try {
        const v = await DriverVerification.findByPk(req.params.id);
        if (!v) return res.status(404).json({ error: 'Not found' });

        const { status, admin_notes, rejection_reason, appointment_date, office_location } = req.body;

        await v.update({
            ...(status             && { status }),
            ...(admin_notes        !== undefined && { admin_notes }),
            ...(rejection_reason   !== undefined && { rejection_reason }),
            ...(appointment_date   && { appointment_date }),
            ...(office_location    && { office_location }),
            reviewed_at: new Date(),
            reviewed_by: req.user.name || req.user.email,
        });

        const io = req.app.get('io');
        // On approval: update user's active_services + role + push notification
        if (status === 'approved') {
            const user = await User.findByPk(v.user_id);
            if (user) {
                const services = Array.isArray(user.active_services) ? user.active_services : [user.role];
                if (!services.includes('driver')) services.push('driver');
                await user.update({ role: 'driver', active_services: services });
                io.to('user_' + user.id).emit('kyc_status_changed', { type: 'driver', status: 'approved' });
                push.kycApproved(user, 'driver');
            }
        } else if (status === 'rejected') {
            const user = await User.findByPk(v.user_id, { attributes: ['id', 'push_token'] });
            if (user) {
                io.to('user_' + user.id).emit('kyc_status_changed', { type: 'driver', status: 'rejected' });
                push.kycRejected(user, 'driver');
            }
        } else if (status) {
            io.to('user_' + v.user_id).emit('kyc_status_changed', { type: 'driver', status });
        }

        res.json({ verification: v });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
//  KYC — CAR VERIFICATIONS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/verifications/cars', [auth, adminOnly], async (req, res) => {
    try {
        const { status, page = 1, limit = 30 } = req.query;
        const where = {};
        if (status) where.status = status;
        const { count, rows } = await CarVerification.findAndCountAll({
            where,
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: (page - 1) * limit,
        });
        const stats = await Promise.all(
            ['submitted', 'under_review', 'approved', 'rejected'].map(async s => ({
                status: s, count: await CarVerification.count({ where: { status: s } })
            }))
        );
        res.json({ verifications: rows, total: count, stats });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/verifications/cars/:id', [auth, adminOnly], async (req, res) => {
    try {
        const v = await CarVerification.findByPk(req.params.id, {
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }],
        });
        if (!v) return res.status(404).json({ error: 'Not found' });
        res.json({ verification: v });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/verifications/cars/:id', [auth, adminOnly], async (req, res) => {
    try {
        const v = await CarVerification.findByPk(req.params.id, {
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone', 'role', 'active_services'] }],
        });
        if (!v) return res.status(404).json({ error: 'Not found' });

        const { status, admin_notes, rejection_reason } = req.body;

        await v.update({
            ...(status           && { status }),
            ...(admin_notes      !== undefined && { admin_notes }),
            ...(rejection_reason !== undefined && { rejection_reason }),
            reviewed_at: new Date(),
            reviewed_by: req.user.name || req.user.email,
        });

        // On approval: create RentalCar entry + update user's active_services
        if (status === 'approved' && !v.rental_car_id) {
            const car = await RentalCar.create({
                owner_id:     v.user_id,
                make:         v.make,
                model:        v.model,
                year:         v.year,
                color:        v.color,
                plate_number: v.plate_number,
                seats:        v.seats,
                fuel_type:    v.fuel_type,
                transmission: v.transmission,
                mileage:      v.mileage || 0,
                price_per_day:v.price_per_day,
                description:  v.description,
                status:       'available',
                images:       v.photos ? Object.values(v.photos).filter(Boolean) : [],
            });
            await v.update({ rental_car_id: car.id });

            // Update user active_services
            const user = await User.findByPk(v.user_id);
            if (user) {
                const services = Array.isArray(user.active_services) ? user.active_services : [user.role];
                if (!services.includes('rental_owner')) services.push('rental_owner');
                await user.update({ role: 'rental_owner', active_services: services });
            }
        }

        // Push notification + socket event to user
        if (status) {
            const io = req.app.get('io');
            io.to('user_' + v.user_id).emit('kyc_status_changed', { type: 'rental_owner', status });
            if (status === 'approved') push.kycApproved(v.user, 'rental_owner');
            if (status === 'rejected') push.kycRejected(v.user, 'rental_owner');
        }

        res.json({ verification: v });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
//  KYC — FLEET VERIFICATIONS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/verifications/fleet', [auth, adminOnly], async (req, res) => {
    try {
        const { status, page = 1, limit = 30 } = req.query;
        const where = {};
        if (status) where.status = status;
        const offset = (page - 1) * limit;
        const { rows: verifications, count: total } = await FleetVerification.findAndCountAll({
            where,
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }],
            order:  [['created_at', 'DESC']],
            limit:  parseInt(limit),
            offset: parseInt(offset),
        });
        const allStatuses = ['submitted', 'under_review', 'approved', 'rejected', 'draft'];
        const stats = await Promise.all(allStatuses.map(async s => ({
            status: s,
            count:  await FleetVerification.count({ where: { status: s } }),
        })));
        res.json({ verifications, total, stats });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/verifications/fleet/:id', [auth, adminOnly], async (req, res) => {
    try {
        const v = await FleetVerification.findByPk(req.params.id, {
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone', 'role', 'active_services'] }],
        });
        if (!v) return res.status(404).json({ error: 'Not found' });
        res.json({ verification: v });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/verifications/fleet/:id', [auth, adminOnly], async (req, res) => {
    try {
        const v = await FleetVerification.findByPk(req.params.id, {
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone', 'role', 'active_services'] }],
        });
        if (!v) return res.status(404).json({ error: 'Not found' });
        const { status, admin_notes, rejection_reason } = req.body;
        await v.update({
            ...(status           && { status, reviewed_at: new Date(), reviewed_by: req.user.id }),
            ...(admin_notes      !== undefined && { admin_notes }),
            ...(rejection_reason !== undefined && { rejection_reason }),
        });
        const io = req.app.get('io');
        if (status === 'approved') {
            const user = await User.findByPk(v.user_id);
            if (user) {
                const services = Array.isArray(user.active_services) ? user.active_services : ['rider', 'renter'];
                if (!services.includes('fleet_owner')) services.push('fleet_owner');
                await user.update({ role: 'fleet_owner', active_services: services });
                io.to('user_' + user.id).emit('kyc_status_changed', { type: 'fleet', status: 'approved' });
                push.kycApproved(user, 'fleet');
            }
        } else if (status === 'rejected') {
            const user = await User.findByPk(v.user_id, { attributes: ['id', 'push_token'] });
            if (user) {
                io.to('user_' + user.id).emit('kyc_status_changed', { type: 'fleet', status: 'rejected' });
                push.kycRejected(user, 'fleet');
            }
        } else if (status) {
            io.to('user_' + v.user_id).emit('kyc_status_changed', { type: 'fleet', status });
        }
        res.json({ verification: v });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
//  KYC — MERCHANT VERIFICATIONS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/verifications/merchants', [auth, adminOnly], async (req, res) => {
    try {
        const { status, merchant_type, page = 1, limit = 30 } = req.query;
        const where = {};
        if (status)        where.status        = status;
        if (merchant_type) where.merchant_type = merchant_type;

        const offset = (page - 1) * limit;
        const { rows: verifications, count: total } = await MerchantVerification.findAndCountAll({
            where,
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }],
            order:  [['created_at', 'DESC']],
            limit:  parseInt(limit),
            offset: parseInt(offset),
        });

        // Stats per status
        const allStatuses = ['submitted', 'under_review', 'approved', 'rejected', 'draft'];
        const stats = await Promise.all(allStatuses.map(async s => ({
            status: s,
            count:  await MerchantVerification.count({ where: { status: s } }),
        })));

        res.json({ verifications, total, stats });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/verifications/merchants/:id', [auth, adminOnly], async (req, res) => {
    try {
        const v = await MerchantVerification.findByPk(req.params.id, {
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone', 'role', 'active_services'] }],
        });
        if (!v) return res.status(404).json({ error: 'Not found' });
        res.json({ verification: v });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/verifications/merchants/:id', [auth, adminOnly], async (req, res) => {
    try {
        const v = await MerchantVerification.findByPk(req.params.id, {
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone', 'role', 'active_services'] }],
        });
        if (!v) return res.status(404).json({ error: 'Not found' });

        const { status, admin_notes, rejection_reason } = req.body;

        await v.update({
            ...(status           && { status, reviewed_at: new Date(), reviewed_by: req.user.id }),
            ...(admin_notes      !== undefined && { admin_notes }),
            ...(rejection_reason !== undefined && { rejection_reason }),
        });

        const io = req.app.get('io');
        // On approval — unlock the merchant service for the user + push
        if (status === 'approved') {
            const user = await User.findByPk(v.user_id);
            if (user) {
                const services = Array.isArray(user.active_services) ? user.active_services : [user.role];
                const serviceKey = v.merchant_type === 'partner' ? 'partner'
                    : v.merchant_type === 'store_owner' ? 'store_owner'
                    : 'car_seller';
                if (!services.includes(serviceKey)) services.push(serviceKey);
                await user.update({ active_services: services });
                io.to('user_' + user.id).emit('kyc_status_changed', { type: serviceKey, status: 'approved' });
                push.kycApproved(user, serviceKey);
            }
        } else if (status === 'rejected') {
            const user = await User.findByPk(v.user_id, { attributes: ['id', 'push_token'] });
            if (user) {
                io.to('user_' + user.id).emit('kyc_status_changed', { type: v.merchant_type || 'merchant', status: 'rejected' });
                push.kycRejected(user, v.merchant_type || 'merchant');
            }
        } else if (status) {
            io.to('user_' + v.user_id).emit('kyc_status_changed', { type: v.merchant_type || 'merchant', status });
        }

        res.json({ verification: v });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
//  CAR LISTINGS (admin management)
// ══════════════════════════════════════════════════════════════════════════════

router.get('/car-listings', [auth, adminOnly], async (req, res) => {
    try {
        const { status, page = 1, limit = 30 } = req.query;
        const where  = {};
        if (status) where.status = status;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const { rows: listings, count: total } = await CarListing.findAndCountAll({
            where,
            include: [{ model: User, as: 'seller', attributes: ['id', 'name', 'email', 'phone'] }],
            order:   [['created_at', 'DESC']],
            limit:   parseInt(limit),
            offset,
        });
        const allStatuses = ['active', 'sold', 'paused'];
        const stats = await Promise.all(allStatuses.map(async s => ({
            status: s, count: await CarListing.count({ where: { status: s } }),
        })));
        res.json({ listings, total, stats });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/car-listings/:id', [auth, adminOnly], async (req, res) => {
    try {
        const listing = await CarListing.findByPk(req.params.id);
        if (!listing) return res.status(404).json({ error: 'Not found' });
        const { status } = req.body;
        const prev = listing.status;
        await listing.update({ ...(status && { status }) });
        // Socket event + push notification to seller on status change
        if (status && status !== prev) {
            const io = req.app.get('io');
            io.to('user_' + listing.seller_id).emit('car_listing_status_changed', { listingId: listing.id, status });
            const seller = await User.findByPk(listing.seller_id);
            if (seller) {
                if (status === 'active')    push.carListingApproved(seller, listing.id);
                if (status === 'rejected')  push.carListingRejected(seller, listing.id);
            }
        }
        res.json({ listing });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Admin: Products ────────────────────────────────────────────────────────────

router.get('/products', [auth, adminOnly], async (req, res) => {
    try {
        const { status, page = 1, limit = 30 } = req.query;
        const where = {};
        if (status) where.status = status;
        const offset = (Number(page) - 1) * Number(limit);
        const { count, rows } = await Product.findAndCountAll({
            where,
            include: [{ model: User, as: 'seller', attributes: ['id', 'name', 'phone'] }],
            order: [['created_at', 'DESC']],
            limit: Number(limit),
            offset,
        });
        const statsRaw = await Product.findAll({
            attributes: ['status', [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']],
            group: ['status'],
            raw: true,
        });
        const stats = { active: 0, paused: 0, out_of_stock: 0 };
        statsRaw.forEach(r => { if (stats[r.status] !== undefined) stats[r.status] = Number(r.count); });
        res.json({ products: rows, total: count, stats });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/products/:id', [auth, adminOnly], async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) return res.status(404).json({ error: 'Not found' });
        const { status } = req.body;
        if (status) product.status = status;
        await product.save();
        res.json({ product });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Admin: Orders ─────────────────────────────────────────────────────────────

router.get('/orders', [auth, adminOnly], async (req, res) => {
    try {
        const { status, page = 1, limit = 30 } = req.query;
        const where = {};
        if (status) where.status = status;
        const offset = (Number(page) - 1) * Number(limit);

        const { count, rows } = await Order.findAndCountAll({
            where,
            include: [
                { model: User, as: 'buyer',  attributes: ['id', 'name', 'phone', 'email'] },
                { model: User, as: 'seller', attributes: ['id', 'name', 'phone', 'email'] },
                { model: OrderItem, as: 'items' },
            ],
            order: [['created_at', 'DESC']],
            limit: Number(limit),
            offset,
        });

        // Per-status counts + total revenue from delivered orders
        const statsRaw = await Order.findAll({
            attributes: [
                'status',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                [sequelize.fn('SUM', sequelize.col('total_amount')), 'revenue'],
            ],
            group: ['status'],
            raw: true,
        });
        const stats = { pending: 0, confirmed: 0, ready: 0, delivered: 0, cancelled: 0, total_revenue: 0 };
        statsRaw.forEach(r => {
            if (stats[r.status] !== undefined) stats[r.status] = Number(r.count);
            if (r.status === 'delivered') stats.total_revenue = Number(r.revenue) || 0;
        });

        res.json({ orders: rows, total: count, stats });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/orders/:id/status', [auth, adminOnly], async (req, res) => {
    try {
        const { status } = req.body;
        const allowed = ['pending', 'confirmed', 'ready', 'delivered', 'cancelled'];
        if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        await order.update({ status });
        res.json({ order });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
//  KYC — COURIER VERIFICATIONS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/verifications/couriers', [auth, adminOnly], async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const where = {};
        if (status) where.status = status;
        const { rows, count } = await CourierVerification.findAndCountAll({
            where,
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone', 'profile_photo'] }],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset,
        });
        const stats = {
            submitted:    await CourierVerification.count({ where: { status: 'submitted' } }),
            under_review: await CourierVerification.count({ where: { status: 'under_review' } }),
            approved:     await CourierVerification.count({ where: { status: 'approved' } }),
            rejected:     await CourierVerification.count({ where: { status: 'rejected' } }),
        };
        res.json({ verifications: rows, total: count, stats });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/verifications/couriers/:id', [auth, adminOnly], async (req, res) => {
    try {
        const v = await CourierVerification.findByPk(req.params.id, {
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone', 'active_services'] }],
        });
        if (!v) return res.status(404).json({ error: 'Not found' });
        res.json({ verification: v });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/verifications/couriers/:id', [auth, adminOnly], async (req, res) => {
    try {
        const { status, admin_notes, rejection_reason } = req.body;
        const allowed = ['under_review', 'approved', 'rejected'];
        if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

        const v = await CourierVerification.findByPk(req.params.id, {
            include: [{ model: User, as: 'user' }],
        });
        if (!v) return res.status(404).json({ error: 'Not found' });

        const updateData = { status, admin_notes, reviewed_at: new Date(), reviewed_by: req.user.name };
        if (rejection_reason) updateData.rejection_reason = rejection_reason;
        await v.update(updateData);

        const user = v.user;
        if (user) {
            if (status === 'approved') {
                const currentServices = user.active_services || [];
                if (!currentServices.includes('courier')) {
                    await user.update({ active_services: [...currentServices, 'courier'] });
                }
            } else if (status === 'rejected') {
                const currentServices = (user.active_services || []).filter(s => s !== 'courier');
                await user.update({ active_services: currentServices });
            }

            const io = req.app.get('io');
            if (io) {
                io.to('user_' + user.id).emit('kyc_status_changed', { type: 'courier', status });
            }
            if (status === 'approved') push.kycApproved(user, 'courier');
            if (status === 'rejected')  push.kycRejected(user, 'courier');
        }

        res.json({ verification: v });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── RATINGS ──────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/ratings
 * List all ratings with filters
 */
router.get('/ratings', [auth, adminOnly], async (req, res) => {
    try {
        const { service_type, min_rating, max_rating, page = 1, limit = 30 } = req.query;
        const where = {};
        if (service_type) where.service_type = service_type;
        if (min_rating)   where.rating = { ...where.rating, [Op.gte]: parseInt(min_rating) };
        if (max_rating)   where.rating = { ...where.rating, [Op.lte]: parseInt(max_rating) };

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const { count, rows } = await Rating.findAndCountAll({
            where,
            include: [
                { model: User, as: 'rater',     attributes: ['id', 'name', 'phone', 'profile_photo'] },
                { model: User, as: 'ratedUser', attributes: ['id', 'name', 'phone', 'profile_photo'] },
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset,
        });
        res.json({ ratings: rows, total: count });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * GET /api/admin/ratings/stats
 * Aggregated rating stats per service type
 */
router.get('/ratings/stats', [auth, adminOnly], async (req, res) => {
    try {
        const { sequelize: db } = require('../config/database');
        const stats = await Rating.findAll({
            attributes: [
                'service_type',
                [db.fn('COUNT', db.col('id')),     'total'],
                [db.fn('AVG',   db.col('rating')), 'avg_rating'],
                [db.fn('MIN',   db.col('rating')), 'min_rating'],
                [db.fn('MAX',   db.col('rating')), 'max_rating'],
            ],
            where: { is_hidden: false },
            group: ['service_type'],
            raw: true,
        });
        res.json({ stats });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * PATCH /api/admin/ratings/:id
 * Toggle is_hidden (moderate a rating)
 */
router.patch('/ratings/:id', [auth, adminOnly], async (req, res) => {
    try {
        const rating = await Rating.findByPk(req.params.id);
        if (!rating) return res.status(404).json({ error: 'Rating not found' });
        await rating.update({ is_hidden: !rating.is_hidden });
        res.json({ rating });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * DELETE /api/admin/ratings/:id
 * Hard-delete a rating
 */
router.delete('/ratings/:id', [auth, adminOnly], async (req, res) => {
    try {
        const rating = await Rating.findByPk(req.params.id);
        if (!rating) return res.status(404).json({ error: 'Rating not found' });
        await rating.destroy();
        res.json({ message: 'Rating deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// SUPPORT & INCIDENTS
// ══════════════════════════════════════════════════════════════════════════════

// GET /admin/support/tickets — all tickets paginated + filters
router.get('/support/tickets', [auth, adminOnly], async (req, res) => {
    try {
        const { status, priority, type, search, page = 1, limit = 40 } = req.query;
        const where = {};
        // 'urgent' is a priority value, not a status
        if (status && status !== 'urgent') where.status   = status;
        if (status === 'urgent')           where.priority = 'urgent';
        if (priority) where.priority = priority;
        if (type)     where.type     = type;
        if (search)   where.subject  = { [Op.iLike]: `%${search}%` };
        const offset = (Number(page) - 1) * Number(limit);

        const { count, rows } = await SupportTicket.findAndCountAll({
            where,
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone', 'profile_photo'] }],
            order: [
                [sequelize.literal(`CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END`), 'ASC'],
                ['last_message_at', 'DESC'],
            ],
            limit: Number(limit),
            offset,
        });

        // Stats for tabs
        const [statsRaw, urgentCount] = await Promise.all([
            SupportTicket.findAll({
                attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
                group: ['status'],
                raw: true,
            }),
            SupportTicket.count({ where: { priority: 'urgent', status: { [Op.in]: ['open', 'in_progress'] } } }),
        ]);
        const stats = { open: 0, in_progress: 0, resolved: 0, closed: 0, urgent: urgentCount };
        statsRaw.forEach(r => { if (r.status in stats) stats[r.status] = Number(r.count); });

        res.json({ tickets: rows, total: count, stats });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /admin/support/tickets/:id — ticket detail with all messages
router.get('/support/tickets/:id', [auth, adminOnly], async (req, res) => {
    try {
        const ticket = await SupportTicket.findByPk(req.params.id, {
            include: [
                { model: User,           as: 'user',     attributes: ['id', 'name', 'email', 'phone', 'profile_photo'] },
                { model: SupportMessage, as: 'messages', order: [['created_at', 'ASC']] },
            ],
        });
        if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });

        // Mark all user messages as read by support
        await SupportMessage.update(
            { is_read: true },
            { where: { ticket_id: ticket.id, sender_type: 'user', is_read: false } }
        );
        await ticket.update({ unread_support: 0 });

        res.json({ ticket });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /admin/support/tickets/:id/reply — admin sends a reply
router.post('/support/tickets/:id/reply', [auth, adminOnly], async (req, res) => {
    try {
        const { content } = req.body;
        if (!content?.trim()) return res.status(400).json({ error: 'Message vide' });

        const ticket = await SupportTicket.findByPk(req.params.id);
        if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });
        if (ticket.status === 'closed') return res.status(400).json({ error: 'Ticket fermé' });

        const message = await SupportMessage.create({
            ticket_id:   ticket.id,
            sender_type: 'support',
            sender_id:   req.user.id,
            sender_name: req.user.name,
            content:     content.trim(),
        });

        const newStatus = ticket.status === 'open' ? 'in_progress' : ticket.status;
        await ticket.update({
            status:          newStatus,
            last_message_at: new Date(),
            unread_user:     ticket.unread_user + 1,
        });

        // Real-time push to user
        const io = req.app.get('io');
        if (io) {
            io.to(`user_${ticket.user_id}`).emit('support_new_message', {
                ticket_id: ticket.id,
                message:   message.toJSON(),
            });
            io.to(`support_ticket_${ticket.id}`).emit('support_new_message', {
                ticket_id: ticket.id,
                message:   message.toJSON(),
            });
        }

        res.status(201).json({ message, status: newStatus });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /admin/support/tickets/:id — update status / priority
router.put('/support/tickets/:id', [auth, adminOnly], async (req, res) => {
    try {
        const ticket = await SupportTicket.findByPk(req.params.id);
        if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });

        const allowed = {};
        if (req.body.status) {
            const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
            if (!validStatuses.includes(req.body.status)) return res.status(400).json({ error: 'Statut invalide' });
            allowed.status = req.body.status;
            if (req.body.status === 'resolved') allowed.resolved_at = new Date();
        }
        if (req.body.priority) {
            const validPriorities = ['low', 'medium', 'high', 'urgent'];
            if (!validPriorities.includes(req.body.priority)) return res.status(400).json({ error: 'Priorité invalide' });
            allowed.priority = req.body.priority;
        }

        await ticket.update(allowed);

        // Notify user when resolved or closed
        if (req.body.status === 'resolved' || req.body.status === 'closed') {
            const io = req.app.get('io');
            if (io) {
                io.to(`user_${ticket.user_id}`).emit('support_ticket_resolved', { ticket_id: ticket.id, status: req.body.status });
                io.to(`support_ticket_${ticket.id}`).emit('support_ticket_resolved', { ticket_id: ticket.id, status: req.body.status });
            }
        }

        res.json({ ticket });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// DELIVERIES
// ══════════════════════════════════════════════════════════════════════════════

// GET /admin/deliveries — paginated list with optional status filter + stats
router.get('/deliveries', [auth, adminOnly], async (req, res) => {
    try {
        const { status, page = 1, limit = 30 } = req.query;
        const where = {};
        if (status) where.status = status;
        const offset = (Number(page) - 1) * Number(limit);

        const { count, rows } = await Delivery.findAndCountAll({
            where,
            include: [
                { model: User, as: 'sender',  attributes: ['id', 'name', 'phone', 'email'] },
                { model: User, as: 'courier', attributes: ['id', 'name', 'phone', 'email'] },
            ],
            order: [['created_at', 'DESC']],
            limit:  Number(limit),
            offset,
        });

        const statsRaw = await Delivery.findAll({
            attributes: [
                'status',
                [sequelize.fn('COUNT', sequelize.col('id')),   'count'],
                [sequelize.fn('SUM',   sequelize.col('fare')), 'revenue'],
            ],
            group: ['status'],
            raw: true,
        });
        const stats = { pending: 0, accepted: 0, picked_up: 0, delivered: 0, cancelled: 0, total_revenue: 0 };
        statsRaw.forEach(r => {
            if (r.status in stats) stats[r.status] = Number(r.count);
            if (r.status === 'delivered') stats.total_revenue = Number(r.revenue) || 0;
        });

        res.json({ deliveries: rows, total: count, stats });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /admin/deliveries/stats — standalone stats (dashboard use)
router.get('/deliveries/stats', [auth, adminOnly], async (req, res) => {
    try {
        const statsRaw = await Delivery.findAll({
            attributes: [
                'status',
                [sequelize.fn('COUNT', sequelize.col('id')),   'count'],
                [sequelize.fn('SUM',   sequelize.col('fare')), 'revenue'],
            ],
            group: ['status'],
            raw: true,
        });
        const stats = { pending: 0, accepted: 0, picked_up: 0, delivered: 0, cancelled: 0, total_revenue: 0 };
        statsRaw.forEach(r => {
            if (r.status in stats) stats[r.status] = Number(r.count);
            if (r.status === 'delivered') stats.total_revenue = Number(r.revenue) || 0;
        });
        res.json({ stats });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
