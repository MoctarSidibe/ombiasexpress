# Ombia Express — Deployment Guide
> Server: `37.60.240.199` · Beginner-friendly · Step-by-step

---

## Before You Start — What You Need

| Item | Where to get it |
|------|----------------|
| SSH client | Windows: use **PuTTY** or **Windows Terminal** (`ssh` is built-in) |
| FileZilla (optional) | To upload files if you don't use Git |
| Your server SSH password | From your hosting provider dashboard |
| A domain name (optional) | Namecheap, GoDaddy, etc. — you can use IP-only for testing |

---

## Step 1 — Connect to Your Server

Open **Windows Terminal** (or PuTTY) and type:

```bash
ssh root@37.60.240.199
```

Enter your password when asked. You are now inside the server.

---

## Step 2 — Update the Server

Always update first to get security patches:

```bash
apt update && apt upgrade -y
```

---

## Step 3 — Install Required Software

### 3.1 — Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version   # should print v20.x.x
```

### 3.2 — PM2 (keeps your app running 24/7)

```bash
npm install -g pm2
```

### 3.3 — PostgreSQL (database)

```bash
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql
```

### 3.4 — Redis (JWT blacklist / cache)

```bash
apt install -y redis-server
systemctl start redis-server
systemctl enable redis-server
redis-cli ping   # should print PONG
```

### 3.5 — Nginx (web server / reverse proxy)

```bash
apt install -y nginx
systemctl start nginx
systemctl enable nginx
```

### 3.6 — Certbot (free HTTPS — only if you have a domain)

```bash
apt install -y certbot python3-certbot-nginx
```

---

## Step 4 — Create the App Folder

> We use `/var/www/ombiaexpress/` so we don't touch your other apps.

```bash
mkdir -p /var/www/ombiaexpress
mkdir -p /var/www/ombiaexpress/uploads
chmod 755 /var/www/ombiaexpress
```

---

## Step 5 — Upload Your Code

### Option A — Using Git (recommended)

```bash
cd /var/www/ombiaexpress
git init
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git pull origin main
```

### Option B — Using FileZilla (drag and drop)

1. Open FileZilla
2. Host: `37.60.240.199` | User: `root` | Password: your SSH password | Port: `22`
3. Navigate to `/var/www/ombiaexpress/` on the right panel
4. Drag your `server/` and `admin/` folders from your PC to the server

---

## Step 6 — Setup the Database

### 6.1 — Create database and user

```bash
# Switch to postgres user
sudo -u postgres psql

# Inside PostgreSQL shell, run these 4 lines:
CREATE DATABASE ombiaexpress;
CREATE USER ombiauser WITH ENCRYPTED PASSWORD 'CHANGE_THIS_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE ombiaexpress TO ombiauser;
\q
```

### 6.2 — Test the connection

```bash
psql -U ombiauser -d ombiaexpress -h 127.0.0.1
# If it connects, press \q to exit
```

---

## Step 7 — Configure Environment Variables

```bash
nano /var/www/ombiaexpress/server/.env
```

Paste and fill in every value:

```env
# ── Server ──────────────────────────────────────────────────
NODE_ENV=production
PORT=5000

# ── Database ────────────────────────────────────────────────
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=ombiaexpress
DB_USER=ombiauser
DB_PASS=CHANGE_THIS_PASSWORD

# ── JWT ─────────────────────────────────────────────────────
# Generate a strong secret: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=PASTE_YOUR_64_CHAR_RANDOM_STRING_HERE
JWT_EXPIRES_IN=7d

# ── Redis ────────────────────────────────────────────────────
REDIS_URL=redis://127.0.0.1:6379

# ── Admin ───────────────────────────────────────────────────
# Secret needed to create admin accounts
ADMIN_SECRET=CHOOSE_A_STRONG_ADMIN_SECRET

# ── CORS ────────────────────────────────────────────────────
# Your admin panel domain (or IP for testing)
ALLOWED_ORIGINS=http://37.60.240.199,https://admin.yourdomain.com

# ── Uploads ─────────────────────────────────────────────────
UPLOAD_PATH=/var/www/ombiaexpress/uploads

