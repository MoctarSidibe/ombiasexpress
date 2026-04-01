const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { Op }   = require('sequelize');
const router   = express.Router();

const { Product, User } = require('../models');
const { auth: authenticate } = require('../middleware/auth.middleware');
const { imageFileFilter, uploadRateLimit } = require('../middleware/security.middleware');

// ── Upload ─────────────────────────────────────────────────────────────────────

const uploadDir = path.join(__dirname, '../uploads/products');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename:    (req, file, cb) => cb(null, `product-${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // A08: 5MB max
    fileFilter: imageFileFilter,             // A08: strict MIME whitelist
});

// POST /products/upload
router.post('/upload', authenticate, uploadRateLimit, upload.single('photo'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const url = `/uploads/products/${req.file.filename}`;
    res.json({ url });
});

// ── Browse (public) ────────────────────────────────────────────────────────────

// GET /products
router.get('/', async (req, res) => {
    try {
        const { category, seller_id, search, min_price, max_price, page = 1, limit = 20 } = req.query;
        const where = { status: 'active' };
        if (category)  where.category  = category;
        if (seller_id) where.seller_id = seller_id;
        if (min_price || max_price) {
            where.price = {};
            if (min_price) where.price[Op.gte] = Number(min_price);
            if (max_price) where.price[Op.lte] = Number(max_price);
        }
        if (search) {
            where.name = { [Op.iLike]: `%${search}%` };
        }
        const offset = (Number(page) - 1) * Number(limit);
        const { count, rows } = await Product.findAndCountAll({
            where,
            include: [{ model: User, as: 'seller', attributes: ['id', 'name', 'phone', 'profile_photo'] }],
            order: [['created_at', 'DESC']],
            limit:  Number(limit),
            offset,
        });
        res.json({ products: rows, total: count, page: Number(page), pages: Math.ceil(count / Number(limit)) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /products/mine — seller's listings
router.get('/mine', authenticate, async (req, res) => {
    try {
        const products = await Product.findAll({
            where:  { seller_id: req.user.id },
            order:  [['created_at', 'DESC']],
        });
        res.json({ products });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /products/:id
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id, {
            include: [{ model: User, as: 'seller', attributes: ['id', 'name', 'phone', 'profile_photo'] }],
        });
        if (!product) return res.status(404).json({ error: 'Product not found' });
        await product.increment('view_count');
        res.json({ product });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Seller CRUD ────────────────────────────────────────────────────────────────

// POST /products
router.post('/', authenticate, async (req, res) => {
    try {
        const services = req.user.active_services || [];
        if (!services.includes('store_owner') && !services.includes('partner')) {
            return res.status(403).json({ error: 'Compte boutique requis. Complétez la vérification "Propriétaire de boutique".' });
        }
        const { name, description, category, price, photos, stock, unit } = req.body;
        if (!name || !price) return res.status(400).json({ error: 'name and price required' });
        const product = await Product.create({
            seller_id: req.user.id,
            name, description, category, price,
            photos: photos || [],
            stock:  stock ?? -1,
            unit:   unit  || 'unité',
        });
        res.status(201).json({ product });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /products/:id
router.put('/:id', authenticate, async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) return res.status(404).json({ error: 'Not found' });
        if (product.seller_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
        const allowed = ['name', 'description', 'category', 'price', 'photos', 'stock', 'unit', 'status'];
        allowed.forEach(f => { if (req.body[f] !== undefined) product[f] = req.body[f]; });
        await product.save();
        res.json({ product });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /products/:id
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) return res.status(404).json({ error: 'Not found' });
        if (product.seller_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
        await product.destroy();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
