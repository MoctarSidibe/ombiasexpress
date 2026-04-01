const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { auth, requireRole } = require('../middleware/auth.middleware');
const { Delivery, User, Setting, Rating } = require('../models');
const { body, validationResult } = require('express-validator');

const COURIER_ATTRS = ['id', 'name', 'phone', 'profile_photo', 'rating'];
const SENDER_ATTRS  = ['id', 'name', 'phone', 'profile_photo'];

const PRICING_KEYS = [
    'delivery_base_fare', 'delivery_price_per_km',
    'delivery_size_multiplier_petit', 'delivery_size_multiplier_moyen', 'delivery_size_multiplier_lourd',
    'delivery_courier_share',
];

const getPricingSettings = async () => {
    const rows = await Setting.findAll({ where: { key: { [Op.in]: PRICING_KEYS } } });
    const get = (key, def) => parseFloat(rows.find(r => r.key === key)?.value ?? def);
    return {
        base_fare:    get('delivery_base_fare',   500),
        price_per_km: get('delivery_price_per_km', 300),
        multipliers: {
            petit: get('delivery_size_multiplier_petit', 1.0),
            moyen: get('delivery_size_multiplier_moyen', 1.3),
            lourd: get('delivery_size_multiplier_lourd', 1.8),
        },
        courier_share: get('delivery_courier_share', 80),
    };
};

const calcFare = (distKm, packageSize, pricing) => {
    const base = pricing?.base_fare    ?? 500;
    const pKm  = pricing?.price_per_km ?? 300;
    const mult = pricing?.multipliers?.[packageSize] ?? 1.0;
    const raw  = (base + (distKm || 1) * pKm) * mult;
    return Math.ceil(raw / 50) * 50;
};

