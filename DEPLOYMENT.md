# Ombia Express — Guide de Déploiement
> Serveur : `37.60.240.199` · Sans conflit avec l'application existante

---

## Infos importantes

| Sujet | Détail |
|-------|--------|
| **Cartes** | OpenStreetMap — open source, gratuit, aucune clé API requise |
| **Redis** | Open source et gratuit — `apt install redis-server` suffit |
| **Domaine** | Pas encore — on utilise l'IP pour tester. Domaine à ajouter plus tard |
| **App existante** | Préservée — Ombia Express est isolé dans `/var/www/ombiaexpress/` |
| **Port API** | `5000` (PM2 interne) |
| **Port Admin** | `3001` (PM2 serve — `http://37.60.240.199:3001`) |

---

## Étape 1 — Se connecter au serveur

```bash
ssh root@37.60.240.199
```

---

## Étape 2 — Vérifier l'état du serveur existant

AVANT de toucher quoi que ce soit :

```bash
pm2 list                  # apps déjà actives
lsof -i :5000 -i :3001   # ports déjà utilisés
ls /var/www/              # dossiers existants
```

> **Règle** : On ne touche JAMAIS aux fichiers des autres dossiers dans `/var/www/`.

---

## Étape 3 — Installer les dépendances manquantes

### Node.js 20

```bash
node --version
# Si pas installé :
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

### PM2

```bash
npm install -g pm2
```

### PostgreSQL

```bash
psql --version
# Si pas installé :
apt install -y postgresql postgresql-contrib
systemctl start postgresql && systemctl enable postgresql
```

### Redis (open source, gratuit — licence BSD)

```bash
redis-cli ping
# Si pas installé :
apt install -y redis-server
systemctl start redis-server && systemctl enable redis-server
redis-cli ping   # doit afficher PONG
```

### serve (pour le panel admin)

```bash
npm install -g serve
```

---

## Étape 4 — Créer le dossier de l'application

```bash
mkdir -p /var/www/ombiaexpress/uploads
mkdir -p /var/www/ombiaexpress/server/logs
chmod 755 /var/www/ombiaexpress /var/www/ombiaexpress/uploads
```

---

## Étape 5 — Uploader le code

### Option A — Git (recommandé)

```bash
cd /var/www/ombiaexpress
git init
git remote add origin https://github.com/TON_USERNAME/TON_REPO.git
git pull origin main
```

### Option B — FileZilla

1. Host : `37.60.240.199` | User : `root` | Port : `22`
2. Naviguer vers `/var/www/ombiaexpress/` côté serveur
3. Glisser les dossiers `server/` et `admin/` depuis ton PC

---

## Étape 6 — Créer la base de données

```bash
sudo -u postgres psql
```

Dans le shell PostgreSQL :

```sql
CREATE DATABASE ombiaexpress;
CREATE USER ombiauser WITH ENCRYPTED PASSWORD 'MOT_DE_PASSE_FORT';
GRANT ALL PRIVILEGES ON DATABASE ombiaexpress TO ombiauser;
\q
```

Tester :

```bash
psql -U ombiauser -d ombiaexpress -h 127.0.0.1
# Si connexion OK, taper \q
```

---

## Étape 7 — Configurer les variables d'environnement

```bash
nano /var/www/ombiaexpress/server/.env
```

Copier-coller et remplir :

```env
NODE_ENV=production
PORT=5000

DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=ombiaexpress
DB_USER=ombiauser
DB_PASSWORD=MOT_DE_PASSE_FORT

# Générer : node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=COLLER_ICI_LA_CLE_GENEREE
JWT_EXPIRE=7d

ADMIN_SECRET=SECRET_FORT_UNIQUE

REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# CORS — panel admin
ALLOWED_ORIGINS=http://37.60.240.199:3001

UPLOAD_PATH=/var/www/ombiaexpress/uploads
COMMISSION_RATE=0.15
BOOKING_FEE=0.10
APP_NAME=Ombia Express
```

Générer la clé JWT :

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Sauvegarder : `Ctrl+O` puis `Ctrl+X`

---

## Étape 8 — Installer et migrer la base

```bash
cd /var/www/ombiaexpress/server
npm install --omit=dev
```

Créer toutes les tables :

```bash
node -e "const {sequelize}=require('./config/database');require('./models');sequelize.sync({alter:true}).then(()=>{console.log('Tables OK');process.exit(0)}).catch(e=>{console.error(e.message);process.exit(1)})"
```

---

## Étape 9 — Builder le panel Admin

```bash
cd /var/www/ombiaexpress/admin
npm install
npm run build
# Crée admin/dist/ — c'est ce qui sera servi
```

---

## Étape 10 — Démarrer avec PM2

```bash
# API backend
cd /var/www/ombiaexpress/server
pm2 start pm2.config.js --env production

# Panel Admin (port 3001, --spa gère le routing React)
pm2 serve /var/www/ombiaexpress/admin/dist 3001 --name "ombia-admin" --spa

