<div align="center">

# 🚀 OMBIA EXPRESS

### 🌍 La Super-Application de Mobilité et de Services pour l'Afrique Centrale

*Connecter les personnes. Simplifier le quotidien. Construire l'avenir.*

---

![Version](https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge)
![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-green?style=for-the-badge)
![Backend](https://img.shields.io/badge/backend-Node.js%20%2B%20PostgreSQL-yellow?style=for-the-badge)
![Status](https://img.shields.io/badge/status-En%20déploiement-orange?style=for-the-badge)
![License](https://img.shields.io/badge/licence-Propriétaire-red?style=for-the-badge)

</div>

---

## 💡 Qu'est-ce qu'Ombia Express ?

**Ombia Express** est une super-application mobile tout-en-un conçue pour l'Afrique Centrale. En une seule plateforme, elle regroupe le transport VTC, la location de voitures entre particuliers, la livraison express de colis, le commerce en ligne, le marché automobile et un portefeuille numérique adapté au contexte local (Airtel Money, Moov Money).

L'objectif : remplacer cinq ou six applications différentes par une seule, fluide, sécurisée, et pensée pour les réalités africaines — connectivité variable, paiements mobile money, multilinguisme.

---

## 🎯 Les 6 Services

### 🚗 Transport VTC
Réservez une course en quelques secondes. Le passager indique sa destination, le système trouve le chauffeur disponible le plus proche, et le suivi GPS démarre en temps réel jusqu'à l'arrivée. Tarification dynamique, calcul automatique du tarif, évaluation mutuelle après chaque course.

### 🔑 Location de Voiture entre Particuliers
Un propriétaire publie son véhicule avec disponibilités et tarifs. Un locataire consulte les voitures disponibles sur une carte, réserve, paye via l'application. Système de caution, suivi de l'état du véhicule, notation des deux parties à la fin de chaque location.

### 📦 Livraison Express
Envoi de colis entre particuliers ou professionnels. Le client décrit son colis, indique adresse de départ et d'arrivée, et un coursier vérifié accepte la mission. Suivi en temps réel, preuve de livraison, historique complet.

### 🛍️ E-Commerce & Boutiques Partenaires
Les commerçants ouvrent leur boutique en ligne directement dans l'application. Gestion du catalogue, des stocks, des commandes et des livraisons depuis un seul dashboard. Les clients parcourent les produits, commandent et paient sans quitter l'app.

### 🚙 Marché Automobile
Achat et vente de véhicules d'occasion entre particuliers. Fiches détaillées avec photos, kilométrage, prix, localisation. Messagerie intégrée entre vendeur et acheteur. Vérification des annonces par l'équipe Ombia avant publication.

### 💳 Ombia Wallet — Portefeuille Numérique
Chaque utilisateur dispose d'un portefeuille intégré. Rechargeable via Airtel Money ou Moov Money, il permet de payer toutes les transactions dans l'app avec une réduction de **5 %** sur chaque paiement wallet. Les chauffeurs et livreurs reçoivent leurs gains directement dans leur wallet, retirables à tout moment.

---

## 🏗️ Architecture Technique

```
┌─────────────────────────────────────────────────────┐
│           📱 APPLICATION MOBILE                     │
│         React Native + Expo (Android & iOS)          │
│                                                      │
│  Auth · VTC · Location · Livraison · Shop · Wallet  │
└─────────────────────┬───────────────────────────────┘
                      │  🔒 HTTPS + WebSocket (Socket.io)
┌─────────────────────▼───────────────────────────────┐
│           ⚙️  SERVEUR API                           │
│              Node.js + Express (PM2)                 │
│                                                      │
│  REST API · Socket.io · JWT Auth · Brute-Force Guard │
└────────┬──────────────┬──────────────────────────────┘
         │              │
┌────────▼──────┐  ┌────▼──────────────────────────────┐
│ 🗄️ PostgreSQL │  │ ⚡ Redis                          │
│  Base données │  │  Token blacklist · Sessions cache │
└───────────────┘  └───────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│           🖥️  PANEL D'ADMINISTRATION                │
│                 React 18 + Vite                      │
│                                                      │
│  Dashboard · Utilisateurs · Courses · Vérifications │
│  Commandes · Wallet · Paramètres · Statistiques     │
└─────────────────────────────────────────────────────┘
```

---

## 🛠️ Stack Technologique

### 📱 Application Mobile
| Technologie | Rôle |
|-------------|------|
| ⚛️ React Native + Expo SDK ~50 | Framework cross-platform Android & iOS |
| 🧭 React Navigation v6 | Navigation (stacks, tabs, modals) |
| 🗺️ React Native Maps | Cartes OpenStreetMap — aucune clé API requise |
| ⚡ Socket.io Client | Temps réel (positions, notifications courses) |
| 🔐 Expo SecureStore + AsyncStorage | Stockage sécurisé des tokens |
| 📍 Expo Location | Géolocalisation GPS continue |
| 🔔 Expo Notifications | Notifications push |
| 📷 Expo Camera + Image Picker | Photos KYC et documents |
| 🌐 Axios | Requêtes HTTP vers l'API |

### ⚙️ Serveur API
| Technologie | Rôle |
|-------------|------|
| 🟢 Node.js 20 + Express | Serveur HTTP haute performance |
| 🗄️ PostgreSQL 14 | Base de données relationnelle |
| 🔷 Sequelize ORM | Modèles, migrations, associations |
| ⚡ Socket.io | WebSocket — temps réel bidirectionnel |
| 🔴 Redis | Blacklist JWT, protection brute-force |
| 🔑 JWT + bcrypt | Authentification stateless sécurisée |
| 🛡️ Helmet.js | Headers HTTP de sécurité |
| 🔄 PM2 | Process manager, redémarrage auto, logs |
| 📁 Multer | Upload de fichiers (photos KYC, produits) |

### 🖥️ Panel Admin
| Technologie | Rôle |
|-------------|------|
| ⚛️ React 18 + Vite | Interface rapide et moderne |
| 🧭 React Router DOM v6 | Navigation SPA |
| 📊 Recharts | Graphiques et statistiques |
| ⚡ Socket.io Client | Alertes et mises à jour en direct |
| 🌐 Axios | Communication avec l'API |

---

## ✨ Fonctionnalités Clés

### 🔐 Authentification & Profils
- 📱 Inscription et connexion par **numéro de téléphone** (format international)
- 🌍 Support de **80+ pays** avec indicatifs téléphoniques
- 🔑 JWT avec expiration + Redis blacklist (déconnexion sécurisée)
- 🛡️ Protection anti-brute-force (blocage par IP + identifiant)
- 👤 Profil utilisateur complet avec photo, notes et historique

### 👥 Système Multi-Rôles
Un seul compte permet d'accéder à plusieurs rôles simultanément :
- 🧑‍💼 `rider` — passager VTC (actif par défaut)
- 🚗 `driver` — chauffeur VTC
- 🔑 `renter` — locataire de voiture (actif par défaut)
- 🏠 `rental_owner` — propriétaire qui loue ses véhicules
- 📦 `courier` — coursier livraison
- 🛍️ `merchant` — commerçant e-commerce
- 🚌 `fleet_owner` — gestionnaire de flotte

### 🪪 Vérification KYC Obligatoire
Avant d'activer un service professionnel (chauffeur, livreur, commerçant), l'utilisateur soumet ses documents. L'équipe admin vérifie et approuve depuis le panel. Zéro chauffeur non vérifié sur la plateforme.

### ⚡ Temps Réel (Socket.io)
- 📍 Position GPS du chauffeur mise à jour en continu pendant la course
- 🔔 Notification instantanée quand un chauffeur accepte une course
- 📦 Statut de livraison mis à jour à chaque étape
- 🚨 Alertes admin en direct (nouvelles inscriptions, incidents)

### 💳 Ombia Wallet — Paiement Intégré
- 💰 Solde visible en permanence dans l'application
- 📲 Recharge via Airtel Money, Moov Money, carte bancaire
- 🏷️ Paiement en un tap avec **−5 % de réduction**
- 💸 Gains chauffeurs/livreurs versés automatiquement après chaque course
- 🏧 Retrait des gains à la demande
- 📜 Historique complet de toutes les transactions

### 🖥️ Panel d'Administration
- 📊 **Dashboard** : revenus, courses, utilisateurs actifs, graphiques en temps réel
- 👥 **Utilisateurs** : liste complète, suspension, modification des rôles
- 🪪 **KYC** : file de validation des documents (chauffeurs, coursiers, commerçants)
- 🚗 **Courses** : suivi et historique de toutes les courses
- 💳 **Wallet** : transactions, recharges, retraits, alertes fraude
- ⚙️ **Paramètres** : taux de commission, frais de réservation, règles cashback
- 🎧 **Support** : tickets utilisateurs avec réponses admin

---

## 🔒 Sécurité

```
✅  JWT signé (HS256) avec secret 256 bits généré par crypto.randomBytes
✅  Blacklist Redis — token invalidé immédiatement à la déconnexion
✅  Bcrypt (salt 12) pour tous les mots de passe
✅  Brute-force guard — blocage après 5 tentatives par IP + identifiant
✅  Helmet.js — X-Frame-Options, CSP, HSTS, XSS Protection
✅  CORS strict — seules les origines autorisées acceptées
✅  Fichiers .env exclus du dépôt (jamais de secret en clair dans le code)
✅  KYC obligatoire pour les rôles à responsabilité
✅  ADMIN_SECRET requis pour créer un compte administrateur
✅  Rate limiting global sur toutes les routes API
✅  Uploads filtrés par type MIME et taille maximale
```

---

## 💰 Modèle Économique

| Service | Commission plateforme |
|---------|----------------------|
| 🚗 Course VTC | 15 % du tarif |
| 🔑 Location de voiture | 10 % du tarif |
| 📦 Livraison express | 15 % du tarif |
| 🛍️ Vente e-commerce | 15 % du montant |
| 🚙 Marché automobile | Frais de publication (à venir) |
| 💳 Ombia Wallet | Marge sur taux de change mobile money (à venir) |

> ⚙️ Tous les taux sont configurables depuis le panel admin sans redéploiement.

---

## 📁 Structure du Projet

```
ombiasexpress/
│
├── 📂 server/                      API Node.js
│   ├── config/database.js          🗄️ Connexion PostgreSQL
│   ├── middleware/
│   │   ├── auth.middleware.js      🔑 Vérification JWT + rôles
│   │   └── security.middleware.js  🛡️ Brute-force, rate-limit
│   ├── models/                     📋 Sequelize : User, Ride, Wallet, ...
│   ├── routes/                     🌐 REST : auth, rides, rental, wallet, ...
│   ├── services/
│   │   ├── socket.service.js       ⚡ Logique temps réel
│   │   ├── commission.service.js   💰 Calcul des revenus
│   │   └── notifications.service.js 🔔 Push notifications
│   ├── scripts/                    🔧 Migrations DB
│   ├── server.js                   🚀 Point d'entrée
│   ├── pm2.config.js               ⚙️ Config déploiement PM2
│   └── .env.example                📄 Template variables d'environnement
│
├── 📂 mobile/                      React Native + Expo
│   └── src/
│       ├── screens/
│       │   ├── Auth/               🔐 Login, Register, Welcome
│       │   ├── Rider/              🧑‍💼 HomeScreen, RideRequest, Tracking
│       │   ├── Driver/             🚗 DriverHome, RideAccept, OngoingRide
│       │   ├── Rental/             🔑 10 écrans location
│       │   ├── Delivery/           📦 CourierHome, DeliveryRequest
│       │   ├── Market/             🛍️ EcommerceScreen, CarMarket
│       │   ├── Merchant/           🏪 Dashboard, CreateProduct, CarListing
│       │   ├── Shared/             💳 Wallet, Support, Settings, Notifications
│       │   ├── KYC/                🪪 6 écrans vérification documents
│       │   └── Home/               🏠 ServiceHub, ServiceActivation
│       ├── navigation/             🧭 AppNavigator.js
│       ├── context/                🔄 AuthContext, LanguageContext
│       ├── services/               🌐 API, Socket, Location, Notifications
│       └── constants/              🎨 Couleurs, pays (80+)
│
├── 📂 admin/                       Panel React + Vite
│   └── src/pages/
│       ├── Dashboard.jsx           📊 Statistiques & revenus
│       ├── Users.jsx               👥 Gestion utilisateurs
│       ├── Rides.jsx               🚗 Historique courses
│       ├── Vehicles.jsx            🚙 Véhicules enregistrés
│       ├── DriverVerifications.jsx 🪪 KYC chauffeurs
│       ├── WalletFeatures.jsx      💳 Gestion portefeuilles
│       ├── Settings.jsx            ⚙️ Paramètres plateforme
│       └── ...                     📄 15 pages au total
│
├── 📄 DEPLOYMENT.md                🚀 Guide déploiement serveur Linux
├── 📄 SECURITY.md                  🔒 Politique de sécurité
└── 📄 README.md                    📖 Ce fichier
```

---

## ⚡ Démarrage Rapide (Développement)

### 📋 Prérequis
- 🟢 Node.js 20+
- 🗄️ PostgreSQL 14+
- 🔴 Redis
- 📱 Expo Go sur téléphone (Android / iOS)

### 1️⃣ Serveur API
```bash
cd server
cp .env.example .env          # Remplir DB_PASSWORD, JWT_SECRET, ADMIN_SECRET
npm install
npm run dev                   # ✅ Démarre sur http://localhost:5000
                              # Tables créées automatiquement
```

### 2️⃣ Application Mobile
```bash
cd mobile
npm install
npx expo start --clear        # 📱 Scanner le QR code avec Expo Go
```

### 3️⃣ Panel Admin
```bash
cd admin
cp .env.example .env
npm install
npm run dev                   # ✅ http://localhost:3000
```

---

## 🚀 Déploiement Production

Le projet est conçu pour tourner sur un simple VPS Linux avec **PM2** :

```
⚙️  API backend   →  PM2              →  port 5000
🖥️  Panel admin   →  PM2 serve --spa  →  port 3001
```

📖 Guide complet étape par étape → **[DEPLOYMENT.md](./DEPLOYMENT.md)**

> 🔒 Support Nginx + HTTPS (Certbot) inclus pour l'ajout d'un domaine.

---

## 🗺️ Feuille de Route

### ✅ Disponible
- [x] 📱 Authentification par téléphone, 80+ pays
- [x] 🚗 Transport VTC temps réel
- [x] 🔑 Location de voiture entre particuliers
- [x] 📦 Livraison express
- [x] 🛍️ E-commerce avec boutiques partenaires
- [x] 🚙 Marché automobile
- [x] 💳 Ombia Wallet (recharge, paiement, retrait, historique)
- [x] 🪪 KYC documents avec validation admin
- [x] 🖥️ Panel d'administration complet (15 pages)
- [x] 👥 Système multi-rôles simultanés
- [x] 🔒 Protection sécurité complète

### 🔜 En cours / À venir
- [ ] 📲 Intégration API Airtel Money réelle
- [ ] 📲 Intégration API Moov Money réelle
- [ ] 🔔 Notifications push (Expo Push Notifications)
- [ ] 📦 Build APK / IPA production (EAS Build)
- [ ] 🏪 Publication Play Store & App Store
- [ ] 🌐 Domaine + HTTPS (Nginx + Certbot)
- [ ] 🎁 Programme de parrainage
- [ ] 💎 Abonnements chauffeurs (commission réduite)

---

## 🤝 Contact & Partenariats

Pour toute demande de partenariat, intégration opérateur mobile (Airtel Money, Moov Money) ou investissement :

📧 **Ombia Express**
📍 Gabon — Afrique Centrale

---

<div align="center">

🌍 *Ombia Express — Conçu en Afrique, pour l'Afrique.*

**© 2026 Ombia Express. Tous droits réservés.**

</div>
