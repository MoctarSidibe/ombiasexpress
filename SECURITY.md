# Security Dossier — Ombia Express
> Last updated: 2026-03-23 | Stack: Node.js + Express + PostgreSQL + React Native (Expo) + React Admin

---

## 🚨 CRITICAL — Read Before Deploy

| Risk | Issue | Action Required |
|------|-------|----------------|
| 🔴 **DEFAULT PASSWORD** | `HOW_TO_RUN.md` contains `admin123` | Change ALL admin passwords before launch |
| 🔴 **JWT SECRET** | If `JWT_SECRET` is weak/default → tokens can be forged | Set a 64-char random secret (see below) |
| 🔴 **Google Maps Keys** | Placeholders in `app.json` | Replace or remove if using OSM |
| 🔴 **EAS Project ID** | Placeholder in `app.json` | Run `eas init` before building |
| 🟠 **HTTPS** | Server currently runs HTTP | Put behind Nginx/Caddy with TLS in production |
| 🟠 **ALLOWED_ORIGINS** | Defaults to localhost only | Set to your real domain in `.env` |

---

## 📁 Security Files Quick Reference

```
server/
├── middleware/
│   ├── security.middleware.js    ← Rate limits, brute force, sanitization, SSRF, logging,
│   │                                honeypot, slow-down, method filter, UA filter
│   └── auth.middleware.js        ← JWT verify (HS256), blacklist, RBAC
├── routes/
│   └── auth.routes.js            ← Login with lockout, logout blacklist, password policy
└── server.js                     ← Helmet, CORS, body limits, middleware order

mobile/
└── src/
    ├── context/AuthContext.js    ← SecureStore for token, server-side logout
    └── services/api.service.js   ← SecureStore token injection, 401 handler

admin/
└── src/
    └── api.js                    ← adminLogout() blacklists token on server
```

---

## OWASP Top 10 — Implementation Map

### A01 · Broken Access Control
**Where:** `auth.middleware.js`, `security.middleware.js`

| Control | Implementation | File |
|---------|---------------|------|
| RBAC | `adminGate` / `superAdminOnly` / `requirePermission(key)` | auth.middleware.js |
| Token blacklist | `blacklistToken()` — invalidates JWT immediately on logout | auth.middleware.js |
| UUID validation | `validateUUIDParam()` — blocks path traversal & malformed IDs | security.middleware.js |
| Audit log | `auditLog()` — logs every access denial with IP + userId | security.middleware.js |
| Staff permissions | `req.user._staffPermissions` loaded fresh from DB on every request | auth.middleware.js |

**Test it:**
```bash
# Try accessing admin with a regular user token → 403
curl -H "Authorization: Bearer <user_token>" http://localhost:5000/api/admin/stats

# Try a non-UUID ID → 400
curl http://localhost:5000/api/rides/../../etc/passwd
```

---

### A02 · Cryptographic Failures
**Where:** `auth.middleware.js`, `AuthContext.js`, `api.service.js`

| Control | Implementation |
|---------|---------------|
| JWT algorithm | Explicitly `{ algorithms: ['HS256'] }` — blocks algorithm confusion (none/RS256 swap) |
| Token storage | `expo-secure-store` — hardware-encrypted keychain on device, not AsyncStorage |
| Password hashing | `bcryptjs` with salt rounds 10 |
| HTTPS headers | HSTS: `max-age=31536000; includeSubDomains; preload` via Helmet |

**Generate a strong JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Test it:**
```bash
# Try algorithm confusion — forge a token with alg: none
# Our server rejects it because we explicitly require HS256
```

---

### A03 · Injection
**Where:** `security.middleware.js` (applied globally in `server.js`)

| Control | Implementation |
|---------|---------------|
| XSS sanitization | `sanitizeMiddleware` strips `<script>`, HTML tags, `javascript:`, null bytes from ALL body/query |
| SQL injection | Sequelize ORM with parameterized queries — raw SQL is not used anywhere |
| UUID validation | Non-UUID route params rejected before reaching DB |

**sanitizeMiddleware strips:**
```
<script>alert(1)</script>   → (removed)
javascript:alert(1)         → (removed)
onload=alert(1)             → (removed)
\x00\x00\x00               → (removed, null bytes)
```

