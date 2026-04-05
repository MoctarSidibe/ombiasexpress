/**
 * Ombia Express — Serveur de documentation API (Swagger UI)
 * Port : 5002
 * Accès : http://SERVER:5002
 */
const express    = require('express');
const swaggerUi  = require('swagger-ui-express');
const spec       = require('./swagger.spec');

const app  = express();
const PORT = process.env.SWAGGER_PORT || 5002;

// ── Options UI personnalisées ─────────────────────────────────────────────────
const swaggerOptions = {
    customSiteTitle: 'Ombia Express — API Docs',
    customfavIcon:   '/favicon.ico',
    customCss: `
        .topbar { background: #1A2E48 !important; }
        .topbar-wrapper img { content: url('http://37.60.240.199:5001/uploads/logo.png'); height: 40px; }
        .topbar-wrapper .link { display: none; }
        .swagger-ui .info .title { color: #1A2E48; }
        .swagger-ui .info .title small { background: #FFA726; }
        .swagger-ui .btn.authorize { background: #FFA726; border-color: #FFA726; color: #fff; }
        .swagger-ui .btn.authorize svg { fill: #fff; }
        .swagger-ui .opblock.opblock-get    .opblock-summary-method { background: #1565C0; }
        .swagger-ui .opblock.opblock-post   .opblock-summary-method { background: #2E7D32; }
        .swagger-ui .opblock.opblock-put    .opblock-summary-method { background: #E65100; }
        .swagger-ui .opblock.opblock-patch  .opblock-summary-method { background: #6A1B9A; }
        .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: #C62828; }
        .swagger-ui .scheme-container { background: #F8F9FA; padding: 16px; }
    `,
};

// ── Page d'accueil simple ─────────────────────────────────────────────────────
app.get('/', (req, res) => res.redirect('/docs'));

// ── Swagger UI ───────────────────────────────────────────────────────────────
app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec, swaggerOptions));

// ── Spec JSON brut (utile pour Postman / import) ─────────────────────────────
app.get('/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(spec);
});

// ── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'OK', port: PORT }));

app.listen(PORT, () => {
    console.log('');
    console.log('================================');
    console.log(`📖 Docs Ombia Express`);
    console.log(`   http://localhost:${PORT}/docs`);
    console.log('================================');
});
