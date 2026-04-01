const express = require('express');
const { body, validationResult } = require('express-validator');
const { User, Wallet, DriverVerification, CarVerification, MerchantVerification, FleetVerification, CourierVerification, AdminStaff, AdminRole } = require('../models');
const jwt = require('jsonwebtoken');
const { hashPassword, comparePassword, generateToken } = require('../utils/helpers');
const { auth, blacklistToken } = require('../middleware/auth.middleware');
const {
    authRateLimit,
    authSlowDown,
    checkBruteForce,
    recordFailedLogin,
    clearLoginAttempts,
    validatePasswordStrength,
    ssrfProtect,
    auditLog,
    securityLog,
} = require('../middleware/security.middleware');

// Luhn-valid 16-digit card number generator (BIN 6246 = Ombia)
const generateCardNumber = async () => {
    let cardNumber, exists;
    const luhn = (partial) => {
        const digits = partial.split('').map(Number);
        let sum = 0, dbl = true;
        for (let i = digits.length - 1; i >= 0; i--) {
            let d = digits[i]; if (dbl) { d *= 2; if (d > 9) d -= 9; }
            sum += d; dbl = !dbl;
        }
        return ((10 - (sum % 10)) % 10).toString();
    };
    do {
        const rand = Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join('');
        const partial = '6246' + rand;
        cardNumber = partial + luhn(partial);
        exists = await Wallet.findOne({ where: { card_number: cardNumber } });
    } while (exists);
    return cardNumber;
};

const router = express.Router();

// ── A07: POST /register — with rate limit + slow-down + password policy ──────
router.post('/register', authRateLimit, authSlowDown, [
    body('name').trim().notEmpty().isLength({ max: 100 }).withMessage('Nom requis (max 100 caractères)'),
    body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail().withMessage('Email invalide'),
    body('phone').trim().notEmpty().isLength({ min: 8, max: 20 }).withMessage('Numéro de téléphone requis'),
    body('password').isLength({ min: 6 }).withMessage('Mot de passe : 6 caractères minimum'),
    body('role').optional().isIn(['rider', 'driver', 'renter', 'rental_owner', 'fleet_owner']).withMessage('Rôle invalide'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        const { name, email, phone, password, role } = req.body;

        const existingPhone = await User.findOne({ where: { phone } });
        if (existingPhone) return res.status(400).json({ error: 'Ce numéro de téléphone est déjà utilisé' });
        if (email) {
            const existingEmail = await User.findOne({ where: { email } });
            if (existingEmail) return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }
        const passwordHash = await hashPassword(password);
        const user = await User.create({ name, email: email || null, phone, password_hash: passwordHash, role: role || 'rider', active_services: ['rider', 'renter'] });
        // Create wallet immediately so card number and balance are visible in admin
        try {
            await Wallet.create({ user_id: user.id, card_number: await generateCardNumber() });
        } catch (e) { console.error('Wallet creation on register:', e.message); }
        const token = generateToken(user.id);
        res.status(201).json({
            message: 'User registered successfully', token,
            user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, active_services: user.active_services, rating: user.rating, profile_photo: user.profile_photo }
        });
    } catch (error) {
        console.error('Registration error:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            const field = error.errors?.[0]?.path;
            if (field === 'phone') return res.status(400).json({ error: 'Ce numéro de téléphone est déjà utilisé' });
            if (field === 'email') return res.status(400).json({ error: 'Cet email est déjà utilisé' });
            return res.status(400).json({ error: 'Cet utilisateur existe déjà' });
        }
        res.status(500).json({ error: 'Registration failed' });
    }
});

