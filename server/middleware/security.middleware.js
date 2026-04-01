/**
 * OWASP Top 10 + Anti-Scanner / Anti-Pentest Security Middleware
 * Covers: A01 Access Control · A03 Injection · A04 Insecure Design
 *         A05 Misconfiguration · A07 Auth Failures · A09 Logging · A10 SSRF
 *         + Honeypot traps · HTTP method filtering · Progressive slow-down
 */

const rateLimit = require('express-rate-limit');
const slowDown  = require('express-slow-down');

// ── A09: Security Audit Logger ────────────────────────────────────────────────
const securityLog = (event, data = {}) => {
    const entry = {
        timestamp: new Date().toISOString(),
        event,
        ...data,
    };
    if (process.env.NODE_ENV !== 'test') {
        console.log('[SECURITY]', JSON.stringify(entry));
    }
};

// ── A07: Brute-force / Account Lockout ───────────────────────────────────────
// In-memory store — works for single-node; swap for Redis on multi-instance deploy
const loginAttempts = new Map();
const MAX_ATTEMPTS      = 5;
const LOCKOUT_MS        = 15 * 60 * 1000; // 15 minutes
const ATTEMPTS_WINDOW   = 10 * 60 * 1000; // 10 minutes sliding window

// identifier = phone OR email (phone-first auth, email for admin)
const _bruteKey = (ip, identifier) => `${ip}:${(identifier || '').toLowerCase().trim()}`;

const checkBruteForce = (req, res, next) => {
    const identifier = req.body?.phone || req.body?.email || '';
    const key   = _bruteKey(req.ip, identifier);
    const entry = loginAttempts.get(key);
    if (!entry) return next();

    if (entry.lockUntil > Date.now()) {
        const remainingMin = Math.ceil((entry.lockUntil - Date.now()) / 60000);
        securityLog('LOGIN_BLOCKED', { ip: req.ip, identifier, remainingMin });
        return res.status(429).json({
            error: `Compte bloqué. Réessayez dans ${remainingMin} minute(s).`,
            code: 'ACCOUNT_LOCKED',
            retry_after: remainingMin,
        });
    }
    next();
};

const recordFailedLogin = (ip, identifier) => {
    const key   = _bruteKey(ip, identifier);
    const now   = Date.now();
    const entry = loginAttempts.get(key) || { attempts: 0, firstAttempt: now, lockUntil: 0 };

    if (now - entry.firstAttempt > ATTEMPTS_WINDOW) {
        entry.attempts    = 0;
        entry.firstAttempt = now;
    }

    entry.attempts += 1;
    if (entry.attempts >= MAX_ATTEMPTS) {
        entry.lockUntil = now + LOCKOUT_MS;
        securityLog('BRUTE_FORCE_LOCKOUT', { ip, identifier, attempts: entry.attempts });
    }
    loginAttempts.set(key, entry);
    return entry.attempts;
};

const clearLoginAttempts = (ip, identifier) => {
    loginAttempts.delete(_bruteKey(ip, identifier));
};

// Clean up expired entries every hour
setInterval(() => {
    const cutoff = Date.now() - LOCKOUT_MS;
    for (const [key, entry] of loginAttempts.entries()) {
        if (entry.lockUntil < cutoff && entry.firstAttempt < cutoff) {
            loginAttempts.delete(key);
        }
    }
}, 60 * 60 * 1000);


// ── A04: Rate Limiters ────────────────────────────────────────────────────────
const globalRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/health',
    message: { error: 'Trop de requêtes. Réessayez dans 15 minutes.' },
    handler: (req, res, next, options) => {
        securityLog('RATE_LIMIT_HIT', { ip: req.ip, path: req.path });
        res.status(429).json(options.message);
    },
});

// Strict: login / register / password reset
const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Trop de tentatives d\'authentification. Réessayez dans 15 minutes.' },
    handler: (req, res, next, options) => {
        securityLog('AUTH_RATE_LIMIT', { ip: req.ip, path: req.path });
        res.status(429).json(options.message);
    },
});

// Admin panel endpoints
const adminRateLimit = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 400,
    message: { error: 'Trop de requêtes admin.' },
});

