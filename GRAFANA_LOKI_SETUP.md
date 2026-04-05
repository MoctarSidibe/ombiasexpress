# Grafana + Loki — Ombia Express Full Integration Guide

## Access

| Service  | URL                              | User    | Password             |
|----------|----------------------------------|---------|----------------------|
| Grafana  | http://37.60.240.199:3100        | admin   | OmbiaGrafana2026!    |
| Loki API | http://127.0.0.1:3200 (internal) | —       | —                    |

---

## Architecture Overview

```
Ombia Backend (Node.js/PM2)  ──┐
Nginx access/error logs       ──┤──► Promtail ──► Loki ──► Grafana UI
Docker containers (GlitchTip) ──┘
```

Promtail runs as a Docker container, reads logs from:
- `/var/log/nginx/*.log` — Nginx access + error logs
- `/root/.pm2/logs/*.log` — Node.js app logs via PM2
- Docker container stdout/stderr — GlitchTip, Redis, Postgres

---

## Step 1 — Send Structured Logs from Node.js Backend

By default PM2 captures `console.log`. To get structured JSON logs that Loki
can parse properly, install a logger in the backend.

### Install Winston

```bash
cd /var/www/ombiaexpress/server
npm install winston
```

### Create `server/utils/logger.js`

```js
const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()           // structured JSON → Loki can parse level, message
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: '/root/.pm2/logs/ombia-error.log',  level: 'error' }),
    new transports.File({ filename: '/root/.pm2/logs/ombia-combined.log' }),
  ],
});

module.exports = logger;
```

### Use it in your routes/services

```js
const logger = require('../utils/logger');

// Replace console.log with:
logger.info('Ride created', { ride_id: ride.id, user_id: req.user.id });
logger.error('Payment failed', { error: err.message, user_id: req.user.id });
logger.warn('Socket disconnect', { socket_id: socket.id });
```

### Restart PM2

```bash
pm2 restart ombia-backend
```

---

## Step 2 — Verify Logs Are Flowing into Loki

In Grafana, go to **Explore** (compass icon on left sidebar).

Make sure datasource is **Loki**, then run these queries:

```logql
# All Nginx logs
{job="nginx"}

# Only HTTP 500 errors from Nginx
{job="nginx"} |~ "\" 5[0-9][0-9] "

# Node.js backend logs
{job="nodejs"}

# Only errors from backend
{job="nodejs"} | json | level = "error"

# All Docker container logs
{job="docker"}

# Specific container (e.g. GlitchTip)
{container="monitoring-glitchtip-web-1"}
```

---

## Step 3 — Create Dashboards

### 3.1 — HTTP Traffic Dashboard

Go to **Dashboards → New → New Dashboard → Add visualization**.

| Panel title          | Query (LogQL)                                                                 |
|----------------------|-------------------------------------------------------------------------------|
| Total requests/min   | `rate({job="nginx"}[1m])`                                                     |
| HTTP 5xx errors/min  | `rate({job="nginx"} \|~ "\" 5[0-9][0-9] "[1m])`                              |
| HTTP 4xx errors/min  | `rate({job="nginx"} \|~ "\" 4[0-9][0-9] "[1m])`                              |
| Slow requests (>1s)  | `{job="nginx"} \|~ "\" [0-9]\\.[0-9]+ \""`                                   |

### 3.2 — Backend Error Dashboard

| Panel title          | Query (LogQL)                                                                 |
|----------------------|-------------------------------------------------------------------------------|
| Error rate/min       | `rate({job="nodejs"} \| json \| level="error" [1m])`                         |
| Warning rate/min     | `rate({job="nodejs"} \| json \| level="warn" [1m])`                          |
| Recent errors (logs) | `{job="nodejs"} \| json \| level="error"`                                    |
| Payment failures     | `{job="nodejs"} \|~ "Payment failed\|payment_error\|stripe\|airtel\|moov"`   |

### 3.3 — Ride & Rental Activity

| Panel title          | Query (LogQL)                                                                 |
|----------------------|-------------------------------------------------------------------------------|
| New rides/min        | `rate({job="nodejs"} \|~ "Ride created" [1m])`                               |
| Ride completions/min | `rate({job="nodejs"} \|~ "Ride completed" [1m])`                             |
| Rental bookings/min  | `rate({job="nodejs"} \|~ "Rental booking" [1m])`                             |
| Socket connections   | `rate({job="nodejs"} \|~ "connected\|disconnected" [1m])`                    |

---

## Step 4 — Set Up Alerts

Go to **Alerting → Alert rules → New alert rule**.

### Alert: High error rate

```
Query: sum(rate({job="nodejs"} | json | level="error" [5m])) > 0.5
Condition: IS ABOVE 0.5
For: 2m
```

### Alert: Nginx 5xx spike

```
Query: sum(rate({job="nginx"} |~ "\" 5[0-9][0-9] " [5m])) > 1
Condition: IS ABOVE 1
For: 1m
```

### Notification channel (email or webhook)

Go to **Alerting → Contact points → Add contact point**:
- Type: Email or Webhook (Slack/Telegram)
- Add to your alert rules under **Notifications**

---

## Step 5 — Log Retention & Storage

Logs are kept for **30 days** by default (configured in `loki-config.yml`).

To change retention:

```bash
# Edit on local machine
monitoring/loki-config.yml

# Change this line:
retention_period: 720h   # 720h = 30 days, 168h = 7 days, 2160h = 90 days

# Then on server:
cd /var/www/ombiaexpress/monitoring
docker compose restart loki
```

Check storage used by Loki:

```bash
docker exec monitoring-loki-1 du -sh /loki
```

---

## Step 6 — Check Promtail Health

Promtail has its own status page (internal only):

```bash
curl http://localhost:9080/ready      # should return "ready"
curl http://localhost:9080/targets    # shows all log targets and their status
```

If a target shows `state: pending` instead of `state: active`, the log path
does not exist yet (e.g. PM2 hasn't written any logs).

---

## Useful LogQL Cheatsheet

```logql
# Filter by label
{job="nginx"}
{job="nodejs", level="error"}

# Text search (regex)
{job="nginx"} |~ "POST /api/rides"
{job="nodejs"} |~ "socket|Socket"

# Parse JSON fields
{job="nodejs"} | json | level="error" | message =~ ".*payment.*"

# Count over time
count_over_time({job="nginx"}[5m])

# Rate per second
rate({job="nodejs"} | json | level="error" [1m])

# Top error messages
topk(10, count by (message) (rate({job="nodejs"} | json | level="error" [1h])))
```

---

## Stack Management

```bash
cd /var/www/ombiaexpress/monitoring

# View all containers
docker compose ps

# View Loki logs
docker compose logs loki --tail 50

# View Promtail logs (check what it's scraping)
docker compose logs promtail --tail 50

# Restart a single service
docker compose restart grafana

# Stop everything
docker compose down

# Start everything
docker compose up -d
```
