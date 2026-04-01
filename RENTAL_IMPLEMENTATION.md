# Car Rental Feature — Implementation Plan
> **Project**: RideShare App (Uber-like)
> **Date**: 2026-02-22
> **Status**: Plan (not yet implemented)

---

## Table of Contents
1. [Overview](#1-overview)
2. [Existing Bugs to Fix First](#2-existing-bugs-to-fix-first)
3. [Database — New Models](#3-database--new-models)
4. [Backend — New API Endpoints](#4-backend--new-api-endpoints)
5. [Real-time Events (Socket.io)](#5-real-time-events-socketio)
6. [Mobile App — New Screens](#6-mobile-app--new-screens)
7. [Admin Dashboard — New Pages](#7-admin-dashboard--new-pages)
8. [User Flows](#8-user-flows)
9. [Business Logic & Pricing Rules](#9-business-logic--pricing-rules)
10. [File Change Manifest](#10-file-change-manifest)
11. [Implementation Order](#11-implementation-order)

---

## 1. Overview

### What we are building
A **peer-to-peer car rental marketplace** embedded inside the existing RideShare app.
Any registered user can list their personal car for rent (for a defined time window).
Any other user can browse available cars on the map, book one, and rent it.

### Three personas
| Persona | What they do |
|---------|-------------|
| **Car Owner** | Lists their car with price, photos, availability window, pickup location |
| **Renter** | Browses the map, books a car, picks it up at the location, returns it |
| **Admin** | Approves/rejects listed cars, monitors all bookings, handles disputes |

### Key principles
- Works with the **same free maps stack** (React Native Maps + OSM tile) — no new paid API needed.
- **Real-time** availability via Socket.io (same existing connection).
- Rental cars appear as distinct markers on the map (different icon from ride taxis).
- Reuses the **existing Vehicle model** concept but with a new separate `RentalCar` model so ride-sharing and renting remain decoupled.
- The feature is **opt-in**: users don't see rental unless they navigate to the Rental tab.

---

## 2. Existing Bugs to Fix First

These are issues found in the current code that should be resolved before adding new features.

| # | File | Issue | Fix |
|---|------|-------|-----|
| 1 | `server/routes/admin.routes.js` (line ~308) | `/api/admin/create` has NO auth guard — anyone can create admin | Add a `ADMIN_SECRET` env check or remove the endpoint entirely |
| 2 | `mobile/src/services/api.service.js` (line 5) | API URL hardcoded to `localhost:5000` | Read from `process.env.EXPO_PUBLIC_API_URL` via `app.json` extra field |
| 3 | `mobile/src/services/socket.service.js` (line 5) | Socket URL hardcoded to `localhost:5000` | Same env variable approach |
| 4 | `server/routes/auth.routes.js` (profile update) | No password-change endpoint | Add `PUT /api/auth/password` with old/new password verification |
| 5 | `mobile/src/screens/Driver/DriverHomeScreen.js` (line ~76) | Earnings hardcoded at `fare * 0.8` | Fetch actual commission from ride record |
| 6 | `server/socket.service.js` (lines 37, 39) | Empty error handlers — silent failures | Add console.error + emit error event back to client |

---

## 3. Database — New Models

### 3.1 `RentalCar` model
```
server/models/RentalCar.js
```

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | auto |
| `owner_id` | UUID FK → Users | The person renting out their car |
| `make` | STRING | e.g. "Toyota" |
| `model` | STRING | e.g. "Corolla" |
| `year` | INTEGER | |
| `color` | STRING | |
| `license_plate` | STRING UNIQUE | |
| `photos` | JSON ARRAY | URLs of car photos |
| `features` | JSON ARRAY | ["AC", "GPS", "Automatic", "Bluetooth", "Child seat"] |
| `seats` | INTEGER | 2–8 |
| `fuel_type` | ENUM | gasoline, diesel, hybrid, electric |
| `price_per_hour` | DECIMAL | base hourly rate in app currency |
| `price_per_day` | DECIMAL | flat daily rate (≥ 24 h) |
| `deposit_amount` | DECIMAL | refundable deposit held until return |
| `minimum_hours` | INTEGER | minimum rental duration (e.g. 2) |
| `pickup_location` | GEOMETRY POINT | where the car is parked/available |
| `pickup_address` | STRING | human-readable address |
| `pickup_instructions` | TEXT | "Key is under the mat…" |
| `available_from` | DATETIME | start of the owner's availability window |
| `available_until` | DATETIME | end of the owner's availability window |
| `status` | ENUM | `pending_approval`, `available`, `rented`, `unavailable`, `suspended` |
| `admin_notes` | TEXT | admin review notes |
| `is_active` | BOOLEAN | soft delete |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

**Indexes**: `owner_id`, `status`, `pickup_location` (GIST spatial index), `available_from`, `available_until`

---

### 3.2 `RentalBooking` model
```
server/models/RentalBooking.js
```

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `renter_id` | UUID FK → Users | Who is renting |
| `rental_car_id` | UUID FK → RentalCar | Which car |
| `owner_id` | UUID FK → Users | Denormalized for easy queries |
| `requested_start` | DATETIME | Renter's requested start time |
| `requested_end` | DATETIME | Renter's requested end time |
| `confirmed_start` | DATETIME | Actual start (after owner approval) |
| `confirmed_end` | DATETIME | Actual end |
| `actual_return_time` | DATETIME | When the car was actually returned |
| `total_hours` | DECIMAL | Computed |
| `base_price` | DECIMAL | Before fees |
| `deposit_amount` | DECIMAL | Held during rental |
| `platform_fee` | DECIMAL | 10% of base_price |
| `owner_earnings` | DECIMAL | 90% of base_price |
| `total_charged` | DECIMAL | base_price + deposit |
| `status` | ENUM | `requested`, `approved`, `rejected`, `active`, `completed`, `cancelled`, `disputed` |
| `cancellation_reason` | TEXT | |
| `renter_rating` | INTEGER | 1–5 (owner rates renter) |
| `owner_rating` | INTEGER | 1–5 (renter rates owner/car) |
| `renter_comment` | TEXT | |
| `owner_comment` | TEXT | |
| `payment_status` | ENUM | `pending`, `held`, `released`, `refunded` |
| `payment_transaction_id` | STRING | |
| `notes` | TEXT | Renter notes to owner |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

**Indexes**: `renter_id`, `rental_car_id`, `owner_id`, `status`, `requested_start`

---

### 3.3 Model Associations (add to `server/models/index.js`)
```javascript
// RentalCar associations
User.hasMany(RentalCar, { foreignKey: 'owner_id', as: 'ownedRentalCars' });
RentalCar.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });

// RentalBooking associations
User.hasMany(RentalBooking, { foreignKey: 'renter_id', as: 'rentalBookings' });
RentalBooking.belongsTo(User, { foreignKey: 'renter_id', as: 'renter' });

User.hasMany(RentalBooking, { foreignKey: 'owner_id', as: 'receivedRentalBookings' });
RentalBooking.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });

RentalCar.hasMany(RentalBooking, { foreignKey: 'rental_car_id', as: 'bookings' });
RentalBooking.belongsTo(RentalCar, { foreignKey: 'rental_car_id', as: 'rentalCar' });
```

---

## 4. Backend — New API Endpoints

### New route file: `server/routes/rental.routes.js`

#### 4.1 Rental Car Management (Owner)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/rentals/cars` | rider/both/driver | List a car for rent |
| `GET` | `/api/rentals/cars/mine` | any | Get owner's listed cars |
| `GET` | `/api/rentals/cars/:id` | public | Get car details |
| `PUT` | `/api/rentals/cars/:id` | owner only | Update listing |
| `DELETE` | `/api/rentals/cars/:id` | owner only | Remove listing (soft delete) |
| `PUT` | `/api/rentals/cars/:id/toggle` | owner only | Toggle availability (pause/resume) |

#### 4.2 Map & Discovery (Renter)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/rentals/cars/available` | optional | Get all available cars (with lat/lng bbox filter) |

Query params: `lat`, `lng`, `radius_km` (default 10), `start`, `end` (ISO date range filter), `min_seats`, `fuel_type`, `max_price_per_day`

#### 4.3 Booking Flow (Renter)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/rentals/bookings` | any | Request a booking |
| `GET` | `/api/rentals/bookings/mine` | any | Get renter's bookings |
| `GET` | `/api/rentals/bookings/received` | any | Get bookings received as owner |
| `GET` | `/api/rentals/bookings/:id` | participant | Get booking detail |
| `POST` | `/api/rentals/bookings/:id/approve` | owner | Approve booking |
| `POST` | `/api/rentals/bookings/:id/reject` | owner | Reject booking |
| `POST` | `/api/rentals/bookings/:id/cancel` | renter | Cancel booking |
| `POST` | `/api/rentals/bookings/:id/start` | owner | Mark rental as started (car handed over) |
| `POST` | `/api/rentals/bookings/:id/complete` | owner or renter | Mark car returned |
| `POST` | `/api/rentals/bookings/:id/rate` | participant | Rate the experience |

#### 4.4 Admin Rental Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/admin/rentals/cars` | admin | List all rental cars |
| `PUT` | `/api/admin/rentals/cars/:id/status` | admin | Approve/suspend listing |
| `GET` | `/api/admin/rentals/bookings` | admin | List all bookings |
| `GET` | `/api/admin/rentals/stats` | admin | Rental platform stats |

---

### 4.5 Key Business Logic (server-side)

#### Booking price calculation
```
rental_hours = (end_time - start_time) / 3600000  // ms to hours
if rental_hours >= 24:
    rental_days = Math.ceil(rental_hours / 24)
    base_price  = rental_days × car.price_per_day
else:
    base_price  = rental_hours × car.price_per_hour
    // whichever is lower (daily cap logic optional)

platform_fee    = base_price × 0.10         // 10% platform commission
owner_earnings  = base_price × 0.90
total_charged   = base_price + deposit_amount
```

#### Availability check (before creating a booking)
```sql
-- Check no overlapping ACTIVE bookings exist for the car
SELECT id FROM RentalBookings
WHERE rental_car_id = ?
  AND status IN ('approved', 'active')
  AND NOT (requested_end <= ? OR requested_start >= ?)
  -- (existing_end <= new_start OR existing_start >= new_end) = no overlap
```

#### Car status transitions
```
pending_approval → [admin approves] → available
available        → [booking approved] → rented (on booking.status = active)
rented           → [booking completed] → available
available        → [owner toggles] → unavailable
unavailable      → [owner toggles] → available
any              → [admin] → suspended
```

---

## 5. Real-time Events (Socket.io)

Add to `server/services/socket.service.js`:

| Event (emit direction) | Payload | Purpose |
|------------------------|---------|---------|
| `server → owner` `rental_booking_request` | `{ booking, renter }` | New booking request received |
| `server → renter` `rental_booking_approved` | `{ booking, car, owner }` | Owner approved |
| `server → renter` `rental_booking_rejected` | `{ booking, reason }` | Owner rejected |
| `server → renter` `rental_booking_cancelled_by_owner` | `{ booking }` | Owner cancelled |
| `server → all` `rental_car_available` | `{ carId, location }` | Car became available (for live map update) |
| `server → all` `rental_car_unavailable` | `{ carId }` | Car was rented / paused |
| `client → server` `rental_car_location_update` | `{ carId, lat, lng }` | Owner updates car's parked location |

---

## 6. Mobile App — New Screens

### 6.1 Navigation changes
Add a **"Rental"** tab in `AppNavigator.js` (alongside Rider/Driver tabs).
The Rental tab contains its own stack navigator.

```
RentalTab
  ├── RentalMapScreen          (default: map view of available cars)
  ├── RentalCarDetailScreen    (car detail + Book button)
  ├── RentalBookingScreen      (select dates/times, confirm)
  ├── RentalBookingStatusScreen (track booking status)
  ├── MyBookingsScreen         (renter: all bookings)
  ├── MyRentalCarsScreen       (owner: my listed cars)
  ├── RegisterRentalCarScreen  (owner: add new listing)
  └── EditRentalCarScreen      (owner: edit listing)
```

---

### 6.2 Screen Descriptions

#### `RentalMapScreen`
- Full-screen map (React Native Maps, same as ride map)
- Rental car markers: **blue car icon** (distinct from taxi markers)
- Bottom sheet / search bar with filters: date range, price, seats, fuel type
- Tap marker → show car mini-card (photo, name, price/hr, rating)
- "View details" → `RentalCarDetailScreen`
- FAB button "List my car" → `RegisterRentalCarScreen`

#### `RentalCarDetailScreen`
- Car photos carousel
- Make, model, year, color
- Feature chips (AC, GPS, Automatic…)
- Price per hour / per day
- Pickup address + mini-map pin
- Owner info (name, rating, member since)
- Availability calendar (highlight unavailable blocks)
- "Book Now" button → `RentalBookingScreen`

#### `RentalBookingScreen`
- Date/time pickers: Start & End
- Computed total price breakdown
  - Base price (hours × rate)
  - Platform fee (10%)
  - Deposit (refundable)
  - **Total**
- Notes field (optional message to owner)
- "Send Request" button → POST `/api/rentals/bookings`
- Wait for owner approval (show status screen)

#### `RentalBookingStatusScreen`
- Status card: requested → approved → active → completed
- If `active`: show car pickup instructions, owner phone
- If `completed`: show rate button
- Cancel button (when status = `requested` or `approved` before start)

#### `MyBookingsScreen` (Renter view)
- Tabs: Active | Upcoming | Past
- Each row: car name, dates, price, status badge

#### `MyRentalCarsScreen` (Owner view)
- List of owner's cars with status badge
- Per car: active bookings count, earnings this month
- Quick toggle (available ↔ unavailable)
- "Add a car" button

#### `RegisterRentalCarScreen` (Owner)
- Form: make, model, year, color, license plate, seats, fuel type
- Photo upload (multiple)
- Features multi-select chips
- Price per hour + price per day
- Deposit amount
- Minimum rental duration
- Map pin: set pickup location (drag to set)
- Pickup instructions text field
- Availability window: from date → to date
- Submit → POST `/api/rentals/cars` (status = `pending_approval`)
- Show "awaiting admin approval" message

---

## 7. Admin Dashboard — New Pages

### 7.1 `admin/src/pages/RentalCars.jsx`
- Table: owner name, car (make/model/plate), listed date, status
- Filters: status, date range
- Actions per row:
  - **Approve** → sets status to `available` (car appears on map)
  - **Suspend** → removes from map
  - **View details** modal with photos

### 7.2 `admin/src/pages/RentalBookings.jsx`
- Table: renter, owner, car, dates, price, booking status
- Filters: status, date
- Actions: view, mark disputed, force-complete

### 7.3 Dashboard stats additions (`Dashboard.jsx`)
- Total rental cars listed
- Total rental bookings this month
- Rental revenue (platform fees collected)
- Active rentals right now

---

## 8. User Flows

### Flow A — Owner lists a car
```
1. Owner opens app → Rental tab
2. Taps "List my car"
3. Fills RegisterRentalCarScreen form
4. Submits → car created with status `pending_approval`
5. Admin receives notification → reviews → approves
6. Car appears on map for renters
7. Owner gets in-app notification: "Your car listing is approved!"
```

### Flow B — Renter books a car
```
1. Renter opens Rental tab → sees map with available cars
2. Taps a blue marker → mini-card appears
3. Taps "View details" → RentalCarDetailScreen
4. Taps "Book Now" → RentalBookingScreen
5. Selects start & end date/time
6. Sees price breakdown → taps "Send Request"
7. Booking created with status `requested`
8. Owner receives push notification + Socket event `rental_booking_request`
9. Owner opens app → sees booking request → taps Approve / Reject
10. Renter receives notification + socket event `rental_booking_approved`
11. On start date: Owner meets renter, taps "Hand over car" → status = `active`
12. Car marker disappears from map (status = `rented`)
13. On return: Either party taps "Mark returned" → status = `completed`
14. Both rate each other (1–5 stars)
15. Deposit released, owner earnings updated
```

### Flow C — Renter cancels a booking
```
- If cancelled before approval: full refund, no fee
- If cancelled after approval but 24h+ before start: full refund, no fee
- If cancelled < 24h before start: deposit forfeited (configurable)
- If cancelled after car handed over: owner keeps full amount (dispute required)
```

---

## 9. Business Logic & Pricing Rules

### Commission structure
| Party | Share |
|-------|-------|
| Owner | 90% of base price |
| Platform | 10% of base price |
| Deposit | Returned to renter after successful return |

### Pricing caps
- If hourly price × 24 > daily price → use daily price for 24+ h bookings
- Minimum charge = `minimum_hours × price_per_hour`

### Conflict prevention
- A car cannot have two overlapping `approved` or `active` bookings
- The server rejects the booking request if overlap is detected
- Owner cannot delete a car that has an `active` booking

### Ratings
- Both parties rate each other 1–5 stars after booking completes
- Owner's car listing shows average rating from past renters
- Renter's profile shows average rating as a renter

---

## 10. File Change Manifest

### New files to create
```
server/
  models/RentalCar.js               ← NEW
  models/RentalBooking.js           ← NEW
  routes/rental.routes.js           ← NEW

mobile/src/
  screens/Rental/
    RentalMapScreen.js              ← NEW
    RentalCarDetailScreen.js        ← NEW
    RentalBookingScreen.js          ← NEW
    RentalBookingStatusScreen.js    ← NEW
    MyBookingsScreen.js             ← NEW
    MyRentalCarsScreen.js           ← NEW
    RegisterRentalCarScreen.js      ← NEW
    EditRentalCarScreen.js          ← NEW

admin/src/
  pages/RentalCars.jsx              ← NEW
  pages/RentalBookings.jsx          ← NEW
```

### Files to modify
```
server/
  server.js                         ← mount rental.routes.js
  models/index.js                   ← add RentalCar, RentalBooking imports + associations
  services/socket.service.js        ← add rental socket events
  routes/admin.routes.js            ← add rental admin endpoints + FIX security bug

mobile/src/
  navigation/AppNavigator.js        ← add Rental tab + stack
  services/api.service.js           ← FIX hardcoded URL + add rental API calls
  services/socket.service.js        ← FIX hardcoded URL + add rental socket listeners

admin/src/
  App.jsx                           ← add /rental-cars and /rental-bookings routes
  components/Layout.jsx             ← add sidebar links for rental pages
  pages/Dashboard.jsx               ← add rental stats section
```

---

## 11. Implementation Order

### Phase 1 — Bug Fixes (do first, safest)
1. Fix admin endpoint security vulnerability (`admin.routes.js`)
2. Fix hardcoded URLs in mobile services (use env variables)
3. Fix socket error handlers
4. Fix driver earnings calculation

### Phase 2 — Backend Core
5. Create `RentalCar` model
6. Create `RentalBooking` model
7. Update `models/index.js` with associations
8. Create `rental.routes.js` with all endpoints
9. Mount route in `server.js`
10. Add rental socket events to `socket.service.js`

### Phase 3 — Mobile Screens
11. Create `RegisterRentalCarScreen` (owner lists a car)
12. Create `RentalMapScreen` (browse map with rental markers)
13. Create `RentalCarDetailScreen`
14. Create `RentalBookingScreen`
15. Create `RentalBookingStatusScreen`
16. Create `MyRentalCarsScreen` and `MyBookingsScreen`
17. Create `EditRentalCarScreen`
18. Update `AppNavigator.js` — add Rental tab & stack

### Phase 4 — Admin Dashboard
19. Create `RentalCars.jsx` admin page
20. Create `RentalBookings.jsx` admin page
21. Update `Dashboard.jsx` with rental stats
22. Update `Layout.jsx` and `App.jsx`

### Phase 5 — Polish
23. Add rental admin endpoints to `admin.routes.js`
24. Test full renter + owner flow end-to-end
25. Add real-time socket updates for rental car markers on map
26. Update `README.md` with rental feature documentation

---

## Summary

This plan adds **peer-to-peer car rental** as a self-contained feature module on top of the existing ride-sharing app.
It requires **2 new DB models**, **1 new route file**, **8 new mobile screens**, and **2 new admin pages**.
The feature reuses all existing infrastructure: auth, maps, real-time sockets, and the admin dashboard pattern.
No new paid external API is required.
The implementation is designed to be done in 4 phases, starting with critical bug fixes to stabilize the existing app.
