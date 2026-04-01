/**
 * Auth Middleware
 * A02: Cryptographic Failures — explicit HS256, Redis-backed blacklist
 * A07: Auth Failures — token blacklist survives restart, RBAC
 * A01: Broken Access Control — staff permissions, audit log
 */
const jwt    = require('jsonwebtoken');
const redis  = require('redis');
const { User, AdminStaff, AdminRole } = require('../models');
const { securityLog, auditLog } = require('./security.middleware');

// ── Redis client — with in-memory fallback if Redis not available ─────────────
let redisClient = null;
const inMemoryBlacklist = new Set(); // fallback

const initRedis = async () => {
    if (!process.env.REDIS_URL && !process.env.REDIS_HOST) return; // Redis not configured
    try {
        redisClient = redis.createClient({
            url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`,
        });
        redisClient.on('error', (err) => {
            securityLog('REDIS_ERROR', { error: err.message });
            redisClient = null; // fall back to in-memory on error
        });
        await redisClient.connect();
        securityLog('REDIS_CONNECTED', { mode: 'token-blacklist' });
    } catch (err) {
        securityLog('REDIS_UNAVAILABLE', { error: err.message, fallback: 'in-memory' });
        redisClient = null;
    }
};
initRedis();


// ── JWT Blacklist — Redis-backed, in-memory fallback ─────────────────────────
const JWT_EXPIRE_SECONDS = (() => {
    const exp = process.env.JWT_EXPIRE || '24h';
    if (exp.endsWith('h')) return parseInt(exp) * 3600;
    if (exp.endsWith('d')) return parseInt(exp) * 86400;
    return 86400;
})();

const blacklistToken = async (token) => {
    if (!token) return;
    try {
        if (redisClient?.isOpen) {
            // Store until the token would naturally expire (TTL = JWT expiry)
            await redisClient.setEx(`bl:${token}`, JWT_EXPIRE_SECONDS, '1');
        } else {
            inMemoryBlacklist.add(token);
            // Auto-clean in-memory after JWT_EXPIRE_SECONDS
            setTimeout(() => inMemoryBlacklist.delete(token), JWT_EXPIRE_SECONDS * 1000);
        }
    } catch {
        inMemoryBlacklist.add(token);
    }
};

const isBlacklisted = async (token) => {
    try {
        if (redisClient?.isOpen) {
            const result = await redisClient.exists(`bl:${token}`);
            return result === 1;
        }
    } catch { /* fall through to in-memory */ }
    return inMemoryBlacklist.has(token);
};


// ── auth: verify JWT, attach user + staff permissions ─────────────────────────
const auth = async (req, res, next) => {
    try {
        const header = req.header('Authorization');
        if (!header?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentification requise.' });
        }

        const token = header.slice(7);

        // A07: reject blacklisted (logged-out) tokens
        if (await isBlacklisted(token)) {
            return res.status(401).json({ error: 'Session expirée. Veuillez vous reconnecter.', code: 'TOKEN_BLACKLISTED' });
        }

        // A02: explicit algorithm — blocks alg:none and RS256↔HS256 confusion
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

        const user = await User.findOne({ where: { id: decoded.id, is_active: true } });
        if (!user) {
            return res.status(401).json({ error: 'Utilisateur introuvable ou désactivé.' });
        }

        req.user  = user;
        req.token = token;

        // Attach staff permissions for requirePermission()
        if (user.is_staff) {
            const staff = await AdminStaff.findOne({
                where:   { user_id: user.id, is_active: true },
                include: [{ model: AdminRole, as: 'role' }],
            });
            req.user._staffPermissions = staff?.role?.permissions || [];
        }

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Session expirée. Veuillez vous reconnecter.', code: 'TOKEN_EXPIRED' });
        }
        if (error.name === 'JsonWebTokenError') {
            securityLog('INVALID_TOKEN', { ip: req.ip, path: req.path });
            return res.status(401).json({ error: 'Token invalide.' });
        }
        res.status(401).json({ error: 'Erreur d\'authentification.' });
    }
};


// ── requireRole ───────────────────────────────────────────────────────────────
const requireRole = (...roles) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentification requise.' });
    const active = req.user.active_services || [req.user.role];
    const ok     = roles.some(r => r === req.user.role || active.includes(r));
    if (!ok) {
        auditLog('ACCESS_DENIED', req, { requiredRoles: roles, userRole: req.user.role });
        return res.status(403).json({ error: `Accès refusé. Rôle requis : ${roles.join(' ou ')}.` });
    }
    next();
};


// ── requirePermission ─────────────────────────────────────────────────────────
const requirePermission = (permission) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentification requise.' });
    if (req.user.role === 'admin') return next();
    if (!req.user.is_staff) {
        auditLog('PERMISSION_DENIED', req, { permission });
        return res.status(403).json({ error: 'Accès refusé.' });
    }
    const perms = req.user._staffPermissions || [];
    if (!perms.includes(permission)) {
        auditLog('PERMISSION_DENIED', req, { permission, staffPerms: perms });
        return res.status(403).json({ error: `Permission requise : ${permission}.` });
    }
    next();
};


// ── adminGate ─────────────────────────────────────────────────────────────────
const adminGate = (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentification requise.' });
    if (req.user.role === 'admin' || req.user.is_staff) return next();
    auditLog('ADMIN_ACCESS_DENIED', req);
    return res.status(403).json({ error: 'Accès réservé aux administrateurs.' });
};


// ── superAdminOnly ────────────────────────────────────────────────────────────
const superAdminOnly = (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentification requise.' });
    if (req.user.role !== 'admin') {
        auditLog('SUPER_ADMIN_DENIED', req);
        return res.status(403).json({ error: 'Accès super-administrateur requis.' });
    }
    next();
};


module.exports = {
    auth,
    blacklistToken,
    isBlacklisted,
    requireRole,
    requirePermission,
    adminGate,
    superAdminOnly,
};
