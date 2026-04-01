# Ombia Express

**Super-application de mobilité et de services pour l'Afrique Centrale**

Ombia Express est une plateforme tout-en-un qui connecte passagers, chauffeurs, livreurs, propriétaires de véhicules, commerçants et clients — le tout dans une seule application mobile.

---

## Services proposés

| Service | Description |
|---------|-------------|
| **Transport VTC** | Demande de course en temps réel, suivi GPS, tarification dynamique |
| **Location de voiture** | Mise en location et réservation entre particuliers |
| **Livraison express** | Envoi et suivi de colis via coursiers vérifiés |
| **E-commerce** | Boutique intégrée — vente et achat de produits |
| **Marché automobile** | Achat et vente de véhicules d'occasion |
| **Ombia Wallet** | Portefeuille numérique, recharge Airtel Money / Moov Money, historique |

---

## Stack technique

### Application mobile
- React Native + Expo SDK ~50
- React Navigation (stack + tabs)
- React Native Maps (OpenStreetMap — aucune clé API requise)
- Socket.io client (temps réel)
- Expo SecureStore + AsyncStorage
- Expo Notifications, Expo Location, Expo Camera

### Serveur API
- Node.js + Express
- PostgreSQL + Sequelize ORM
- Redis (blacklist tokens, cache)
- Socket.io (WebSocket temps réel)
- JWT (authentification)
- PM2 (process manager en production)

### Panel d'administration
- React 18 + Vite
- React Router DOM v6
- Recharts (graphiques)
- Axios

---

## Structure du projet

```
ombiasexpress/
├── server/          API Node.js (port 5000)
│   ├── models/      Modèles Sequelize (User, Ride, Wallet, ...)
│   ├── routes/      Endpoints REST
│   ├── middleware/  Auth, sécurité, brute-force
│   ├── services/    Socket.io, notifications, commissions
│   ├── scripts/     Migrations DB
│   └── pm2.config.js
├── mobile/          Application React Native / Expo
│   └── src/
│       ├── screens/ Tous les écrans (Auth, Rider, Driver, Rental, ...)
│       ├── navigation/
│       ├── context/ AuthContext, LanguageContext
│       └── services/ API, Socket, Notifications
└── admin/           Panel d'administration React + Vite
    └── src/
        └── pages/   Dashboard, Users, Rides, Vehicles, Wallet, ...
```

---

## Lancer le projet en développement

### Prérequis

- Node.js 20+
- PostgreSQL 14+
- Redis
- Expo Go (sur téléphone) ou émulateur Android/iOS

### 1 — Serveur API

```bash
cd server
cp .env.example .env
# Remplir les valeurs dans .env (DB, JWT_SECRET, ADMIN_SECRET)
npm install
npm run dev
```

Le serveur démarre sur `http://localhost:5000`.  
Les tables sont créées automatiquement au premier démarrage.

### 2 — Application mobile

```bash
cd mobile
npm install
npx expo start --clear
```

Scanner le QR code avec Expo Go.

> **Note** : Mettre à jour `EXPO_PUBLIC_API_URL` dans `mobile/.env` si le serveur n'est pas sur `localhost`.

### 3 — Panel Admin

```bash
cd admin
cp .env.example .env
npm install
npm run dev
```

Panel disponible sur `http://localhost:3000`.

---

## Déploiement en production

Voir [DEPLOYMENT.md](./DEPLOYMENT.md) pour le guide complet de déploiement sur serveur Linux avec PM2.

---

## Variables d'environnement (serveur)

Copier `server/.env.example` vers `server/.env` et remplir :

```env
PORT=5000
NODE_ENV=production

DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=ombiaexpress
DB_USER=ombiauser
DB_PASSWORD=MOT_DE_PASSE_FORT

JWT_SECRET=<générer avec crypto.randomBytes(64).toString('hex')>
JWT_EXPIRE=7d

ADMIN_SECRET=<secret fort unique>

REDIS_HOST=127.0.0.1
REDIS_PORT=6379

ALLOWED_ORIGINS=http://localhost:3000

COMMISSION_RATE=0.15
BOOKING_FEE=0.10
APP_NAME=Ombia Express
```

---

## Modèle économique

| Source | Taux |
|--------|------|
| Commission sur chaque course | 15 % |
| Frais de réservation location | 10 % |
| Commission livraison | 15 % |
| Commission e-commerce | 15 % |
| Réduction paiement Ombia Wallet | −5 % pour l'utilisateur |

---

## Sécurité

- Authentification JWT avec blacklist Redis
- Protection brute-force (rate limiting par IP + identifiant)
- Helmet.js (headers HTTP sécurisés)
- CORS restreint aux origines autorisées
- Mots de passe hashés avec bcrypt
- Variables sensibles exclusivement en `.env` (jamais committées)
- KYC obligatoire avant activation des services chauffeur / livreur / commerçant

---

## Feuille de route

- [x] Authentification par numéro de téléphone
- [x] Transport VTC temps réel (Socket.io)
- [x] Location de voiture entre particuliers
- [x] Livraison express
- [x] E-commerce & marché automobile
- [x] Ombia Wallet (recharge, paiement, historique)
- [x] KYC documents (photos, vérification admin)
- [x] Panel admin complet
- [x] Multi-rôles (un utilisateur peut être chauffeur ET commerçant)
- [ ] Intégration Airtel Money / Moov Money réelle
- [ ] Notifications push (Expo Push Notifications)
- [ ] Build APK / IPA production (EAS Build)
- [ ] Domaine + HTTPS (Nginx + Certbot)
- [ ] Application disponible sur Play Store / App Store

---

## Licence

Propriétaire — Ombia Express © 2026. Tous droits réservés.