// ── A07: POST /login — accepts phone (mobile) OR email (admin dashboard) ─────
router.post('/login', authRateLimit, authSlowDown, checkBruteForce, [
    body('password').notEmpty().withMessage('Mot de passe requis'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        const { phone, email, password } = req.body;

        if (!phone && !email) {
            return res.status(400).json({ error: 'Numéro de téléphone ou email requis.' });
        }

        const identifier = phone || email;

        // Phone lookup: try exact match first, then fallback variants
        // (handles existing users stored with leading-zero local format)
        let user = null;
        if (phone) {
            user = await User.findOne({ where: { phone } });
            // Fallback: strip country code prefix and try 0-prefixed local format
            // e.g., sent 24177724499 → try 077724499 for legacy accounts
            if (!user && phone.length > 8) {
                const { Op } = require('sequelize');
                user = await User.findOne({ where: { phone: { [Op.like]: `%${phone.slice(-8)}` } } });
            }
        } else {
            user = await User.findOne({ where: { email } });
        }

        if (!user) {
            recordFailedLogin(req.ip, identifier);
            return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect.' });
        }

        const isPasswordValid = await comparePassword(password, user.password_hash);
        if (!isPasswordValid) {
            const attempts = recordFailedLogin(req.ip, identifier);
            securityLog('LOGIN_FAILED', { ip: req.ip, identifier, attempts });
            const remaining = Math.max(0, 5 - attempts);
            return res.status(401).json({
                error: remaining > 0
                    ? `Identifiant ou mot de passe incorrect. ${remaining} tentative(s) restante(s).`
                    : 'Compte bloqué. Réessayez dans 15 minutes.',
            });
        }

        if (!user.is_active) return res.status(403).json({ error: 'Compte désactivé. Contactez l\'assistance.' });

        clearLoginAttempts(req.ip, identifier);

        // ── MFA Step 1: if enabled, return short-lived session token ─────────
        if (user.mfa_enabled) {
            const mfaSession = jwt.sign(
                { id: user.id, type: 'mfa_session' },
                process.env.JWT_SECRET,
                { algorithm: 'HS256', expiresIn: '5m' }
            );
            auditLog('MFA_REQUIRED', req, { userId: user.id });
            return res.json({ mfa_required: true, mfa_session: mfaSession });
        }

        // ── No MFA: issue full JWT ────────────────────────────────────────────
        auditLog('LOGIN_SUCCESS', req, { userId: user.id, identifier });

        const token = generateToken(user.id);
        let staffData = null;
        if (user.is_staff) {
            const staffRecord = await AdminStaff.findOne({
                where: { user_id: user.id, is_active: true },
                include: [{ model: AdminRole, as: 'role' }],
            });
            if (staffRecord) {
                staffData = {
                    role_name:   staffRecord.role?.name || '',
                    role_color:  staffRecord.role?.color || '#1565C0',
                    department:  staffRecord.department,
                    permissions: staffRecord.role?.permissions || [],
                };
            }
        }
        res.json({
            message: 'Login successful', token,
            user: {
                id: user.id, name: user.name, email: user.email, phone: user.phone,
                role: user.role, active_services: user.active_services || ['rider', 'renter'],
                rating: user.rating, profile_photo: user.profile_photo, is_verified: user.is_verified,
                is_staff: user.is_staff || false,
                mfa_enabled: user.mfa_enabled || false,
                staffData,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Erreur de connexion.' });
    }
});

// ── A07: POST /logout — blacklist the token immediately ───────────────────────
router.post('/logout', auth, (req, res) => {
    blacklistToken(req.token);
    auditLog('LOGOUT', req);
    res.json({ message: 'Déconnecté avec succès.' });
});

router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, { attributes: { exclude: ['password_hash'] } });
        res.json({ user });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

router.put('/profile', auth, ssrfProtect(['profile_photo']), [
    body('name').optional().trim().notEmpty().isLength({ max: 100 }),
    body('phone').optional().trim().notEmpty().isLength({ min: 8, max: 20 }),
    body('profile_photo').optional().isURL({ protocols: ['https', 'http'], require_tld: true }),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        const { name, phone, profile_photo } = req.body;
        const updateData = {};
        if (name) updateData.name = name;
        if (phone) updateData.phone = phone;
        if (profile_photo) updateData.profile_photo = profile_photo;
        await req.user.update(updateData);
        res.json({
            message: 'Profile updated successfully',
            user: { id: req.user.id, name: req.user.name, email: req.user.email, phone: req.user.phone, role: req.user.role, profile_photo: req.user.profile_photo }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Bug Fix: password change endpoint was missing entirely
router.put('/password', auth, [
    body('current_password').notEmpty().withMessage('Current password is required'),
    body('new_password').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        const { current_password, new_password } = req.body;
        const user = await User.findByPk(req.user.id);
        const isValid = await comparePassword(current_password, user.password_hash);
        if (!isValid) return res.status(400).json({ error: 'Current password is incorrect' });
        const newHash = await hashPassword(new_password);
        await user.update({ password_hash: newHash });
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// ── PUT /api/auth/push-token ──────────────────────────────────────────────────
router.put('/push-token', auth, async (req, res) => {
    try {
        const { push_token } = req.body;
        if (!push_token) return res.status(400).json({ error: 'push_token is required' });
        await req.user.update({ push_token });
        res.json({ message: 'Push token saved' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to save push token' });
    }
});

router.put('/activate-service', auth, [
    body('role').isIn(['driver', 'rental_owner', 'fleet_owner', 'partner', 'store_owner', 'car_seller', 'courier']).withMessage('Invalid service role')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { role } = req.body;

        // Verify KYC is approved before granting the service
        let kycApproved = false;
        if (role === 'driver') {
            const v = await DriverVerification.findOne({ where: { user_id: req.user.id, status: 'approved' } });
            kycApproved = !!v;
        } else if (role === 'rental_owner') {
            const v = await CarVerification.findOne({ where: { user_id: req.user.id, status: 'approved' } });
            kycApproved = !!v;
        } else if (role === 'fleet_owner') {
            const v = await FleetVerification.findOne({ where: { user_id: req.user.id, status: 'approved' } });
            kycApproved = !!v;
        } else if (role === 'partner') {
            const v = await MerchantVerification.findOne({ where: { user_id: req.user.id, merchant_type: 'partner', status: 'approved' } });
            kycApproved = !!v;
        } else if (role === 'store_owner') {
            const v = await MerchantVerification.findOne({ where: { user_id: req.user.id, merchant_type: 'store_owner', status: 'approved' } });
            kycApproved = !!v;
        } else if (role === 'car_seller') {
            const v = await MerchantVerification.findOne({ where: { user_id: req.user.id, merchant_type: 'car_seller', status: 'approved' } });
            kycApproved = !!v;
        } else if (role === 'courier') {
            const v = await CourierVerification.findOne({ where: { user_id: req.user.id, status: 'approved' } });
            kycApproved = !!v;
        }

        if (!kycApproved) {
            return res.status(403).json({
                error: 'Vérification KYC requise. Votre dossier doit être approuvé par l\'administration avant d\'accéder à ce service.',
                code: 'KYC_NOT_APPROVED',
            });
        }

        const current = req.user.active_services || ['rider', 'renter'];
        const updated = current.includes(role) ? current : [...current, role];
        await req.user.update({ role, active_services: updated });
        res.json({
            message: 'Service activated successfully',
            user: { id: req.user.id, name: req.user.name, email: req.user.email, phone: req.user.phone, role: req.user.role, active_services: req.user.active_services }
        });
    } catch (error) {
        console.error('Service activation error:', error);
        res.status(500).json({ error: 'Failed to activate service' });
    }
});

module.exports = router;
