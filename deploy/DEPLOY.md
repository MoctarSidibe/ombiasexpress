# Ombia Express — Production Deploy Checklist

## 1. Prerequisites
```bash
apt update && apt install -y nginx certbot python3-certbot-nginx redis-server
```

## 2. TLS Certificates (Let's Encrypt)
```bash
certbot certonly --nginx -d api.ombiaexpress.com -d admin.ombiaexpress.com
# Auto-renewal (already added by certbot):
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## 3. Nginx
```bash
cp deploy/nginx.conf    /etc/nginx/sites-available/ombiaexpress
cp deploy/proxy_params  /etc/nginx/proxy_params
ln -s /etc/nginx/sites-available/ombiaexpress /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

## 4. Environment variables (server/.env)
```env
NODE_ENV=production
PORT=5000
JWT_SECRET=<64-char random string>
JWT_EXPIRE=24h
DATABASE_URL=postgres://user:pass@localhost:5432/ombiaexpress
ALLOWED_ORIGINS=https://admin.ombiaexpress.com
REDIS_URL=redis://127.0.0.1:6379
APP_NAME=Ombia Express
ADMIN_SECRET=<strong random secret>
```

## 5. Redis
```bash
systemctl enable redis-server
systemctl start  redis-server
redis-cli ping   # should return PONG
```

## 6. Build admin panel
```bash
cd admin && npm run build
cp -r dist /var/www/ombiaexpress/admin/
```

## 7. Start API (PM2)
```bash
npm install -g pm2
cd server && pm2 start server.js --name ombia-api -i max
pm2 save && pm2 startup
```

## 8. Fail2ban (optional but recommended)
```bash
apt install -y fail2ban
# Add jail for nginx-limit-req in /etc/fail2ban/jail.local:
# [nginx-limit-req]
# enabled  = true
# filter   = nginx-limit-req
# logpath  = /var/log/nginx/api_error.log
# maxretry = 10
# bantime  = 3600
systemctl restart fail2ban
```

## 9. Firewall
```bash
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (redirect only)
ufw allow 443/tcp   # HTTPS
ufw deny  5000/tcp  # Block direct Node access — must go through Nginx
ufw enable
```

## 10. Verify
```bash
curl -I https://api.ombiaexpress.com/health
# Expect: HTTP/2 200, strict-transport-security header present

curl -s https://api.ombiaexpress.com/.env
# Expect: 404

curl -X TRACE https://api.ombiaexpress.com/api/auth/login
# Expect: 405
```
