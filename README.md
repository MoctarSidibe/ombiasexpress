# RideShare - Uber-Like Ride-Sharing App

A modern, cross-platform ride-sharing application built with React Native (Expo) and Node.js.

## 🚀 Features

- **Dual Role Support**: Users can be riders, drivers, or both
- **Real-time Tracking**: Live GPS location tracking during rides
- **Vehicle management**: Drivers can register and manage their vehicles
- **Smart Matching**: Algorithm to match riders with nearest available drivers
- **Dynamic Pricing**: Fare calculation based on distance, time, and demand
- **Rating System**: Two-way ratings to maintain quality
- **In-app Payments**: Secure payment processing
- **Commission-based Model**: Uber-like business model (configurable commission rate)

## 📱 Mobile App (React Native + Expo)

### Prerequisites

- Node.js 16+ installed
- Expo Go app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))

### Setup

```bash
cd mobile
npm install
```

### Configuration

1. Update API URL in `src/services/api.service.js` and `src/services/socket.service.js`:
   - Replace `http://localhost:5000` with your backend URL
   - For testing on physical device, use your computer's IP address (e.g., `http://192.168.1.100:5000`)

2. Add Google Maps API key in `app.json`:
   - Get API key from [Google Cloud Console](https://console.cloud.google.com/)
   - Enable Maps SDK for Android and iOS
   - Update `YOUR_ANDROID_GOOGLE_MAPS_API_KEY` and `YOUR_IOS_GOOGLE_MAPS_API_KEY`

### Run the App

```bash
npm start
```

Then:
1. Scan the QR code with Expo Go app (Android) or Camera app (iOS)
2. The app will load on your device instantly
3. Make changes to the code and see them live on your phone!

### Build for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

## 🖥️ Backend API (Node.js + Express)

### Prerequisites

- Node.js 16+ installed
- PostgreSQL database installed and running

### Setup

```bash
cd server
npm install
```

### Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=rideshare_db
   DB_USER=postgres
   DB_PASSWORD=your_password
   
   JWT_SECRET=your_secret_key_here
   
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   STRIPE_SECRET_KEY=your_stripe_key
   
   COMMISSION_RATE=20
   BOOKING_FEE=1.5
   ```

### Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE rideshare_db;
```

### Run the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will:
- ✓ Connect to PostgreSQL
- ✓ Auto-create all database tables
- ✓ Start on port 5000 (or PORT from .env)

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get current user
- `PUT /api/auth/profile` - Update profile

#### Vehicles
- `POST /api/vehicles` - Register vehicle
- `GET /api/vehicles` - Get user's vehicles
- `PUT /api/vehicles/:id` - Update vehicle
- `DELETE /api/vehicles/:id` - Delete vehicle

#### Rides
- `POST /api/rides/request` - Request a ride
- `POST /api/rides/:id/accept` - Accept ride (driver)
- `POST /api/rides/:id/start` - Start ride
- `POST /api/rides/:id/complete` - Complete ride
- `POST /api/rides/:id/cancel` - Cancel ride
- `POST /api/rides/:id/rate` - Rate completed ride
- `GET /api/rides/history` - Get ride history
- `GET /api/rides/active` - Get active ride

## 🎯 Business Model

- **Commission**: 20% of each ride fare (configurable)
- **Booking Fee**: $1.50 per ride (configurable)
- **Surge Pricing**: Dynamic pricing during high demand
- **Vehicle Types**: Economy, Comfort, Premium, XL

### Fare Calculation

```
Base Fare: $2.00
+ Distance: $1.50/km
+ Time: $0.30/min
× Surge Multiplier (if applicable)
+ Booking Fee: $1.50
= Total Fare

Commission = Total × 20%
Driver Earnings = Total - Commission
```

## 📊 Database Schema

- **users**: User accounts with role (rider/driver/both)
- **vehicles**: Driver vehicles with approval status
- **rides**: Ride requests and tracking
- **payments**: Payment records with commission tracking

## 🌐 Testing on Your Network

To test the mobile app on your phone while the backend runs on your computer:

1. **Find your computer's IP address**:
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   ```

2. **Update mobile app URLs**:
   - In `mobile/src/services/api.service.js`: Change `http://localhost:5000` to `http://YOUR_IP:5000`
   - In `mobile/src/services/socket.service.js`: Change `http://localhost:5000` to `http://YOUR_IP:5000`

3. **Allow firewall access** to port 5000 on your computer

4. **Make sure both devices are on the same network**

## 📱 Tech Stack

### Mobile
- React Native (Expo)
- React Navigation
- React Native Maps
- Socket.io Client
- Axios
- AsyncStorage

### Backend
- Node.js
- Express
- PostgreSQL + Sequelize
- Socket.io
- JWT Authentication
- Bcrypt

## 🚧 Roadmap

- [x] User authentication
- [x] Vehicle registration
- [x] Ride request/accept flow
- [x] Real-time location tracking
- [x] Rating system
- [ ] Payment integration (Stripe)
- [ ] Push notifications
- [ ] In-app messaging
- [ ] Ride scheduling
- [ ] Promo codes
- [ ] Admin dashboard

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Feel free to open issues or submit PRs.

---

**Note**: This is a development version. Before deploying to production:
- Set up proper SSL/HTTPS
- Use environment-specific configurations
- Implement proper error handling
- Add comprehensive logging
- Set up monitoring and analytics
- Comply with local regulations for ride-sharing services