// ── GET /api/deliveries/pricing ───────────────────────────────────────────────
// Public pricing endpoint — mobile uses this for live fare estimation
router.get('/pricing', auth, async (req, res) => {
    try {
        const p = await getPricingSettings();
        res.json(p);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ── POST /api/deliveries ─────────────────────────────────────────────────────
// Sender creates a delivery request
router.post('/', auth, async (req, res) => {
    try {
        const {
            pickup_address, pickup_lat, pickup_lng,
            dropoff_address, dropoff_lat, dropoff_lng,
            package_description, package_size, notes, distance_km,
        } = req.body;

        if (!pickup_address || !dropoff_address) {
            return res.status(400).json({ error: 'Adresse de départ et destination requises' });
        }

        const dist    = parseFloat(distance_km) || 1;
        const pricing = await getPricingSettings();
        const fare    = calcFare(dist, package_size || 'petit', pricing);

        const delivery = await Delivery.create({
            sender_id: req.user.id,
            pickup_address, pickup_lat, pickup_lng,
            dropoff_address, dropoff_lat, dropoff_lng,
            package_description, package_size: package_size || 'petit',
            notes, distance_km: dist, fare,
            status: 'pending',
        });

        // Notify available couriers via socket
        const io = req.app.get('io');
        if (io) {
            io.emit('new_delivery_request', {
                deliveryId: delivery.id,
                pickup_address,
                dropoff_address,
                fare,
                distance_km: dist,
                package_size: package_size || 'petit',
            });
        }

        res.status(201).json({ delivery, message: 'Demande de livraison créée' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ── GET /api/deliveries/available ─────────────────────────────────────────────
// Courier: list pending deliveries they can accept
router.get('/available', [auth, requireRole('courier')], async (req, res) => {
    try {
        const deliveries = await Delivery.findAll({
            where: { status: 'pending', courier_id: null },
            include: [{ model: User, as: 'sender', attributes: SENDER_ATTRS }],
            order: [['created_at', 'DESC']],
            limit: 20,
        });
        res.json({ deliveries });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ── GET /api/deliveries/active ─────────────────────────────────────────────────
// Sender or courier: get their current active delivery
router.get('/active', auth, async (req, res) => {
    try {
        const delivery = await Delivery.findOne({
            where: {
                [Op.or]: [{ sender_id: req.user.id }, { courier_id: req.user.id }],
                status: { [Op.in]: ['pending', 'accepted', 'picked_up'] },
            },
            include: [
                { model: User, as: 'sender',  attributes: SENDER_ATTRS },
                { model: User, as: 'courier', attributes: COURIER_ATTRS },
            ],
            order: [['created_at', 'DESC']],
        });
        res.json({ delivery });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ── GET /api/deliveries/history ───────────────────────────────────────────────
router.get('/history', auth, async (req, res) => {
    try {
        const deliveries = await Delivery.findAll({
            where: {
                [Op.or]: [{ sender_id: req.user.id }, { courier_id: req.user.id }],
                status: { [Op.in]: ['delivered', 'cancelled'] },
            },
            include: [
                { model: User, as: 'sender',  attributes: SENDER_ATTRS },
                { model: User, as: 'courier', attributes: COURIER_ATTRS },
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(req.query.limit) || 20,
        });
        res.json({ deliveries });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ── POST /api/deliveries/:id/accept ──────────────────────────────────────────
router.post('/:id/accept', [auth, requireRole('courier')], async (req, res) => {
    try {
        const delivery = await Delivery.findByPk(req.params.id);
        if (!delivery) return res.status(404).json({ error: 'Livraison introuvable' });
        if (delivery.status !== 'pending') return res.status(400).json({ error: 'Livraison non disponible' });

        await delivery.update({ courier_id: req.user.id, status: 'accepted' });

        const full = await Delivery.findByPk(delivery.id, {
            include: [
                { model: User, as: 'sender',  attributes: SENDER_ATTRS },
                { model: User, as: 'courier', attributes: COURIER_ATTRS },
            ],
        });

        const io = req.app.get('io');
        if (io) {
            io.emit('delivery_accepted', { deliveryId: delivery.id, courierId: req.user.id });
        }

        res.json({ delivery: full });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ── POST /api/deliveries/:id/pickup ──────────────────────────────────────────
router.post('/:id/pickup', [auth, requireRole('courier')], async (req, res) => {
    try {
        const delivery = await Delivery.findByPk(req.params.id);
        if (!delivery || delivery.courier_id !== req.user.id) return res.status(403).json({ error: 'Accès refusé' });
        if (delivery.status !== 'accepted') return res.status(400).json({ error: 'Statut invalide' });
        await delivery.update({ status: 'picked_up' });

        const io = req.app.get('io');
        if (io) io.emit('delivery_picked_up', { deliveryId: delivery.id });

        res.json({ delivery });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ── POST /api/deliveries/:id/deliver ─────────────────────────────────────────
router.post('/:id/deliver', [auth, requireRole('courier')], async (req, res) => {
    try {
        const delivery = await Delivery.findByPk(req.params.id);
        if (!delivery || delivery.courier_id !== req.user.id) return res.status(403).json({ error: 'Accès refusé' });
        if (delivery.status !== 'picked_up') return res.status(400).json({ error: 'Statut invalide' });
        await delivery.update({ status: 'delivered' });

        // Credit courier wallet
        const { Wallet } = require('../models');
        const wallet = await Wallet.findOne({ where: { user_id: req.user.id } });
        if (wallet) {
            const pricing  = await getPricingSettings();
            const share    = (pricing.courier_share ?? 80) / 100;
            const earning  = parseFloat(delivery.fare) * share;
            await wallet.increment('balance', { by: earning });
        }

        const io = req.app.get('io');
        if (io) io.emit('delivery_completed', { deliveryId: delivery.id });

        res.json({ delivery });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ── POST /api/deliveries/:id/cancel ──────────────────────────────────────────
router.post('/:id/cancel', auth, async (req, res) => {
    try {
        const delivery = await Delivery.findByPk(req.params.id);
        if (!delivery) return res.status(404).json({ error: 'Livraison introuvable' });

        const isSender  = delivery.sender_id  === req.user.id;
        const isCourier = delivery.courier_id === req.user.id;
        if (!isSender && !isCourier) return res.status(403).json({ error: 'Accès refusé' });
        if (delivery.status === 'delivered') return res.status(400).json({ error: 'Déjà livrée' });

        await delivery.update({
            status: 'cancelled',
            cancelled_by: isSender ? 'sender' : 'courier',
        });

        const io = req.app.get('io');
        if (io) io.emit('delivery_cancelled', { deliveryId: delivery.id, cancelledBy: isSender ? 'sender' : 'courier' });

        res.json({ delivery });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * POST /api/delivery/:id/rate
 * Rate a completed delivery (sender rates courier, or courier rates sender)
 */
router.post('/:id/rate', auth, [
    body('rating').isInt({ min: 1, max: 5 }),
    body('comment').optional().trim(),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const delivery = await Delivery.findByPk(req.params.id);
        if (!delivery) return res.status(404).json({ error: 'Livraison introuvable' });
        if (delivery.status !== 'delivered') return res.status(400).json({ error: 'Seules les livraisons terminées peuvent être notées' });

        const isSender  = delivery.sender_id  === req.user.id;
        const isCourier = delivery.courier_id === req.user.id;
        if (!isSender && !isCourier) return res.status(403).json({ error: 'Non autorisé' });

        const { rating, comment, categories } = req.body;
        const ratedUserId = isSender ? delivery.courier_id : delivery.sender_id;

        // Check not already rated
        const existing = await Rating.findOne({
            where: { service_type: 'delivery', service_id: delivery.id, rater_id: req.user.id }
        });
        if (existing) return res.status(400).json({ error: 'Vous avez déjà noté cette livraison' });

        // Persist rating
        await Rating.create({
            service_type:  'delivery',
            service_id:    delivery.id,
            rater_id:      req.user.id,
            rated_user_id: ratedUserId,
            rating,
            comment:    comment || null,
            categories: categories || null,
        });

        // Update rated user's overall rating
        const ratedUser = await User.findByPk(ratedUserId);
        if (ratedUser) {
            const newTotal  = (ratedUser.total_ratings || 0) + 1;
            const newRating = (((ratedUser.rating || 0) * (ratedUser.total_ratings || 0)) + rating) / newTotal;
            await ratedUser.update({ rating: newRating.toFixed(2), total_ratings: newTotal });
        }

        res.json({ message: 'Évaluation envoyée' });
    } catch (err) {
        console.error('Delivery rating error:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