# Sauvegarder et démarrage automatique au reboot
pm2 save
pm2 startup   # copier-coller la commande affichée
```

Vérifier :

```bash
pm2 list
# ombia-express-api   online
# ombia-admin         online
```

---

## Étape 11 — Ouvrir les ports (sans toucher l'existant)

```bash
ufw allow 5000/tcp   # API
ufw allow 3001/tcp   # Admin panel
ufw status
```

---

## Étape 12 — Tester le déploiement

```bash
# API
curl http://37.60.240.199:5000/api/auth/profile
# Réponse attendue : {"error":"Authentification requise."}

# Logs
pm2 logs ombia-express-api --lines 50
```

Panel Admin : ouvrir `http://37.60.240.199:3001` dans le navigateur.

---

## Étape 13 — Mettre à jour mobile/.env (sur ton PC)

```env
EXPO_PUBLIC_API_URL=http://37.60.240.199:5000/api
EXPO_PUBLIC_SOCKET_URL=http://37.60.240.199:5000
```

Tester avec Expo Go :

```bash
cd mobile
npx expo start --clear
```

---

## Étape 14 — Créer le premier compte Admin

```bash
curl -X POST http://37.60.240.199:5000/api/admin/create \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@ombiaexpress.com","phone":"24177000000","password":"MotDePasse123!","admin_secret":"TON_ADMIN_SECRET"}'
```

Se connecter : `http://37.60.240.199:3001`

---

## Ajouter un domaine plus tard

### 1 — Installer Nginx

```bash
apt install -y nginx certbot python3-certbot-nginx
```

### 2 — Config Nginx (nouveau fichier — sans toucher l'existant)

```bash
nano /etc/nginx/sites-available/ombiaexpress
```

```nginx
server {
    listen 80;
    server_name api.ombiaexpress.com;

    location /uploads/ {
        alias /var/www/ombiaexpress/uploads/;
        expires 7d;
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

server {
    listen 80;
    server_name admin.ombiaexpress.com;
    root /var/www/ombiaexpress/admin/dist;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
}
```

### 3 — Activer + HTTPS gratuit

```bash
ln -s /etc/nginx/sites-available/ombiaexpress /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d api.ombiaexpress.com -d admin.ombiaexpress.com
```

### 4 — Mettre à jour .env

```env
ALLOWED_ORIGINS=https://admin.ombiaexpress.com
```

```bash
pm2 restart ombia-express-api
```

### 5 — Mettre à jour mobile/.env

```env
EXPO_PUBLIC_API_URL=https://api.ombiaexpress.com/api
EXPO_PUBLIC_SOCKET_URL=https://api.ombiaexpress.com
```

---

## Structure sur le serveur

```
/var/www/
├── html/                    <- APP EXISTANTE (ne jamais toucher)
├── ombiaexpress/            <- Ombia Express uniquement
│   ├── server/              <- API Node.js (PM2 port 5000)
│   │   ├── .env             <- secrets (ne jamais committer)
│   │   ├── logs/
│   │   └── pm2.config.js
│   ├── admin/
│   │   └── dist/            <- React buildé (PM2 serve port 3001)
│   └── uploads/             <- photos utilisateurs
```

---

## Commandes utiles

```bash
pm2 list                                  # apps actives
pm2 logs ombia-express-api                # logs en direct
pm2 restart ombia-express-api             # redémarrer après update

# Mettre à jour le code (Git)
cd /var/www/ombiaexpress && git pull origin main
cd server && npm install --omit=dev && pm2 restart ombia-express-api
cd ../admin && npm install && npm run build

free -h && df -h       # RAM et disque
redis-cli ping         # tester Redis
```

---

## Dépannage

| Problème | Solution |
|----------|----------|
| API ne répond pas | `pm2 restart ombia-express-api` puis `pm2 logs` |
| Panel admin blanc | Vérifier `admin/dist/` — refaire `npm run build` |
| `ECONNREFUSED` DB | `systemctl start postgresql` |
| `ECONNREFUSED` Redis | `systemctl start redis-server` |
| Mobile "serveur inaccessible" | Vérifier `mobile/.env` → IP:port correct, rebuild |
| Port 5000 occupé | `PORT=5001` dans `.env` + `ufw allow 5001/tcp` |
| Port 3001 occupé | `pm2 serve ... 3002` à la place |

---

## Checklist sécurité avant mise en ligne

- [ ] `DB_PASSWORD` fort (différent du mot de passe dev)
- [ ] `JWT_SECRET` généré avec `crypto.randomBytes(64)`
- [ ] `ADMIN_SECRET` fort et unique
- [ ] `NODE_ENV=production` dans `.env`
- [ ] `ufw status` affiche "active"
- [ ] Premier compte admin créé et connexion testée
- [ ] `pm2 logs` vérifié — aucune erreur critique