# ── Mobile Money (fill when you have keys) ──────────────────
AIRTEL_API_KEY=
AIRTEL_API_SECRET=
MOOV_API_KEY=
```

Save with `Ctrl+O` then `Enter`, exit with `Ctrl+X`.

Generate a strong JWT secret quickly:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Step 8 — Install Dependencies & Run Migrations

```bash
cd /var/www/ombiaexpress/server
npm install --production
```

Run the database migrations (creates all tables):
```bash
npm run migrate
# OR if no migrate script:
node -e "require('./models'); require('./models').sequelize.sync({ alter: true }).then(() => { console.log('Done'); process.exit(0); })"
```

---

## Step 9 — Build the Admin Panel

```bash
cd /var/www/ombiaexpress/admin
npm install
npm run build
```

This creates an `admin/dist/` folder — that's what Nginx will serve.

---

## Step 10 — Start the Backend with PM2

```bash
cd /var/www/ombiaexpress/server
pm2 start server.js --name "ombiaexpress-api" --max-memory-restart 400M
pm2 save            # saves so it restarts after server reboot
pm2 startup         # follow the printed command to enable auto-start
```

Check it's running:
```bash
pm2 status
pm2 logs ombiaexpress-api --lines 30
```

---

## Step 11 — Configure Nginx

### 11.1 — Create the site config

```bash
nano /etc/nginx/sites-available/ombiaexpress
```

#### If you have a domain name, paste this:

```nginx
# API
server {
    listen 80;
    server_name api.yourdomain.com;

    location /uploads/ {
        alias /var/www/ombiaexpress/uploads/;
        expires 1d;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# Admin panel
server {
    listen 80;
    server_name admin.yourdomain.com;

    root /var/www/ombiaexpress/admin/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

#### If you only have the IP (no domain yet), paste this:

```nginx
server {
    listen 80;
    server_name 37.60.240.199;

    # Admin panel at /admin/
    location /admin/ {
        alias /var/www/ombiaexpress/admin/dist/;
        try_files $uri $uri/ /admin/index.html;
    }

    # API at /api/
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Socket.io
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Uploaded files
    location /uploads/ {
        alias /var/www/ombiaexpress/uploads/;
        expires 1d;
    }
}
```

### 11.2 — Enable the site

```bash
# Enable the new site
ln -s /etc/nginx/sites-available/ombiaexpress /etc/nginx/sites-enabled/

# Test config (MUST show "test is successful")
nginx -t

# Reload Nginx
systemctl reload nginx
```

---

## Step 12 — Open Firewall Ports

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'   # opens ports 80 and 443
ufw --force enable
ufw status
```

---

## Step 13 — Free HTTPS with Let's Encrypt (only if you have a domain)

> Skip this step if you're using IP-only.

```bash
certbot --nginx -d api.yourdomain.com -d admin.yourdomain.com
```

Follow the prompts. Certbot will automatically edit your Nginx config and enable HTTPS.

Auto-renewal is set up automatically. Test it with:
```bash
certbot renew --dry-run
```

---

## Step 14 — Update Mobile App API URL

On your PC, update `mobile/.env`:

```env
# With domain:
EXPO_PUBLIC_API_URL=https://api.yourdomain.com/api
EXPO_PUBLIC_SOCKET_URL=https://api.yourdomain.com

# With IP only:
EXPO_PUBLIC_API_URL=http://37.60.240.199/api
EXPO_PUBLIC_SOCKET_URL=http://37.60.240.199
```

Then rebuild your Expo app:
```bash
cd mobile
npx expo build:android   # for APK
# OR
eas build --platform android   # with EAS
```

---

## Step 15 — Create the First Admin Account

Once the server is running, create your admin user:

```bash
curl -X POST http://37.60.240.199/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin",
    "email": "admin@ombiaexpress.com",
    "password": "YourStrongPassword123!",
    "phone": "+24177000000",
    "role": "admin",
    "admin_secret": "THE_ADMIN_SECRET_FROM_YOUR_ENV"
  }'
```

Then log in at `http://37.60.240.199/admin/` (or your domain).

---

## Useful Commands (Day-to-Day)

```bash
# View live logs
pm2 logs ombiaexpress-api

# Restart API after code update
pm2 restart ombiaexpress-api

# Check all running apps on server (yours + others)
pm2 list

# Check Nginx errors
tail -f /var/log/nginx/error.log

# Check disk space
df -h

# Check memory usage
free -h

# Check what's running on port 5000
lsof -i :5000
```

---

## Updating the App After Code Changes

```bash
cd /var/www/ombiaexpress

# Pull latest code (if using Git)
git pull origin main

# Update backend
cd server && npm install --production
pm2 restart ombiaexpress-api

# Update admin panel
cd ../admin && npm install && npm run build
# (Nginx serves the new dist/ automatically — no restart needed)
```

---

## Folder Structure on Server

```
/var/www/
├── html/                    ← your OTHER existing app (untouched)
├── ombiaexpress/            ← Ombia Express lives here
│   ├── server/              ← Node.js API
│   │   ├── .env             ← secrets (never commit this)
│   │   └── ...
│   ├── admin/
│   │   ├── dist/            ← built React app (served by Nginx)
│   │   └── ...
│   └── uploads/             ← user-uploaded images
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `502 Bad Gateway` | API not running → `pm2 restart ombiaexpress-api` |
| `404 on admin panel` | Check `admin/dist/` exists → run `npm run build` again |
| `ECONNREFUSED` on DB | PostgreSQL not running → `systemctl start postgresql` |
| Mobile still says "serveur inaccessible" | Update `mobile/.env` with the server IP/domain, rebuild app |
| Port 5000 already used | Change `PORT` in `.env` to `5001` and update Nginx config |
| Nginx `test is successful` but site not loading | Check `ufw status` — port 80 must be open |

---

## Security Checklist Before Going Live

- [ ] Changed default PostgreSQL password
- [ ] Generated a strong random `JWT_SECRET` (64+ chars)
- [ ] Set a strong `ADMIN_SECRET`
- [ ] `NODE_ENV=production` in `.env`
- [ ] HTTPS enabled (Certbot) if you have a domain
- [ ] Changed admin panel password after first login
- [ ] Firewall enabled (`ufw status` shows active)
- [ ] Redis password set (optional but recommended for production)
