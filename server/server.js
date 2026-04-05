const Sentry = require('@sentry/node');

Sentry.init({
    dsn: 'http://11207bb5d51c48019375f95da8f150d8@37.60.240.199:8765/5',
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: 0.01,
    autoSessionTracking: false,
});

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const { testConnection, syncDatabase, seedSettings, seedWalletFeatures, seedCommissionRules, seedCashbackRules, seedWallets } = require('./models');
const { initializeSocket } = require('./services/socket.service');
const {
    globalRateLimit,
    authRateLimit,
    adminRateLimit,
    sanitizeMiddleware,
    requestId,
    helmetOptions,
    secureErrorHandler,
    scanSlowDown,
    honeypotMiddleware,
    methodFilterMiddleware,
    uaFilterMiddleware,
} = require('./middleware/security.middleware');

const swaggerUi          = require('swagger-ui-express');
const swaggerSpec        = require('./swagger.spec');

const authRoutes         = require('./routes/auth.routes');
const vehicleRoutes      = require('./routes/vehicle.routes');
const rideRoutes         = require('./routes/ride.routes');
const adminRoutes        = require('./routes/admin.routes');
const rentalRoutes       = require('./routes/rental.routes');
const walletRoutes       = require('./routes/wallet.routes');
const { router: couponRoutes } = require('./routes/coupon.routes');
const verificationRoutes = require('./routes/verification.routes');
const carListingRoutes   = require('./routes/car-listing.routes');
const productRoutes      = require('./routes/product.routes');
const orderRoutes        = require('./routes/order.routes');
const deliveryRoutes     = require('./routes/delivery.routes');
const supportRoutes      = require('./routes/support.routes');
const staffRoutes        = require('./routes/staff.routes');
const mfaRoutes          = require('./routes/mfa.routes');

const app    = express();
const server = http.createServer(app);

// ── A02 + A05: CORS — lock to known origins in production ────────────────────
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000']; // admin + dev

const corsOptions = {
    origin: (origin, cb) => {
        // Allow mobile apps (no origin) + whitelisted origins
        if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
        cb(new Error('CORS: origin not allowed'));
    },
    methods:            ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders:     ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders:     ['X-Request-Id'],
    credentials:        true,
    optionsSuccessStatus: 200,
};

const io = new Server(server, {
    cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'], credentials: true },
});

// ── Security middleware stack (order matters) ────────────────────────────────
app.set('trust proxy', 1);                           // trust reverse proxy for real IP
app.use(requestId);                                  // A09: unique request ID
app.use(methodFilterMiddleware);                     // Anti-scanner: block TRACE/TRACK
app.use(uaFilterMiddleware);                         // Anti-scanner: block known scanner UAs
app.use(honeypotMiddleware);                         // Anti-scanner: trap common probe paths
app.use(helmet(helmetOptions));                      // A05: security headers
app.use(compression());
app.use(cors(corsOptions));                          // A05: locked CORS

// Reduce body limits — large limits enable DoS via body inflation
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.use(sanitizeMiddleware);                         // A03: strip XSS from all input
app.use(globalRateLimit);                            // A04: global rate limit
app.use(scanSlowDown);                               // Anti-scanner: progressive delay after 50 req

// Static uploads — no directory listing, cache control
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    dotfiles: 'deny',
    etag: true,
    setHeaders: (res) => {
        res.set('X-Content-Type-Options', 'nosniff');
        res.set('Cache-Control', 'public, max-age=86400');
    },
}));

app.set('io', io);

// ── Documentation Swagger (CSP assoupli pour /api-docs uniquement) ───────────
const swaggerCsp = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc:  ["'self'", "'unsafe-inline'"],
            styleSrc:   ["'self'", "'unsafe-inline'"],
            imgSrc:     ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
        },
    },
});
const swaggerUiOpts = {
    customSiteTitle: 'Ombia Express — API Docs',
    customCss: `
        .topbar { background: #1A2E48 !important; }
        .topbar-wrapper .link { pointer-events: none; }
        .swagger-ui .info .title { color: #1A2E48; }
        .swagger-ui .btn.authorize { background: #FFA726; border-color: #FFA726; color: #fff; }
        .swagger-ui .btn.authorize svg { fill: #fff; }
    `,
};
app.use('/api-docs', swaggerCsp, swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOpts));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

// ── Health check (no auth, no rate limit) ────────────────────────────────────
app.get('/health', (req, res) => res.json({
    status:    'OK',
    timestamp: new Date().toISOString(),
    uptime:    Math.floor(process.uptime()),
}));

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/vehicles',      vehicleRoutes);
app.use('/api/rides',         rideRoutes);
app.use('/api/rentals',       rentalRoutes);
app.use('/api/wallet',        walletRoutes);
app.use('/api/coupons',       couponRoutes);
app.use('/api/verifications', verificationRoutes);
app.use('/api/car-listings',  carListingRoutes);
app.use('/api/products',      productRoutes);
app.use('/api/orders',        orderRoutes);
app.use('/api/deliveries',    deliveryRoutes);
app.use('/api/support',       supportRoutes);

// Admin routes — extra rate limit layer
app.use('/api/admin',  adminRateLimit, adminRoutes);
app.use('/api/staff',  adminRateLimit, staffRoutes);
app.use('/api/mfa',    authRateLimit,  mfaRoutes);

// ── 404 + Error handlers ─────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route introuvable.' }));
Sentry.setupExpressErrorHandler(app);                // capture errors before secureErrorHandler
app.use(secureErrorHandler);                         // A05: no stack traces in prod

// ── Socket.io ────────────────────────────────────────────────────────────────
initializeSocket(io);

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        console.log('Connecting to database...');
        const ok = await testConnection();
        if (!ok) { console.error('Failed to connect to database'); process.exit(1); }

        console.log('Synchronizing database...');
        await syncDatabase();
        await seedSettings();
        await seedWalletFeatures();
        await seedCommissionRules();
        await seedCashbackRules();
        await seedWallets();

        server.listen(PORT, () => {
            console.log('');
            console.log('================================');
            console.log(`Server running on port ${PORT}`);
            console.log(`API: http://localhost:${PORT}/api`);
            console.log('================================');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT',  () => server.close(() => process.exit(0)));

startServer();
module.exports = app;