// File uploads — prevent abuse
const uploadRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    message: { error: 'Limite d\'envoi de fichiers atteinte. Réessayez dans 1 heure.' },
});


// ── A03: Input Sanitization (XSS + Null-byte injection) ──────────────────────
const _sanitizeValue = (val) => {
    if (typeof val !== 'string') return val;
    return val
        .replace(/\0/g, '')                        // null bytes
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '') // script tags
        .replace(/<[^>]+>/g, '')                   // all HTML tags
        .replace(/javascript\s*:/gi, '')           // javascript: URIs
        .replace(/on\w+\s*=/gi, '')                // inline event handlers
        .trim();
};

const _sanitizeObject = (obj, depth = 0) => {
    if (depth > 10 || !obj || typeof obj !== 'object') return;
    for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'string') {
            obj[key] = _sanitizeValue(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            _sanitizeObject(obj[key], depth + 1);
        } else if (Array.isArray(obj[key])) {
            obj[key] = obj[key].map(item =>
                typeof item === 'string' ? _sanitizeValue(item) : item
            );
        }
    }
};

const sanitizeMiddleware = (req, res, next) => {
    if (req.body)  _sanitizeObject(req.body);
    if (req.query) _sanitizeObject(req.query);
    next();
};


// ── A01: UUID Parameter Validation ───────────────────────────────────────────
// Prevents non-UUID strings from reaching DB queries (also blocks path traversal)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const validateUUIDParam = (...paramNames) => (req, res, next) => {
    const names = paramNames.length ? paramNames : ['id'];
    for (const name of names) {
        const val = req.params[name];
        if (val !== undefined && !UUID_RE.test(val)) {
            return res.status(400).json({ error: 'Identifiant de ressource invalide.' });
        }
    }
    next();
};


// ── A10: SSRF Protection — validate user-supplied URLs ────────────────────────
const PRIVATE_IP_RE  = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.0\.0\.0|::1|fc00:|fe80:)/i;
const BLOCKED_HOSTS  = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '169.254.169.254', 'metadata.google.internal']);
const ALLOWED_SCHEMES = ['https:', 'http:'];

const validateUserUrl = (url) => {
    if (!url) return true;
    try {
        const { protocol, hostname } = new URL(url);
        if (!ALLOWED_SCHEMES.includes(protocol))   return false;
        if (BLOCKED_HOSTS.has(hostname.toLowerCase())) return false;
        if (PRIVATE_IP_RE.test(hostname))           return false;
        return true;
    } catch {
        return false;
    }
};

// Middleware to validate URL fields in request body
const ssrfProtect = (urlFields = ['profile_photo', 'url', 'image_url', 'photo']) => (req, res, next) => {
    for (const field of urlFields) {
        if (req.body?.[field] && !validateUserUrl(req.body[field])) {
            securityLog('SSRF_ATTEMPT', { ip: req.ip, field, url: req.body[field] });
            return res.status(400).json({ error: `URL non autorisée dans le champ "${field}".` });
        }
    }
    next();
};


// ── A08: File Upload Security ─────────────────────────────────────────────────
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const ALLOWED_DOC_TYPES   = new Set([...ALLOWED_IMAGE_TYPES, 'application/pdf']);

// Magic byte signatures for image validation (first bytes of file)
const IMAGE_SIGNATURES = [
    { mime: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF] },
    { mime: 'image/png',  bytes: [0x89, 0x50, 0x4E, 0x47] },
    { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] },
    { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
];

const checkMagicBytes = (buffer, mimetype) => {
    const sig = IMAGE_SIGNATURES.find(s => s.mime === mimetype);
    if (!sig) return false;
    return sig.bytes.every((byte, i) => buffer[i] === byte);
};

const imageFileFilter = (req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
        return cb(new Error(`Type de fichier non autorisé. Formats acceptés: JPEG, PNG, WebP.`), false);
    }
    cb(null, true);
};

const docFileFilter = (req, file, cb) => {
    if (!ALLOWED_DOC_TYPES.has(file.mimetype)) {
        return cb(new Error(`Type de fichier non autorisé. Formats acceptés: JPEG, PNG, WebP, PDF.`), false);
    }
    cb(null, true);
};