**Test it:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "<script>alert(1)</script>", "email": "test@test.com", "password": "Test1234"}'
# name field will be sanitized to empty string → validation error
```

---

### A04 · Insecure Design
**Where:** `security.middleware.js`, `server.js`

| Control | Value | Scope |
|---------|-------|-------|
| Global rate limit | 300 req / 15 min | All routes |
| Auth rate limit | 15 req / 15 min | `/api/auth/login`, `/api/auth/register` |
| Admin rate limit | 400 req / 5 min | `/api/admin/*`, `/api/staff/*` |
| Upload rate limit | 30 uploads / hr | All `/upload` endpoints |
| Body size limit | 2MB | All routes |
| Brute force lockout | 5 attempts → 15 min lockout | Login |

**Rate limit headers returned:**
```
RateLimit-Limit: 300
RateLimit-Remaining: 299
RateLimit-Reset: 1711234567
```

---

### A05 · Security Misconfiguration
**Where:** `server.js` (Helmet config), CORS, error handler

**Helmet headers applied:**
```
Content-Security-Policy: default-src 'self'; script-src 'self'; ...
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
X-Powered-By: (removed — server fingerprint hidden)
```

**CORS:** Only `ALLOWED_ORIGINS` env var is permitted. Mobile apps (no `Origin` header) are allowed.

**Error responses in production:**
```json
{ "error": "Une erreur interne est survenue." }
```
No stack traces, no file paths, no Sequelize error details.

**Test it:**
```bash
# Check headers
curl -I http://localhost:5000/health

# Verify X-Powered-By is gone
curl -I http://localhost:5000/health | grep -i "powered"
# → should return nothing
```

---

### A06 · Vulnerable Components
**Status:** 0 vulnerabilities (ran `npm audit fix` — 4 pre-existing issues resolved)

```bash
# Re-check anytime
cd server && npm audit
cd mobile && npm audit
cd admin && npm audit
```

**Keep updated:**
```bash
# Check outdated packages
npm outdated

# Update safely
npm update
```

---

### A07 · Identification & Authentication Failures
**Where:** `auth.routes.js`, `auth.middleware.js`, `AuthContext.js`

| Control | Implementation |
|---------|---------------|
| Brute force protection | 5 failed logins → 15 min lockout per IP+email |
| Generic error | "Email ou mot de passe incorrect" — does NOT reveal if email exists |
| Attempt counter | Shown: "3 tentatives restantes" |
| Token blacklist | `POST /auth/logout` adds token to in-memory blacklist |
| JWT expiry | `JWT_EXPIRE` env var (default `7d` — set to `24h` for production) |
| Algorithm pinning | `{ algorithms: ['HS256'] }` on every `jwt.verify()` |
| Password policy | Min 8 chars + at least 1 letter + 1 digit |
| Session on logout | Server invalidates token + client deletes from SecureStore |

**Brute force config (security.middleware.js):**
```js
const MAX_ATTEMPTS    = 5;
const LOCKOUT_MS      = 15 * 60 * 1000;  // 15 min
const ATTEMPTS_WINDOW = 10 * 60 * 1000;  // sliding 10 min window
```

**Test it:**
```bash
# Trigger lockout
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"victim@test.com","password":"wrong"}'
done
# 6th attempt → 429 with "Compte bloqué"
```

---

### A08 · Software & Data Integrity Failures
**Where:** `security.middleware.js`, all upload routes

| Control | Implementation |
|---------|---------------|
| MIME whitelist | Only `image/jpeg`, `image/png`, `image/webp` accepted |
| No wildcard | `image/*` replaced with explicit list |
| File size limit | 5MB max (was 8MB) |
| Upload rate limit | 30/hr per IP |
| JWT algorithm | `HS256` explicit — rejects tampered headers |

**Files processed:** `verification.routes.js`, `car-listing.routes.js`, `product.routes.js`

---

### A09 · Security Logging & Monitoring
**Where:** `security.middleware.js` → `securityLog()` + `auditLog()`

**Events logged with `[SECURITY]` prefix:**

| Event | Trigger |
|-------|---------|
| `LOGIN_SUCCESS` | Successful login |
| `LOGIN_FAILED` | Wrong password (includes attempt count) |
| `BRUTE_FORCE_LOCKOUT` | 5th failed attempt |
| `LOGIN_BLOCKED` | Request during active lockout |
| `AUTH_RATE_LIMIT` | Auth rate limit exceeded |
| `RATE_LIMIT_HIT` | Global rate limit exceeded |
| `LOGOUT` | User logged out |
| `INVALID_TOKEN` | Malformed JWT received |
| `ACCESS_DENIED` | `requireRole` denied |
| `PERMISSION_DENIED` | `requirePermission` denied |
| `ADMIN_ACCESS_DENIED` | `adminGate` denied |
| `SUPER_ADMIN_DENIED` | `superAdminOnly` denied |
| `SSRF_ATTEMPT` | Blocked URL in user input |
| `SERVER_ERROR` | Unhandled 500 error |

**Log format:**
```json
{
  "timestamp": "2026-03-23T14:32:11.000Z",
  "event": "LOGIN_FAILED",
  "requestId": "lp4x2k-a9b3c",
  "ip": "203.0.113.42",
  "email": "victim@test.com",
  "attempts": 3
}
```

**Production:** Pipe server output to a log aggregator (Datadog, Papertrail, Logtail):
```bash
node server.js 2>&1 | grep "\[SECURITY\]" >> /var/log/ombia-security.log
```

---

### A10 · Server-Side Request Forgery (SSRF)
**Where:** `security.middleware.js` → `ssrfProtect()`, applied on `PUT /auth/profile`

**Blocked:**
```
localhost, 127.0.0.1, 0.0.0.0, ::1
10.x.x.x, 172.16-31.x.x, 192.168.x.x  (private IP ranges)
169.254.169.254                          (AWS/GCP metadata endpoint)
metadata.google.internal
Non-HTTP/HTTPS schemes (ftp://, file://, etc.)
```

**Test it:**
```bash
# Try SSRF via profile photo field
curl -X PUT http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"profile_photo": "http://169.254.169.254/latest/meta-data/"}'
# → 400: URL non autorisée
```

---

## 🛡️ Anti-Scanner & Anti-Pentest Hardening
> All controls below are **coded and active** in `security.middleware.js` + `server.js`

### What Scanners/Pentests Try — And What Stops Them

| Tool | Attack | Status | Our Defense |
|------|--------|--------|-------------|
| **Nmap** | Port + service scanning | ✅ Coded | Helmet removes `X-Powered-By`/`Server`; no version disclosure |
| **Nikto** | Vulnerability/config scanner | ✅ Coded | Honeypot catches `/admin`, `/.env`, `/phpmyadmin` etc.; generic 404 |
| **DirBuster / Gobuster** | Route enumeration | ✅ Coded | Rate limit (300/15min) + progressive slow-down (50 req → +200ms/req, max 2s) |
| **Hydra / Medusa** | Password brute force | ✅ Coded | 5-attempt lockout + auth slow-down (+500ms/req after 5th, max 5s) |
| **sqlmap** | SQL injection | ✅ Coded | Sequelize ORM (no raw SQL) + UUID validation blocks payloads |
| **Burp Suite** | Auth fuzz, XSS, SQLi | ✅ Coded | Input sanitization strips HTML/`<script>`/null bytes from all input |
| **JWT_Tool** | alg:none, RS256→HS256 | ✅ Coded | Explicit `algorithms: ['HS256']` on every `jwt.verify()` |
| **OWASP ZAP** | Automated web app scan | ✅ Coded | CSP, HSTS, sanitization, rate limits stop most auto-findings |
| **Masscan / ZGrab** | Mass port/banner scan | ✅ Coded | UA filter blocks `masscan`, `zgrab` user agents |
| **Nuclei** | Template-based vulns | ✅ Coded | UA filter blocks `nuclei`; honeypot traps common probe paths |
| **TRACE / TRACK** | Cross-Site Tracing (XST) | ✅ Coded | `methodFilterMiddleware` returns 405 for TRACE/TRACK |

### Coded Controls Summary (security.middleware.js)

#### 1. Progressive Slow-Down (`scanSlowDown` + `authSlowDown`)
```
Global:  after 50 req/5min → +200ms each (max 2s) — makes scanners crawl
Auth:    after 5 req/15min → +500ms each (max 5s) — kills Hydra/Medusa
```

#### 2. Honeypot Routes (`honeypotMiddleware`)
Any hit on these paths is logged as `HONEYPOT_HIT` with IP + User-Agent:
```
/admin  /wp-admin  /wp-login.php  /phpmyadmin
/.env   /.git      /config.php    /config.yml
/api/v1 /api/v2    /server-status /actuator
/login.php  /index.php  /etc/passwd  /proc/self/environ
... (20+ paths total)
```
All return `404 Not found` — attacker never knows it's a trap.

#### 3. HTTP Method Filter (`methodFilterMiddleware`)
`TRACE` and `TRACK` → `405 Method not allowed` (blocks XST attacks)

#### 4. User-Agent Filter (`uaFilterMiddleware`)
Blocked scanners/tools:
```
nikto  sqlmap  nmap  masscan  zgrab  gobuster  dirbuster
nuclei  burpsuite  whatweb  wapiti  metasploit
hydra  medusa  w3af  acunetix  nessus  openvas
```

### Additional Hardening (Infra — Recommended for Production)

#### 1. Put Behind Nginx as Reverse Proxy
```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # Hide upstream server info
    proxy_hide_header X-Powered-By;
    proxy_hide_header Server;

    # Rate limit at nginx level (extra layer)
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
    limit_req zone=api burst=50 nodelay;

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

#### 2. Fail2ban — Auto-ban Attacking IPs
```ini
# /etc/fail2ban/filter.d/ombia.conf
[Definition]
failregex = \[SECURITY\].*"event":"BRUTE_FORCE_LOCKOUT".*"ip":"<HOST>"
            \[SECURITY\].*"event":"RATE_LIMIT_HIT".*"ip":"<HOST>"

# /etc/fail2ban/jail.d/ombia.conf
[ombia]
enabled  = true
filter   = ombia
logpath  = /var/log/ombia-security.log
maxretry = 3
bantime  = 3600
findtime = 600
```

#### 3. Honeypot Routes (Trap Scanners)
Add to `server.js` — any hit on these paths = likely scanner/attacker:
```js
const HONEYPOT_PATHS = ['/admin', '/wp-admin', '/phpmyadmin', '/.env', '/config.php', '/api/v1'];
app.use((req, res, next) => {
    if (HONEYPOT_PATHS.some(p => req.path.startsWith(p))) {
        console.log('[SECURITY]', JSON.stringify({
            event: 'HONEYPOT_HIT',
            ip: req.ip,
            path: req.path,
            ua: req.headers['user-agent'],
        }));
        return res.status(404).json({ error: 'Not found' }); // don't reveal it's a trap
    }
    next();
});
```

#### 4. Hide Route Existence (Anti-enumeration)
Our 404 is already generic: `{ "error": "Route introuvable." }`
Never return different errors for "route not found" vs "unauthorized" on sensitive paths.

#### 5. Disable HTTP Methods Not Used
```js
// Add to server.js — reject TRACE (XST attack) and others
app.use((req, res, next) => {
    if (['TRACE', 'TRACK', 'OPTIONS'].includes(req.method) && req.path !== '/') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    next();
});
```

---

## 🔑 Environment Variables — Security Reference

### server/.env (required for production)

```env
# Database
DATABASE_URL=postgres://user:strongpassword@localhost:5432/ombia_prod

# JWT — generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=<64-char-random-hex>
JWT_EXPIRE=24h

# CORS — comma-separated list of allowed origins (no wildcards in prod)
ALLOWED_ORIGINS=https://admin.yourdomain.com,https://yourdomain.com

# Admin creation secret
ADMIN_SECRET=<random-strong-secret>

# Server
PORT=5000
NODE_ENV=production
CLIENT_URL=https://admin.yourdomain.com

# Optional: Stripe
STRIPE_SECRET_KEY=sk_live_...
```

### mobile/.env (Expo)

```env
EXPO_PUBLIC_API_URL=https://api.yourdomain.com/api
EXPO_PUBLIC_SOCKET_URL=https://api.yourdomain.com
```

### admin/.env (Vite)

```env
VITE_API_URL=https://api.yourdomain.com/api
```

---

## ✅ Pre-Deploy Security Checklist

### Server
- [ ] `NODE_ENV=production` set
- [ ] `JWT_SECRET` is 64+ chars random (not "secret123")
- [ ] `ALLOWED_ORIGINS` set to real domains (not `*`)
- [ ] `JWT_EXPIRE=24h` (not 7d)
- [ ] HTTPS/TLS enabled (via Nginx or Caddy)
- [ ] PostgreSQL password is strong, not default
- [ ] Firewall: only ports 80, 443, 22 (SSH) open
- [ ] `npm audit` returns 0 vulnerabilities
- [ ] Server logs piped to persistent storage

### Admin Panel
- [ ] Default `admin123` password changed
- [ ] Admin account uses strong password (12+ chars)
- [ ] Admin panel served only over HTTPS
- [ ] `adminLogout()` calls server to blacklist token

### Mobile App
- [ ] `expo-secure-store` installed and token stored securely
- [ ] `EXPO_PUBLIC_API_URL` points to HTTPS endpoint
- [ ] `EAS_PROJECT_ID` set (real value from `eas init`)
- [ ] Google Maps API keys restricted to app bundle ID (if using Google Maps)
- [ ] Push notification certificates configured

### Database
- [ ] PostgreSQL not exposed on public IP (bind to 127.0.0.1)
- [ ] DB user has only necessary permissions (no superuser)
- [ ] Regular backups configured
- [ ] `pg_hba.conf` — only localhost connections

---

## 🔍 How to Test Security Locally

### Test Rate Limiting
```bash
# Trigger global rate limit (send 301+ requests)
for i in $(seq 1 310); do curl -s http://localhost:5000/health > /dev/null; done
# After 300 → 429 Too Many Requests

# Test auth rate limit (login 16+ times)
for i in $(seq 1 16); do
  curl -s -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"x@x.com","password":"wrong"}' | jq .error
done
```

### Test Brute Force Lockout
```bash
for i in {1..6}; do
  echo "Attempt $i:"
  curl -s -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@ombia.com","password":"WrongPassword1"}' | python3 -m json.tool
done
```

### Test XSS Sanitization
```bash
curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"<img src=x onerror=alert(1)>","email":"xss@test.com","phone":"0600000000","password":"Secure123"}'
# name should be sanitized → empty → validation error
```

### Test SSRF Protection
```bash
curl -s -X PUT http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"profile_photo":"http://192.168.1.1/admin"}'
# → 400: URL non autorisée
```

### Test JWT Algorithm Confusion
```bash
# Create a "none" algorithm token manually and try to use it
# Our server rejects any token not signed with HS256
```

### Test Logout Blacklist
```bash
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"Password1"}' | jq -r .token)

# Use the token → works
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/auth/profile

# Logout → blacklists the token
curl -s -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"

# Try again → 401 Session expirée
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/auth/profile
```

---

## 🚑 Incident Response

### If a Pentest Finds a Critical Issue
1. Check `[SECURITY]` logs immediately for exploit attempts
2. Rotate `JWT_SECRET` → all active sessions invalidated
3. If DB breach suspected → rotate DB password + audit all admin accounts
4. Use `tokenBlacklist` (in-memory) → for Redis migration see below

### Scaling to Multi-Node (Redis Blacklist)
When deploying multiple server instances, the in-memory JWT blacklist won't sync between nodes. Replace with Redis:

```js
// In auth.middleware.js — swap in-memory Set for Redis
const redis = require('redis');
const client = redis.createClient({ url: process.env.REDIS_URL });

const blacklistToken = async (token, expiresIn = 86400) => {
    await client.setEx(`blacklist:${token}`, expiresIn, '1');
};

const isBlacklisted = async (token) => {
    return await client.exists(`blacklist:${token}`);
};
```

---

## 📞 Security Contacts

| Role | Responsibility |
|------|---------------|
| Super Admin | Create roles, manage staff, rotate secrets |
| Infrastructure | TLS certs, firewall, fail2ban, backups |
| On-call | Monitor `[SECURITY]` logs, respond to lockouts |

---

*Generated for Ombia Express — confidential internal document.*
