# How to Run & Test the App — Complete Beginner Guide

> This guide walks you through every single step to get the full app running:
> the **backend server**, the **admin panel** (in your browser), and the **mobile app** on your Android phone.
>
> You will open **3 terminal windows** that all run at the same time. Don't close any of them.

---

## What is this app?

This is a full platform with two features:
- **Ride sharing** — like Uber. Riders request trips, drivers accept them.
- **Car rental** — peer-to-peer. Anyone can list their personal car for rent. Anyone can book it.

The app has 3 parts:

| Part | What it is | Where it runs |
|------|-----------|--------------|
| **Server** | The backend — handles all data, logic, real-time events | Your PC, port `5000` |
| **Admin panel** | A website to manage users, rides, rentals | Your browser at `localhost:5173` |
| **Mobile app** | The app users interact with | Your Android phone via Expo Go |

---

## Before You Start — Install These Once

You only need to do this section once ever.

### 1. Install Node.js

Node.js is the engine that runs the server and the admin panel.

1. Go to [https://nodejs.org](https://nodejs.org)
2. Download the **LTS** version (the one that says "Recommended for most users")
3. Run the installer — click Next all the way through
4. When done, verify it works: open a terminal and type:
   ```
   node --version
   ```
   You should see something like `v20.11.0`. Any version above 18 is fine.

### 2. Install PostgreSQL (the database)

PostgreSQL is where all the app data is stored (users, rides, bookings, etc.).

1. Go to [https://www.postgresql.org/download/windows](https://www.postgresql.org/download/windows)
2. Click **"Download the installer"** → choose the latest version
3. Run the installer — keep all defaults
4. When it asks for a **password**, set one you'll remember — you'll need it later (e.g. `postgres123`)
5. Keep the port as `5432`
6. Finish the installation

### 3. Install Expo Go on your Android phone

Expo Go lets you run the mobile app on your phone without publishing it to the Play Store.

1. On your Android phone, open the **Play Store**
2. Search for **"Expo Go"**
3. Install it — it's free

> Make sure your phone and your PC are connected to **the same WiFi network** throughout testing.

---

## Step 0 — Find Your WiFi IP Address

Your mobile app needs to know your PC's address on the WiFi network to connect to the server.

1. Open a terminal (search "cmd" in the Windows start menu)
2. Type:
   ```
   ipconfig
   ```
3. Look for the section that says **"Wireless LAN adapter Wi-Fi"** and find the line **"IPv4 Address"**

```
Wireless LAN adapter Wi-Fi:
   IPv4 Address. . . . . . : 192.168.1.68   <-- this is your IP
```

> Your current IP is: **`192.168.1.68`**
> This was detected automatically when this file was created.
> If you change WiFi networks, re-run `ipconfig` and update the IP wherever you see it in this guide.

---

## Step 1 — Create the Database

You only need to do this once.

1. Press the **Windows key**, search for **"pgAdmin 4"** and open it
2. In the left sidebar, expand **Servers** → right-click **Databases** → click **Create** → **Database...**
3. In the "Database" field, type: `rideshare_db`
4. Click **Save**

That's all. The server will automatically create all the tables inside this database when it starts.

> **Alternative (if you prefer the terminal):**
> Open a terminal and type:
> ```
> psql -U postgres
> ```
> Enter your PostgreSQL password, then type:
> ```sql
> CREATE DATABASE rideshare_db;
> \q
> ```

---

## Step 2 — Set Up the Server

The server is the brain of the app. Everything goes through it.

### 2a. Open a terminal in the server folder

1. Open a terminal (cmd or PowerShell)
2. Navigate to the server folder:
   ```
   cd "C:\Users\user\OneDrive\Documents\tx\server"
   ```

### 2b. Install packages (first time only)

```
npm install
```

This downloads all the code libraries the server needs. It takes about 1–2 minutes the first time.

### 2c. Create the configuration file

The server needs a `.env` file with your private settings (database password, secret keys, etc.).

1. In the same terminal, run:
   ```
   copy .env.example .env
   ```
2. Now open the file `server\.env` in any text editor (Notepad, VS Code, etc.)
3. Replace its contents with this — **only change `YOUR_POSTGRES_PASSWORD_HERE`** to the password you set during PostgreSQL installation:

   ```env
   PORT=5000
   NODE_ENV=development

   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=rideshare_db
   DB_USER=postgres
   DB_PASSWORD=YOUR_POSTGRES_PASSWORD_HERE

   JWT_SECRET=mysupersecretjwtkey2024
   JWT_EXPIRE=7d

   CLIENT_URL=*

   COMMISSION_RATE=20
   BOOKING_FEE=1.5

   ADMIN_SECRET=myadminsecret123
   ```

4. Save the file

### 2d. Start the server

```
npm run dev
```

**You should see this output — this means everything is working:**

```
Connecting to database...
✓ Database connection established
Synchronizing database...
✓ Database synchronized successfully
================================
Server running on port 5000
API: http://localhost:5000/api
================================
```

> If you see an error about the database password, double-check `DB_PASSWORD` in `server\.env`.

**Leave this terminal open.** The server must keep running.

---

## Step 3 — Set Up the Admin Panel

The admin panel is a website that lets you manage users, approve vehicles, monitor rides and rentals.

### 3a. Open a NEW terminal (keep the server terminal open!)

1. Open a **second** terminal window
2. Navigate to the admin folder:
   ```
   cd "C:\Users\user\OneDrive\Documents\tx\admin"
   ```

### 3b. Install packages (first time only)

```
npm install
```

### 3c. Start the admin panel

```
npm run dev
```

You should see:

```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

### 3d. Create your admin account (one time only)

Before you can log in, you need to create an admin user. Open a **third terminal temporarily** and run this command:

**On Windows PowerShell:**
```powershell
Invoke-RestMethod -Uri http://localhost:5000/api/admin/create -Method POST -ContentType "application/json" -Body '{"name":"Admin","email":"admin@test.com","password":"admin123","admin_secret":"myadminsecret123"}'
```

**On Windows cmd (if you have curl installed):**
```cmd
curl -X POST http://localhost:5000/api/admin/create -H "Content-Type: application/json" -d "{\"name\":\"Admin\",\"email\":\"admin@test.com\",\"password\":\"admin123\",\"admin_secret\":\"myadminsecret123\"}"
```

You should get back a response like: `{"message":"Admin created successfully",...}`

> You only need to do this **once ever**. The account stays in the database.

### 3e. Log in to the admin panel

1. Open your browser and go to: **http://localhost:5173**
2. Log in with:
   - Email: `admin@test.com`
   - Password: `admin123`
3. You should see the Dashboard with stats (all zeros for now)

**Leave this terminal open too.**

---

## Step 4 — Set Up the Mobile App

This is the app your users will use — riders, drivers, and car owners.

### 4a. Open a NEW terminal (you now have 3 terminals total)

1. Open a **third** terminal window
2. Navigate to the mobile folder:
   ```
   cd "C:\Users\user\OneDrive\Documents\tx\mobile"
   ```

### 4b. Install packages (first time only)

```
npm install
```

This might take 2–3 minutes the first time.

### 4c. Create the mobile configuration file

The mobile app needs to know your PC's IP address to connect to the server over WiFi.

Create a new file called `.env` inside the `mobile` folder with this content:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.68:5000/api
EXPO_PUBLIC_SOCKET_URL=http://192.168.1.68:5000
```

> The IP `192.168.1.68` is your current WiFi IP — already filled in.
> If you change WiFi networks later, update this IP (run `ipconfig` to find the new one).

**How to create this file:**
- Open VS Code → go to the `mobile` folder → create a new file named `.env` → paste the two lines above → save

### 4d. Start Expo

```
npm start
```

After a few seconds you will see a **QR code** printed in the terminal, plus a menu of options.

```
Metro waiting on exp://192.168.1.68:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Press a │ open Android
› Press w │ open web

QR CODE HERE
```

### 4e. Open the app on your Android phone

1. Make sure your phone is on the **same WiFi** as your PC
2. Open **Expo Go** on your phone
3. Tap **"Scan QR Code"**
4. Point your camera at the QR code in the terminal
5. Wait 20–30 seconds for the app to load (first load is slower)

**The app should open on your phone showing the Login screen.**

**Leave this terminal open.**

---

## You're Running! — 3 Terminals Summary

At this point you should have 3 terminal windows open:

```
Terminal 1 (server)   → npm run dev    → shows "Server running on port 5000"
Terminal 2 (admin)    → npm run dev    → open http://localhost:5173 in browser
Terminal 3 (mobile)   → npm start      → QR code visible, app running on phone
```

---

## Step 5 — Test Everything

Now let's walk through each feature to verify it all works.

---

### Test 1 — Register as a Rider and request a ride

**Goal:** Make sure ride-sharing works end to end.

**On your phone:**

1. On the Login screen, tap **Register**
2. Fill in:
   - Name: `Test Rider`
   - Email: `rider@test.com`
   - Phone: `0600000001`
   - Password: `password123`
   - Role: select **Rider**
3. Tap **Register**
4. You land on the **Rider Home Screen** — a map of your area
5. Tap somewhere on the map to set a pickup location
6. Tap **Request Ride**

**Check in the admin panel (browser):**

- Go to **http://localhost:5173** → Dashboard
- The "Total Rides" counter should go up by 1
- Go to **Rides** in the sidebar — you should see the new ride in status "requested"

---

### Test 2 — Register as a Driver and accept a ride

**Goal:** Test the driver side and vehicle approval flow.

**On your phone (or use a browser to simulate a second user):**

1. Go back to the Login screen (tap logout if needed)
2. Tap **Register** and create a driver account:
   - Name: `Test Driver`
   - Email: `driver@test.com`
   - Role: select **Driver**
3. After registering, you'll be asked to register a vehicle — fill in the car details
4. Submit — the vehicle goes to "pending" status

**In the admin panel:**

5. Go to **Vehicles** in the sidebar
6. You'll see "Test Driver"'s car with status **Pending**
7. Click **Review** → click **Approve**

**Back on the phone (as driver):**

8. Log in as `driver@test.com`
9. Go online — you should start receiving ride requests from the rider

---

### Test 3 — List a car for rental and book it

**Goal:** Test the car rental feature end to end.

**On your phone:**

1. Log in as `rider@test.com` (or any account)
2. At the bottom of the screen, tap the **car icon** tab — this is the Rental section
3. Tap **"List My Car"**
4. Fill in the car details:
   - Make: `Toyota`, Model: `Corolla`, Year: `2020`
   - Color: `White`, Plate: `AB-123-CD`
   - Price per hour: `5`, Price per day: `30`, Deposit: `50`
   - Set a pickup location on the mini-map
   - Set availability dates (e.g. today → next month)
5. Tap **Submit** — the car is now "pending approval"

**In the admin panel:**

6. Go to **Rental Cars** in the sidebar
7. Find the Toyota Corolla — status is **Pending Approval**
8. Click **Review** → click **Approve — Publish on Map**

**Back on the phone:**

9. Tap the **Rental** tab → you should see the car appear as a **blue marker** on the map
10. Tap the marker → tap **View Details & Book**
11. Select a duration and dates → tap **Send Booking Request**

**To approve the booking (as the car owner):**

12. Still logged in as the owner → Rental tab → **Received Bookings**
13. Find the request → tap **Approve**
14. The renter sees the booking status update in real-time

---

### Test 4 — Explore the Admin Panel

Everything you can do in **http://localhost:5173**:

| Page | What you can do |
|------|----------------|
| **Dashboard** | See live stats — total users, rides today, rental revenue, active bookings |
| **Users** | Search users by name/email, filter by role, activate or deactivate accounts |
| **Vehicles** | See all registered driver vehicles, approve/reject/suspend them |
| **Rides** | Browse every trip, filter by status, click any ride to see full details |
| **Rental Cars** | Review car listings, approve them so they appear on the map |
| **Rental Bookings** | Monitor all rental transactions, see earnings breakdown per booking |

---

## Troubleshooting

### "My phone can't connect to the server"

This is the most common issue. Check these things in order:

1. **Are both devices on the same WiFi?**
   - On your phone: Settings → WiFi → check the network name
   - On your PC: click the WiFi icon in the taskbar → check the network name
   - They must match exactly

2. **Has your IP changed?**
   - On your PC, open a terminal and run `ipconfig`
   - Find "IPv4 Address" under your WiFi adapter
   - If it's different from `192.168.1.68`, update `mobile\.env` with the new IP
   - Restart Expo (`Ctrl+C` in terminal 3, then `npm start`)

3. **Is Windows Firewall blocking port 5000?**
   - When you first start the server, Windows may show a security popup asking if Node.js can access the network
   - Click **"Allow access"**
   - If you missed it: search "Windows Defender Firewall" → "Allow an app through firewall" → find Node.js → check both boxes

---

### "Database connection failed" when starting the server

1. Make sure PostgreSQL is running:
   - Press Windows key → search "Services" → find "postgresql-x64-xx" → make sure it says "Running"
   - Or simply restart your PC — PostgreSQL starts automatically on boot

2. Check your password:
   - Open `server\.env`
   - Make sure `DB_PASSWORD` matches exactly what you set during PostgreSQL installation

3. Make sure the database exists:
   - Open pgAdmin → expand Databases → confirm `rideshare_db` is listed

---

### "The QR code won't scan"

- Make sure Expo Go is up to date (update it in the Play Store)
- Try pressing **`w`** in the Expo terminal — this opens the app in your browser (good sanity check that Expo is working)
- Try pressing **`r`** in the Expo terminal to reload
- If the QR code itself is hard to read in the terminal, Expo also shows a URL like `exp://192.168.1.68:8081` — you can manually enter this in Expo Go

---

### "Admin login says invalid credentials"

- The admin account might not have been created yet
- Re-run the PowerShell command from Step 3d
- Check that the server is still running (Terminal 1)

---

### "The app loads but shows a blank white screen"

- Press **`r`** in the Expo terminal to force a reload
- Check that `mobile\.env` exists and has the correct IP
- Make sure the server is running (Terminal 1 shows no errors)

---

## Changing WiFi Networks

Every time you move to a different WiFi, your PC gets a new IP address. Here's what to do:

1. **Find your new IP** — open a terminal and run:
   ```
   ipconfig
   ```
   Look for "IPv4 Address" under "Wireless LAN adapter Wi-Fi"

2. **Update `mobile\.env`** — replace the old IP:
   ```env
   EXPO_PUBLIC_API_URL=http://NEW_IP_HERE:5000/api
   EXPO_PUBLIC_SOCKET_URL=http://NEW_IP_HERE:5000
   ```

3. **Restart Expo** — in Terminal 3:
   ```
   Ctrl+C
   npm start
   ```

4. The server and admin panel don't need to be restarted.

---

## Daily Startup Checklist

Next time you come back to work on the app, just do this:

- [ ] Open Terminal 1 → `cd server` → `npm run dev` → wait for "Server running"
- [ ] Open Terminal 2 → `cd admin` → `npm run dev` → open `http://localhost:5173`
- [ ] Open Terminal 3 → `cd mobile` → `npm start` → scan QR with Expo Go
- [ ] PostgreSQL is running (it starts automatically on Windows boot)
- [ ] Phone and PC are on the same WiFi

That's it — no reinstalling, no recreating the database, no recreating the admin account. Those were one-time steps.
