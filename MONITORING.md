# Real-Time Monitoring — Ombia Express

## Stack

| Layer | Tool | What it monitors |
|-------|------|-----------------|
| Mobile crashes | GlitchTip SDK (Sentry-compatible) | React Native errors + stack traces |
| Server errors | GlitchTip SDK | Node.js unhandled exceptions |
| Uptime | UptimeRobot (free) | API down alerts via email/SMS |
| Logs | PM2 (already running) | Process logs, restarts |

---

## Server Resources (Verified 2026-04-04)

```
RAM:  7.8GB total / 5.8GB free  ✅ enough for GlitchTip
CPU:  4 cores                   ✅
Disk: 141GB free                ✅
```

---

## Part 1 — GlitchTip (Self-Hosted, Open Source)

GlitchTip is a lightweight open-source Sentry alternative.
Same SDK, same UI, runs on your existing server.

### Step 1 — Install Docker on the server

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker root
docker --version   # verify
docker compose version   # verify
```

### Step 2 — Create GlitchTip directory

```bash
mkdir -p /opt/glitchtip && cd /opt/glitchtip
```

### Step 3 — Create docker-compose.yml

```bash
nano /opt/glitchtip/docker-compose.yml
```

Paste this content:

```yaml
version: "3.8"

x-environment: &default-environment
  DATABASE_URL: postgresql://postgres:glitchtip_password@postgres:5432/glitchtip
  SECRET_KEY: "CHANGE_THIS_TO_A_RANDOM_64_CHAR_STRING"
  PORT: 8765
  EMAIL_URL: "consolemail://"
  GLITCHTIP_DOMAIN: "http://37.60.240.199/glitchtip"
  DEFAULT_FROM_EMAIL: "noreply@ombiaexpress.com"
  CELERY_WORKER_CONCURRENCY: 2

x-depends: &default-depends
  depends_on:
    - postgres
    - redis

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: glitchtip
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: glitchtip_password
    volumes:
      - glitchtip_postgres:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7
    restart: unless-stopped

  web:
    image: glitchtip/glitchtip
    <<: *default-depends
    environment: *default-environment
    ports:
      - "8765:8765"
    volumes:
      - glitchtip_uploads:/code/uploads
    restart: unless-stopped

  worker:
    image: glitchtip/glitchtip
    <<: *default-depends
    environment: *default-environment
    command: ./bin/run-celery-with-beat.sh
    volumes:
      - glitchtip_uploads:/code/uploads
    restart: unless-stopped

  migrate:
    image: glitchtip/glitchtip
    <<: *default-depends
    environment: *default-environment
    command: ./manage.py migrate
    restart: on-failure

volumes:
  glitchtip_postgres:
  glitchtip_uploads:
```

> ⚠️ Change `SECRET_KEY` to a random 64-character string before starting.
> Generate one: `openssl rand -hex 32`

### Step 4 — Start GlitchTip

```bash
cd /opt/glitchtip
docker compose up -d

# Watch startup logs
docker compose logs -f web
# Wait until you see: "Listening on port 8765"
```

### Step 5 — Add Nginx block for GlitchTip

Edit `/etc/nginx/sites-enabled/carte_grise` — add before closing `}`:

```nginx
    # GlitchTip Monitoring
    location /glitchtip/ {
        proxy_pass         http://127.0.0.1:8765/;
        proxy_redirect     off;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   X-Forwarded-Prefix /glitchtip;
        proxy_http_version 1.1;
        proxy_read_timeout 300s;
        client_max_body_size 20M;
    }
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### Step 6 — Create admin account

```bash
cd /opt/glitchtip
docker compose run --rm web ./manage.py createsuperuser
```

Open in browser:
```
http://37.60.240.199/glitchtip
```

### Step 7 — Create two projects in GlitchTip UI

1. **ombia-express-mobile** — platform: React Native
2. **ombia-express-server** — platform: Node.js

Copy the **DSN** for each project (Settings → DSN). Looks like:
```
http://abc123@37.60.240.199/glitchtip/1
```

---

## Part 2 — Add Sentry SDK to Server (Node.js)

```bash
cd server
npm install @sentry/node
```

Add to the very top of `server/server.js` (before any other imports):

```js
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: 'YOUR_SERVER_DSN_FROM_GLITCHTIP',
  environment: process.env.NODE_ENV || 'production',
  tracesSampleRate: 0.2, // 20% of requests traced
});
```

Add error handler at the bottom of `server/server.js` (before `app.listen`):

```js
// Must be after all routes
Sentry.setupExpressErrorHandler(app);
```

---

## Part 3 — Add Sentry SDK to Mobile (React Native)

```bash
cd mobile
npm install @sentry/react-native --legacy-peer-deps
```

Add to `mobile/App.js` or `mobile/index.js` (very first lines):

```js
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'YOUR_MOBILE_DSN_FROM_GLITCHTIP',
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: 0.2,
  enableNative: true,
});
```

Wrap your root component:

```js
export default Sentry.wrap(App);
```

---

## Part 4 — UptimeRobot (Free Uptime Alerts)

GlitchTip shows errors but not downtime. UptimeRobot pings your API
every 5 minutes and emails you if it's down.

1. Go to [uptimerobot.com](https://uptimerobot.com) → Sign up free
2. **Add New Monitor**:
   - Type: HTTP(s)
   - Friendly Name: `Ombia Express API`
   - URL: `http://37.60.240.199:5001/api/health`
   - Monitoring Interval: 5 minutes
3. Add your email as alert contact
4. Save

You'll get an email within 5 min if the API goes down.

---

## What You'll See in GlitchTip Dashboard

When the mobile app crashes on "select service":
```
Error: Cannot read property 'X' of undefined
  at ServiceSelectionScreen.js:42
  at renderWithHooks
  ...
```

- Exact file and line number
- How many users affected
- When it first happened
- Device model and OS version
- Full stack trace

---

## Quick Reference

| Service | URL | What it does |
|---------|-----|-------------|
| GlitchTip | `http://37.60.240.199/glitchtip` | Error dashboard |
| UptimeRobot | uptimerobot.com | Uptime alerts |
| PM2 logs | `pm2 logs ombia-express-api` | Server logs live |
| Jenkins | `http://37.60.240.199/jenkins` | Build pipeline |

---

## Rollout Order

1. Install Docker + start GlitchTip (Part 1)
2. Add Sentry SDK to server (Part 2) → deploy → restart PM2
3. Add Sentry SDK to mobile (Part 3) → push → Jenkins builds new APK
4. Set up UptimeRobot (Part 4) — 5 min task
5. Reproduce the "select service" crash → GlitchTip shows exact line
