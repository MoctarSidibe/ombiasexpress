const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { Op }  = require('sequelize');
const { auth } = require('../middleware/auth.middleware');
const { uploadRateLimit, imageFileFilter } = require('../middleware/security.middleware');
const { CarListing, User, MerchantVerification } = require('../models');

const router = express.Router();

// ── File upload setup (reuses same kyc uploads dir or a market dir) ───────────
const uploadDir = path.join(__dirname, '../uploads/market');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename:    (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // A08: 5MB
    fileFilter: imageFileFilter,             // A08: strict MIME whitelist
});

// ── POST /api/car-listings/upload ─────────────────────────────────────────────
router.post('/upload', auth, uploadRateLimit, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: `/uploads/market/${req.file.filename}` });
});

// ── GET /api/car-listings — public browse ─────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const { city, make, min_price, max_price, fuel_type, transmission, page = 1, limit = 20 } = req.query;
        const where = { status: 'active' };
        if (city)         where.city         = { [Op.iLike]: `%${city}%` };
        if (make)         where.make         = { [Op.iLike]: `%${make}%` };
        if (fuel_type)    where.fuel_type    = fuel_type;
        if (transmission) where.transmission = transmission;
        if (min_price || max_price) {
            where.price = {};
            if (min_price) where.price[Op.gte] = parseFloat(min_price);
            if (max_price) where.price[Op.lte] = parseFloat(max_price);
        }
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const { count, rows } = await CarListing.findAndCountAll({
            where,
            include: [{ model: User, as: 'seller', attributes: ['id', 'name', 'phone', 'profile_photo'] }],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset,
        });
        res.json({ listings: rows, total: count, page: parseInt(page) });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/car-listings/mine — seller's own listings ────────────────────────
router.get('/mine', auth, async (req, res) => {
    try {
        const listings = await CarListing.findAll({
            where:  { seller_id: req.user.id },
            order:  [['created_at', 'DESC']],
        });
        res.json({ listings });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/car-listings/:id — single listing ────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const listing = await CarListing.findByPk(req.params.id, {
            include: [{ model: User, as: 'seller', attributes: ['id', 'name', 'phone', 'profile_photo'] }],
        });
        if (!listing) return res.status(404).json({ error: 'Listing not found' });
        // Increment view count (fire and forget)
        listing.increment('view_count').catch(() => {});
        res.json({ listing });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/car-listings — create ──────────────────────────────────────────
router.post('/', auth, async (req, res) => {
    try {
        // Require car_seller in active_services
        const services = req.user.active_services || [];
        if (!services.includes('car_seller') && req.user.role !== 'car_seller') {
            return res.status(403).json({ error: 'Service vendeur auto non activé' });
        }
        const { make, model, year, color, mileage, fuel_type, transmission, seats, price, city, description, photos } = req.body;
        if (!make || !model || !year || !price) {
            return res.status(400).json({ error: 'make, model, year et price sont requis' });
        }
        const listing = await CarListing.create({
            seller_id: req.user.id,
            make, model, year, color, mileage, fuel_type, transmission, seats,
            price, city, description,
            photos: photos || [],
            status: 'pending',
        });
        res.status(201).json({ listing, message: 'Annonce soumise — en cours d\'examen par notre équipe.' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PUT /api/car-listings/:id — update ───────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
    try {
        const listing = await CarListing.findOne({ where: { id: req.params.id, seller_id: req.user.id } });
        if (!listing) return res.status(404).json({ error: 'Annonce introuvable ou accès refusé' });
        const { make, model, year, color, mileage, fuel_type, transmission, seats, price, city, description, photos, status } = req.body;
        // Seller can only set status to 'paused' or 'sold' — 'active' is set by admin approval only
        const SELLER_ALLOWED_STATUSES = ['paused', 'sold'];
        const resolvedStatus = status !== undefined
            ? (SELLER_ALLOWED_STATUSES.includes(status) ? status : undefined)
            : undefined;
        await listing.update({
            ...(make         !== undefined && { make }),
            ...(model        !== undefined && { model }),
            ...(year         !== undefined && { year }),
            ...(color        !== undefined && { color }),
            ...(mileage      !== undefined && { mileage }),
            ...(fuel_type    !== undefined && { fuel_type }),
            ...(transmission !== undefined && { transmission }),
            ...(seats        !== undefined && { seats }),
            ...(price        !== undefined && { price }),
            ...(city         !== undefined && { city }),
            ...(description  !== undefined && { description }),
            ...(photos       !== undefined && { photos }),
            ...(resolvedStatus !== undefined && { status: resolvedStatus }),
        });
        res.json({ listing });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /api/car-listings/:id ─────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
    try {
        const listing = await CarListing.findOne({ where: { id: req.params.id, seller_id: req.user.id } });
        if (!listing) return res.status(404).json({ error: 'Annonce introuvable ou accès refusé' });
        await listing.destroy();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
