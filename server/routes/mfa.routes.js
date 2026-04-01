/**
 * MFA Routes — TOTP 2-Factor Authentication
 * Compatible with Google Authenticator, Authy, any TOTP app
 */
const express   = require('express');
const speakeasy = require('speakeasy');
const QRCode    = require('qrcode');
const jwt       = require('jsonwebtoken');
const { auth }  = require('../middleware/auth.middleware');
const { auditLog, securityLog } = require('../middleware/security.middleware');
const { User }  = require('../models');

const router = express.Router();

const APP_NAME = process.env.APP_NAME || 'Ombia Express';

// ── POST /mfa/setup — generate secret + QR code ───────────────────────────────
// Admin/staff calls this to initiate MFA enrollment.
// Returns a QR code image (base64) to scan with their authenticator app.
// MFA is NOT yet active — must call /mfa/verify-setup to confirm.
router.post('/setup', auth, async (req, res) => {
    try {
        if (req.user.mfa_enabled) {
            return res.status(400).json({ error: 'MFA déjà activé. Désactivez-le d\'abord.' });
        }

        const secret = speakeasy.generateSecret({
            name:   `${APP_NAME} (${req.user.email})`,
            length: 32,
        });

        // Save temp secret — not enabled until verified
        await req.user.update({ mfa_secret: secret.base32 });

        // Generate QR code as base64 PNG
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        auditLog('MFA_SETUP_INITIATED', req);

        res.json({
            message:    'Scannez le QR code avec votre application (Google Authenticator, Authy…)',
            qr_code:    qrCodeUrl,           // base64 PNG to display as <img src>
            secret_key: secret.base32,        // manual entry fallback
        });
    } catch (err) {
        console.error('MFA setup error:', err);
        res.status(500).json({ error: 'Erreur lors de la configuration MFA.' });
    }
});


// ── POST /mfa/verify-setup — confirm TOTP code and activate MFA ───────────────
router.post('/verify-setup', auth, async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'Code requis.' });
        if (!req.user.mfa_secret) {
            return res.status(400).json({ error: 'Initialisez d\'abord la configuration MFA.' });
        }

        const valid = speakeasy.totp.verify({
            secret:   req.user.mfa_secret,
            encoding: 'base32',
            token:    code.toString().replace(/\s/g, ''),
            window:   1, // allow 1 step tolerance (±30s)
        });

        if (!valid) {
            securityLog('MFA_SETUP_INVALID_CODE', { ip: req.ip, userId: req.user.id });
            return res.status(400).json({ error: 'Code invalide. Vérifiez l\'heure de votre appareil.' });
        }

        await req.user.update({ mfa_enabled: true });
        auditLog('MFA_ENABLED', req);

        res.json({ message: 'MFA activé avec succès. Conservez votre code de secours.' });
    } catch (err) {
        console.error('MFA verify-setup error:', err);
        res.status(500).json({ error: 'Erreur de vérification MFA.' });
    }
});


// ── POST /mfa/verify — verify TOTP during login (step 2) ─────────────────────
// Accepts a short-lived mfa_session token (issued after password check),
// verifies the TOTP code, and returns the real JWT + user.
router.post('/verify', async (req, res) => {
    try {
        const { mfa_session, code } = req.body;
        if (!mfa_session || !code) {
            return res.status(400).json({ error: 'Session MFA et code requis.' });
        }

        // Verify short-lived session token
        let decoded;
        try {
            decoded = jwt.verify(mfa_session, process.env.JWT_SECRET, { algorithms: ['HS256'] });
        } catch {
            return res.status(401).json({ error: 'Session MFA expirée. Reconnectez-vous.' });
        }

        if (decoded.type !== 'mfa_session') {
            return res.status(401).json({ error: 'Token invalide.' });
        }

        const user = await User.findOne({ where: { id: decoded.id, is_active: true } });
        if (!user || !user.mfa_enabled || !user.mfa_secret) {
            return res.status(401).json({ error: 'Utilisateur introuvable ou MFA non configuré.' });
        }

        const valid = speakeasy.totp.verify({
            secret:   user.mfa_secret,
            encoding: 'base32',
            token:    code.toString().replace(/\s/g, ''),
            window:   1,
        });

        if (!valid) {
            securityLog('MFA_LOGIN_INVALID_CODE', { ip: req.ip, userId: user.id });
            return res.status(400).json({ error: 'Code invalide ou expiré.' });
        }

        // Issue real JWT
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
            algorithm:  'HS256',
            expiresIn:  process.env.JWT_EXPIRE || '24h',
        });

        auditLog('MFA_LOGIN_SUCCESS', req, { userId: user.id });

        res.json({
            message: 'Authentification réussie.',
            token,
            user: {
                id: user.id, name: user.name, email: user.email,
                role: user.role, is_staff: user.is_staff,
                active_services: user.active_services || ['rider', 'renter'],
            },
        });
    } catch (err) {
        console.error('MFA verify error:', err);
        res.status(500).json({ error: 'Erreur de vérification MFA.' });
    }
});


// ── POST /mfa/disable — turn off MFA (requires valid TOTP confirmation) ───────
router.post('/disable', auth, async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'Code MFA requis pour désactiver.' });
        if (!req.user.mfa_enabled) {
            return res.status(400).json({ error: 'MFA n\'est pas activé.' });
        }

        const valid = speakeasy.totp.verify({
            secret:   req.user.mfa_secret,
            encoding: 'base32',
            token:    code.toString().replace(/\s/g, ''),
            window:   1,
        });

        if (!valid) {
            securityLog('MFA_DISABLE_INVALID_CODE', { ip: req.ip, userId: req.user.id });
            return res.status(400).json({ error: 'Code invalide.' });
        }

        await req.user.update({ mfa_enabled: false, mfa_secret: null });
        auditLog('MFA_DISABLED', req);

        res.json({ message: 'MFA désactivé.' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la désactivation MFA.' });
    }
});


// ── GET /mfa/status — check if MFA is enabled ────────────────────────────────
router.get('/status', auth, (req, res) => {
    res.json({ mfa_enabled: req.user.mfa_enabled || false });
});


module.exports = router;