// ── A05: Helmet Configuration ─────────────────────────────────────────────────
const helmetOptions = {
    contentSecurityPolicy: {
        directives: {
            defaultSrc:    ["'self'"],
            scriptSrc:     ["'self'"],
            styleSrc:      ["'self'", "'unsafe-inline'"],
            imgSrc:        ["'self'", 'data:', 'https:'],
            connectSrc:    ["'self'", 'wss:', 'ws:'],
            fontSrc:       ["'self'", 'https:'],
            objectSrc:     ["'none'"],
            frameSrc:      ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    hsts: {
        maxAge:            31536000, // 1 year
        includeSubDomains: true,
        preload:           true,
    },
    referrerPolicy:             { policy: 'strict-origin-when-cross-origin' },
    crossOriginEmbedderPolicy:  false, // Allow mixed uploads
    crossOriginResourcePolicy:  { policy: 'cross-origin' }, // Allow API access
};


// ── A09: Request ID + Audit Logging Middleware ────────────────────────────────
const requestId = (req, res, next) => {
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
    req.requestId = id;
    res.setHeader('X-Request-Id', id);
    next();
};

const auditLog = (action, req, extra = {}) => {
    securityLog(action, {
        requestId: req.requestId,
        ip:        req.ip,
        userId:    req.user?.id,
        method:    req.method,
        path:      req.path,
        ...extra,
    });
};


// ── A05: Production Error Handler (no stack traces) ───────────────────────────
const secureErrorHandler = (err, req, res, next) => {
    const isDev  = process.env.NODE_ENV === 'development';
    const status = err.status || err.statusCode || 500;

    securityLog('SERVER_ERROR', {
        requestId: req.requestId,
        ip:        req.ip,
        method:    req.method,
        path:      req.path,
        status,
        error:     err.message,
    });

    // Multer errors (file upload)
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'Fichier trop volumineux.' });
    }
    if (err.message?.includes('Type de fichier')) {
        return res.status(400).json({ error: err.message });
    }

    res.status(status).json({
        error: isDev ? err.message : 'Une erreur interne est survenue.',
        ...(isDev && { stack: err.stack, requestId: req.requestId }),
    });
};


// ── Anti-Scanner: Progressive Slow-Down ──────────────────────────────────────
// After 50 requests in 5min, each request gets +200ms delay (up to 2s).
// Automated scanners hit hundreds of routes fast — this makes it painful without blocking legit users.
const scanSlowDown = slowDown({
    windowMs:         5 * 60 * 1000,  // 5 min window
    delayAfter:       50,              // start slowing after 50 req
    delayMs:          () => 200,       // +200ms per extra request
    maxDelayMs:       2000,            // cap at 2s delay
    skip: (req) => req.path === '/health',
});

// Stricter slow-down for auth endpoints (after 5 req → slow)
const authSlowDown = slowDown({
    windowMs:         15 * 60 * 1000,
    delayAfter:       5,
    delayMs:          () => 500,       // +500ms per request after 5th
    maxDelayMs:       5000,            // cap at 5s — Hydra/Medusa dies here
});


// ── Anti-Scanner: Honeypot Routes ────────────────────────────────────────────
// Common paths scanners probe. Any hit = likely scanner/attacker → log + 404.
const HONEYPOT_PATHS = [
    '/admin', '/wp-admin', '/wp-login.php', '/phpmyadmin',
    '/.env', '/.git', '/config.php', '/config.yml', '/config.json',
    '/api/v1', '/api/v2',                      // version probing
    '/server-status', '/server-info',          // Apache info leak probes
    '/actuator', '/actuator/health',           // Spring Boot probes
    '/console', '/h2-console',                 // H2 DB console probes
    '/manager/html', '/manager/text',          // Tomcat manager probes
    '/solr', '/jmx-console',                   // JBoss/Solr probes
    '/login.php', '/login.asp', '/login.aspx', // tech fingerprinting
    '/index.php', '/index.asp',
    '/etc/passwd', '/etc/shadow',              // path traversal attempts
    '/proc/self/environ',
];

