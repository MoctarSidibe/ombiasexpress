const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { auth } = require('../middleware/auth.middleware');
const { uploadRateLimit, imageFileFilter } = require('../middleware/security.middleware');
const { DriverVerification, CarVerification, MerchantVerification, FleetVerification, User, RentalCar } = require('../models');

const router = express.Router();

// ── File upload setup ─────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '../uploads/kyc');
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

// ── POST /api/verifications/upload ───────────────────────────────────────────
router.post('/upload', auth, uploadRateLimit, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const url = `/uploads/kyc/${req.file.filename}`;
    res.json({ url });
});

// ══════════════════════════════════════════════════════════════════════════════
//  DRIVER VERIFICATION
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/verifications/driver/me
router.get('/driver/me', auth, async (req, res) => {
    try {
        const verification = await DriverVerification.findOne({
            where:  { user_id: req.user.id },
            order:  [['created_at', 'DESC']],
        });
        res.json({ verification });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/verifications/driver — create or update driver verification
router.post('/driver', auth, async (req, res) => {
    try {
        const { full_name, date_of_birth, phone, address, city,
                national_id_number, license_number, docs,
                appointment_date, office_location, submit } = req.body;

        const { Op } = require('sequelize');
        let verification = await DriverVerification.findOne({
            where: { user_id: req.user.id, status: { [Op.notIn]: ['approved', 'rejected'] } },
            order: [['created_at', 'DESC']],
        });

        const data = {
            full_name, date_of_birth, phone, address, city,
            national_id_number, license_number,
            ...(docs && { docs }),
            ...(appointment_date && { appointment_date }),
            ...(office_location  && { office_location }),
        };

        if (submit) data.status = 'submitted';

        if (verification) {
            await verification.update(data);
        } else {
            verification = await DriverVerification.create({ user_id: req.user.id, ...data });
        }

        res.json({ verification });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
//  CAR VERIFICATION
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/verifications/car/me
router.get('/car/me', auth, async (req, res) => {
    try {
        const verifications = await CarVerification.findAll({
            where: { user_id: req.user.id },
            order: [['created_at', 'DESC']],
        });
        res.json({ verifications });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/verifications/car — create or update car verification
router.post('/car', auth, async (req, res) => {
    try {
        const { make, model, year, color, plate_number, seats,
                fuel_type, transmission, mileage, price_per_day,
                description, docs, photos, submit } = req.body;

        const { Op } = require('sequelize');
        // Find existing in-progress verification (not yet submitted or still draft)
        let verification = await CarVerification.findOne({
            where: { user_id: req.user.id, status: { [Op.notIn]: ['approved', 'rejected'] } },
            order: [['created_at', 'DESC']],
        });

        const data = {
            make, model, year, color, plate_number, seats,
            fuel_type, transmission, mileage, price_per_day, description,
            ...(docs   && { docs }),
            ...(photos && { photos }),
        };

        if (submit) data.status = 'submitted';

        if (verification) {
            await verification.update(data);
        } else {
            verification = await CarVerification.create({ user_id: req.user.id, ...data });
        }

        res.json({ verification });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
//  MERCHANT VERIFICATION
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/verifications/merchant/me
router.get('/merchant/me', auth, async (req, res) => {
    try {
        const verifications = await MerchantVerification.findAll({
            where: { user_id: req.user.id },
            order: [['created_at', 'DESC']],
        });
        res.json({ verifications });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/verifications/merchant — create or update merchant verification
router.post('/merchant', auth, async (req, res) => {
    try {
        const {
            merchant_type,
            business_name, business_type, rccm_number, tax_id,
            address, city, phone, email, website,
            docs, bank_info, submit,
        } = req.body;

        const { Op } = require('sequelize');
        let verification = await MerchantVerification.findOne({
            where: {
                user_id:       req.user.id,
                merchant_type: merchant_type || 'partner',
                status:        { [Op.notIn]: ['approved', 'rejected'] },
            },
            order: [['created_at', 'DESC']],
        });

        const data = {
            merchant_type: merchant_type || 'partner',
            business_name, business_type, rccm_number, tax_id,
            address, city, phone, email, website,
            ...(docs      && { docs }),
            ...(bank_info && { bank_info }),
        };

        if (submit) data.status = 'submitted';

        if (verification) {
            await verification.update(data);
        } else {
            verification = await MerchantVerification.create({ user_id: req.user.id, ...data });
        }

        res.json({ verification });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/verifications/merchant/logo — update business logo URL
router.patch('/merchant/logo', auth, async (req, res) => {
    try {
        const { logo_url, merchant_type } = req.body;
        if (!logo_url) return res.status(400).json({ error: 'logo_url required' });
        const { Op } = require('sequelize');
        const v = await MerchantVerification.findOne({
            where: {
                user_id:       req.user.id,
                merchant_type: merchant_type || 'partner',
                status:        { [Op.in]: ['approved', 'submitted', 'under_review'] },
            },
        });
        if (!v) return res.status(404).json({ error: 'Verification not found' });
        await v.update({ docs: { ...(v.docs || {}), business_logo: logo_url } });
        res.json({ verification: v });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
//  FLEET VERIFICATION
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/verifications/fleet/me
router.get('/fleet/me', auth, async (req, res) => {
    try {
        const verification = await FleetVerification.findOne({
            where: { user_id: req.user.id },
            order: [['created_at', 'DESC']],
        });
        res.json({ verification });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/verifications/fleet
router.post('/fleet', auth, async (req, res) => {
    try {
        const {
            full_name, phone, address, city, national_id_number,
            make, model, year, color, plate_number, seats,
            fuel_type, transmission, mileage,
            id_docs, vehicle_docs, vehicle_photos,
            agreement_accepted, submit,
        } = req.body;

        const { Op } = require('sequelize');
        let verification = await FleetVerification.findOne({
            where: { user_id: req.user.id, status: { [Op.notIn]: ['approved', 'rejected'] } },
            order: [['created_at', 'DESC']],
        });

        const data = {
            full_name, phone, address, city, national_id_number,
            make, model, year, color, plate_number, seats,
            fuel_type, transmission, mileage,
            ...(id_docs         && { id_docs }),
            ...(vehicle_docs    && { vehicle_docs }),
            ...(vehicle_photos  && { vehicle_photos }),
            ...(agreement_accepted !== undefined && { agreement_accepted }),
        };

        if (submit) data.status = 'submitted';

        if (verification) {
            await verification.update(data);
        } else {
            verification = await FleetVerification.create({ user_id: req.user.id, ...data });
        }

        res.json({ verification });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
//  COURIER VERIFICATION
// ══════════════════════════════════════════════════════════════════════════════

const { CourierVerification } = require('../models');

// GET /api/verifications/courier/me
router.get('/courier/me', auth, async (req, res) => {
    try {
        const verification = await CourierVerification.findOne({
            where: { user_id: req.user.id },
            order: [['created_at', 'DESC']],
        });
        res.json({ verification });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/verifications/courier — create or update
router.post('/courier', auth, async (req, res) => {
    try {
        const {
            full_name, date_of_birth, phone, address, city,
            national_id_number, transport_type, docs, submit,
        } = req.body;

        const { Op } = require('sequelize');
        let verification = await CourierVerification.findOne({
            where: {
                user_id: req.user.id,
                status: { [Op.in]: ['draft', 'submitted', 'under_review', 'rejected'] },
            },
            order: [['created_at', 'DESC']],
        });

        const updateData = {
            full_name, date_of_birth, phone, address, city,
            national_id_number, transport_type,
        };
        if (docs) updateData.docs = docs;
        if (submit) updateData.status = 'submitted';

        if (verification) {
            await verification.update(updateData);
        } else {
            verification = await CourierVerification.create({
                user_id: req.user.id,
                ...updateData,
                status: submit ? 'submitted' : 'draft',
            });
        }

        res.json({ verification, message: submit ? 'Dossier soumis pour examen' : 'Brouillon sauvegardé' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
