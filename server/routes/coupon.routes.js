const express = require('express');
const { body, validationResult } = require('express-validator');
const { Coupon, CouponRedemption, User } = require('../models');
const { auth, requireRole } = require('../middleware/auth.middleware');
const { Op } = require('sequelize');

const router = express.Router();

// ── Helper ──────────────────────────────────────────────────────────────────

/**
 * Calculate the discount for a given coupon + fare.
 * Returns { discount, finalFare } or throws with a user-facing message.
 */
const applyCouponLogic = async (coupon, userId, fare) => {
    // Expiry check
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        throw new Error('Ce code promo a expiré.');
    }
    // Active check
    if (!coupon.is_active) {
        throw new Error('Ce code promo n\'est plus actif.');
    }
    // Global usage cap
    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
        throw new Error('Ce code promo a atteint sa limite d\'utilisation.');
    }
    // Min fare
    if (parseFloat(fare) < parseFloat(coupon.min_fare)) {
        throw new Error(`Ce code promo nécessite un trajet d\'au moins ${coupon.min_fare} XAF.`);
    }
    // Per-user usage cap
    if (coupon.max_uses_per_user > 0) {
        const userUses = await CouponRedemption.count({
            where: { coupon_id: coupon.id, user_id: userId },
        });
        if (userUses >= coupon.max_uses_per_user) {
            throw new Error('Vous avez déjà utilisé ce code promo.');
        }
    }

    const fareNum = parseFloat(fare);
    let discount;
    if (coupon.type === 'free_ride') {
        discount = fareNum;
    } else if (coupon.type === 'percentage') {
        discount = fareNum * (parseFloat(coupon.value) / 100);
        if (coupon.max_discount !== null) {
            discount = Math.min(discount, parseFloat(coupon.max_discount));
        }
    } else {
        // fixed
        discount = Math.min(parseFloat(coupon.value), fareNum);
    }

    return { discount: parseFloat(discount.toFixed(2)), finalFare: parseFloat((fareNum - discount).toFixed(2)) };
};

module.exports.applyCouponLogic = applyCouponLogic;

// ── Public (authenticated) ───────────────────────────────────────────────────

/**
 * POST /api/coupons/validate
 * Validate a coupon code and preview the discount before committing.
 */
router.post('/validate', auth, [
    body('code').trim().notEmpty(),
    body('fare').isFloat({ min: 0 }),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { code, fare } = req.body;
    try {
        const coupon = await Coupon.findOne({ where: { code: code.toUpperCase().trim() } });
        if (!coupon) return res.status(404).json({ error: 'Code promo invalide.' });

        const result = await applyCouponLogic(coupon, req.user.id, fare);
        res.json({
            valid:       true,
            code:        coupon.code,
            type:        coupon.type,
            value:       coupon.value,
            discount:    result.discount,
            final_fare:  result.finalFare,
            description: coupon.description,
        });
    } catch (err) {
        res.status(400).json({ valid: false, error: err.message });
    }
});

// ── Admin CRUD ───────────────────────────────────────────────────────────────

const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    next();
};

/** GET /api/coupons/admin — list all coupons */
router.get('/admin', [auth, adminOnly], async (req, res) => {
    try {
        const coupons = await Coupon.findAll({
            order: [['created_at', 'DESC']],
            include: [{ model: CouponRedemption, as: 'redemptions', attributes: ['id'] }],
        });
        res.json({ coupons });
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
});

/** POST /api/coupons/admin — create coupon */
router.post('/admin', [auth, adminOnly], [
    body('code').trim().notEmpty().isLength({ max: 30 }),
    body('type').isIn(['free_ride', 'percentage', 'fixed']),
    body('value').isFloat({ min: 0 }),
    body('min_fare').optional().isFloat({ min: 0 }),
    body('max_discount').optional().isFloat({ min: 0 }),
    body('max_uses').optional().isInt({ min: 1 }),
    body('max_uses_per_user').optional().isInt({ min: 1 }),
    body('expires_at').optional().isISO8601(),
    body('description').optional().trim(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
        const coupon = await Coupon.create(req.body);
        res.status(201).json({ coupon });
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Ce code existe déjà.' });
        }
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/** PUT /api/coupons/admin/:id — update coupon */
router.put('/admin/:id', [auth, adminOnly], async (req, res) => {
    try {
        const coupon = await Coupon.findByPk(req.params.id);
        if (!coupon) return res.status(404).json({ error: 'Coupon non trouvé' });
        await coupon.update(req.body);
        res.json({ coupon });
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
});

/** DELETE /api/coupons/admin/:id — delete coupon */
router.delete('/admin/:id', [auth, adminOnly], async (req, res) => {
    try {
        const coupon = await Coupon.findByPk(req.params.id);
        if (!coupon) return res.status(404).json({ error: 'Coupon non trouvé' });
        await coupon.destroy();
        res.json({ message: 'Coupon supprimé' });
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
});

module.exports.router = router;