const honeypotMiddleware = (req, res, next) => {
    const path = req.path.toLowerCase();
    const isHoneypot = HONEYPOT_PATHS.some(p => path === p || path.startsWith(p + '/'));
    if (isHoneypot) {
        securityLog('HONEYPOT_HIT', {
            ip:     req.ip,
            path:   req.path,
            method: req.method,
            ua:     req.headers['user-agent'] || 'none',
            ref:    req.headers['referer']    || 'none',
        });
        // Return 404 — never reveal it's a trap, never 403 (that confirms path exists)
        return res.status(404).json({ error: 'Not found.' });
    }
    next();
};


// ── Anti-Scanner: HTTP Method Filtering ──────────────────────────────────────
// TRACE → Cross-Site Tracing (XST) attack vector.
// TRACK → same as TRACE, used by some older servers.
// Scanners also probe with OPTIONS on every route to fingerprint — reject silently.
const BLOCKED_METHODS = new Set(['TRACE', 'TRACK']);

const methodFilterMiddleware = (req, res, next) => {
    if (BLOCKED_METHODS.has(req.method)) {
        securityLog('BLOCKED_METHOD', { ip: req.ip, method: req.method, path: req.path });
        return res.status(405).json({ error: 'Method not allowed.' });
    }
    next();
};


// ── Anti-Scanner: User-Agent Filtering ───────────────────────────────────────
// Block known scanner/crawler user agents.
const BLOCKED_UA_PATTERNS = [
    /nikto/i, /sqlmap/i, /nmap/i, /masscan/i,
    /zgrab/i, /gobuster/i, /dirbuster/i, /dirb\b/i,
    /nuclei/i, /burpsuite/i, /whatweb/i, /wapiti/i,
    /metasploit/i, /hydra/i, /medusa/i,
    /w3af/i, /acunetix/i, /nessus/i, /openvas/i,
    /curl\/7\.[0-3]/i,  // very old curl versions — often used in scripts
];

const uaFilterMiddleware = (req, res, next) => {
    const ua = req.headers['user-agent'] || '';
    if (!ua) {
        // No UA at all is suspicious for a browser-facing API
        // Allow it (mobile apps sometimes omit UA) but log it
        // Only block if it's hitting sensitive paths
        if (req.path.startsWith('/api/admin') || req.path.startsWith('/api/staff')) {
            securityLog('NO_UA_ADMIN_ACCESS', { ip: req.ip, path: req.path });
        }
        return next();
    }
    if (BLOCKED_UA_PATTERNS.some(p => p.test(ua))) {
        securityLog('SCANNER_UA_BLOCKED', { ip: req.ip, ua, path: req.path });
        return res.status(403).json({ error: 'Accès refusé.' });
    }
    next();
};


// ── A07: Password Strength Policy ────────────────────────────────────────────
const validatePasswordStrength = (password) => {
    if (!password || password.length < 8) {
        return 'Le mot de passe doit contenir au moins 8 caractères.';
    }
    if (!/[A-Za-z]/.test(password)) {
        return 'Le mot de passe doit contenir au moins une lettre.';
    }
    if (!/[0-9]/.test(password)) {
        return 'Le mot de passe doit contenir au moins un chiffre.';
    }
    return null; // valid
};


module.exports = {
    // Rate limiters
    globalRateLimit,
    authRateLimit,
    adminRateLimit,
    uploadRateLimit,
    // Anti-scanner
    scanSlowDown,
    authSlowDown,
    honeypotMiddleware,
    methodFilterMiddleware,
    uaFilterMiddleware,
    // Brute force
    checkBruteForce,
    recordFailedLogin,
    clearLoginAttempts,
    // Sanitization
    sanitizeMiddleware,
    // Validation
    validateUUIDParam,
    validatePasswordStrength,
    // SSRF
    validateUserUrl,
    ssrfProtect,
    // File uploads
    imageFileFilter,
    docFileFilter,
    checkMagicBytes,
    ALLOWED_IMAGE_TYPES,
    ALLOWED_DOC_TYPES,
    // Logging
    securityLog,
    auditLog,
    requestId,
    // Helmet
    helmetOptions,
    // Error handler
    secureErrorHandler,
};
