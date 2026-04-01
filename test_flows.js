/**
 * Ombia Express — Automated Flow Tester v2
 * Usage: node test_flows.js
 */

const BASE         = 'http://37.60.240.199:5001/api';
const ADMIN_SECRET = 'OmbiaAdmin@2026!';

let passed = 0, failed = 0;
const failures = [];

// ─── helpers ─────────────────────────────────────────────────────────────────

async function req(method, path, body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
        const res = await fetch(`${BASE}${path}`, {
            method, headers,
            body: body ? JSON.stringify(body) : undefined,
        });
        const data = await res.json().catch(() => ({}));
        return { status: res.status, data };
    } catch (e) {
        return { status: 0, data: { error: e.message } };
    }
}

function log(section, name, ok, detail = '') {
    const icon = ok ? '✅' : '❌';
    const line = `${icon}  [${section}] ${name}${detail ? ' — ' + detail : ''}`;
    console.log(line);
    ok ? passed++ : (failed++, failures.push(line));
}

function sep(title) {
    console.log(`\n${'─'.repeat(58)}`);
    console.log(`  ${title}`);
    console.log('─'.repeat(58));
}

// ─── state ───────────────────────────────────────────────────────────────────

const ts          = Date.now();
const riderPhone  = `24177${String(ts).slice(-6)}`;
const driverPhone = `24166${String(ts).slice(-6)}`;
const adminEmail  = `admin${ts}@test.com`;
const password    = 'Test@1234';

let riderToken, driverToken, adminToken;
let rideId, vehicleId, rentalCarId, deliveryId, productId, listingId, ticketId;
let driverVerifId, merchantVerifId, courierVerifId;
let driverId;

// ─── 1. HEALTH ───────────────────────────────────────────────────────────────

async function testHealth() {
    sep('1. SERVER HEALTH');
    const r = await req('GET', '/auth/profile');
    log('Health', 'Server reachable',   r.status !== 0,   `HTTP ${r.status}`);
    log('Health', 'Auth guard active',  r.status === 401, r.data?.error || '');
}

// ─── 2. AUTH ─────────────────────────────────────────────────────────────────

async function testAuth() {
    sep('2. AUTHENTICATION');

    const r1 = await req('POST', '/auth/register', {
        name: 'Test Rider', phone: riderPhone, password, country_code: '241',
    });
    log('Auth', 'Register rider', r1.status === 201, r1.data?.error || '');
    riderToken = r1.data?.token;

    const r2 = await req('POST', '/auth/register', {
        name: 'Test Driver', phone: driverPhone, password, country_code: '241',
    });
    log('Auth', 'Register driver', r2.status === 201, r2.data?.error || '');
    driverToken = r2.data?.token;
    driverId = r2.data?.user?.id;

    const login = await req('POST', '/auth/login', { phone: riderPhone, password });
    log('Auth', 'Login with phone', login.status === 200, login.data?.error || '');
    if (login.data?.token) riderToken = login.data.token;

    const profile = await req('GET', '/auth/profile', null, riderToken);
    log('Auth', 'Get profile', profile.status === 200, profile.data?.name || profile.data?.error);

    const update = await req('PUT', '/auth/profile', { name: 'Rider OK' }, riderToken);
    log('Auth', 'Update profile', update.status === 200, update.data?.error || '');

    const bad = await req('POST', '/auth/login', { phone: riderPhone, password: 'wrong123' });
    log('Auth', 'Reject wrong password', [400, 401].includes(bad.status), '');

    // Admin account
    const adm = await req('POST', '/admin/create', {
        name: 'Test Admin', email: adminEmail,
        phone: `24155${String(ts).slice(-6)}`,
        password, admin_secret: ADMIN_SECRET,
    });
    log('Auth', 'Create admin account', adm.status === 201, adm.data?.error || '');
    const admLogin = await req('POST', '/auth/login', { email: adminEmail, password });
    adminToken = admLogin.data?.token;
    log('Auth', 'Admin login', admLogin.status === 200, admLogin.data?.error || '');
}

// ─── 3. KYC — SUBMIT + ADMIN APPROVE ─────────────────────────────────────────

async function testKYC() {
    sep('3. KYC — SUBMIT & APPROVE');

    // Driver KYC submit
    const dkyc = await req('POST', '/verifications/driver', {
        license_number: `LIC${ts}`, license_expiry: '2028-01-01',
        license_front_url: 'https://test.com/license.jpg',
        id_type: 'passport', id_number: `ID${ts}`,
        id_front_url: 'https://test.com/id.jpg',
        submit: true,
    }, driverToken);
    log('KYC', 'Driver submits KYC', [200, 201].includes(dkyc.status), dkyc.data?.error || '');
    driverVerifId = dkyc.data?.verification?.id;

    // Admin approves driver KYC
    if (driverVerifId && adminToken) {
        const approve = await req('PUT', `/admin/verifications/drivers/${driverVerifId}`, {
            status: 'approved', notes: 'Auto-approved by test',
        }, adminToken);
        log('KYC', 'Admin approves driver KYC', approve.status === 200, approve.data?.error || '');
    } else {
        // Find by listing
        const list = await req('GET', '/admin/verifications/drivers?status=submitted', null, adminToken);
        const v = list.data?.verifications?.[0];
        if (v) {
            const approve = await req('PUT', `/admin/verifications/drivers/${v.id}`, {
                status: 'approved', notes: 'Auto-approved by test',
            }, adminToken);
            log('KYC', 'Admin approves driver KYC', approve.status === 200, approve.data?.error || '');
            driverVerifId = v.id;
        } else {
            log('KYC', 'Admin approves driver KYC', false, 'No pending KYC found');
        }
    }

    // Store owner KYC (for e-commerce)
    const mkyc = await req('POST', '/verifications/merchant', {
        merchant_type: 'store_owner',
        business_name: `TestShop${ts}`, business_address: 'Libreville',
        submit: true,
    }, driverToken);
    log('KYC', 'Store owner submits KYC', [200, 201].includes(mkyc.status), mkyc.data?.error || '');
    merchantVerifId = mkyc.data?.verification?.id;
    if (merchantVerifId && adminToken) {
        const a = await req('PUT', `/admin/verifications/merchants/${merchantVerifId}`, { status: 'approved' }, adminToken);
        log('KYC', 'Admin approves store_owner KYC', a.status === 200, a.data?.error || '');
    }

    // Car seller KYC (for car market)
    const cskyc = await req('POST', '/verifications/merchant', {
        merchant_type: 'car_seller',
        business_name: `CarSeller${ts}`, business_address: 'Libreville',
        submit: true,
    }, riderToken);
    log('KYC', 'Car seller submits KYC', [200, 201].includes(cskyc.status), cskyc.data?.error || '');
    const csverifId = cskyc.data?.verification?.id;
    if (csverifId && adminToken) {
        const a = await req('PUT', `/admin/verifications/merchants/${csverifId}`, { status: 'approved' }, adminToken);
        log('KYC', 'Admin approves car_seller KYC', a.status === 200, a.data?.error || '');
    }

    // Car verification (for rental_owner) — fuel_type: gasoline|diesel|electric|hybrid
    const carkyc = await req('POST', '/verifications/car', {
        make: 'Toyota', model: 'RAV4', year: 2021, color: 'Black',
        plate_number: `KYC${ts % 9999}`, seats: 5,
        fuel_type: 'gasoline', transmission: 'automatic',
        submit: true,
    }, driverToken);
    log('KYC', 'Rental owner submits car KYC', [200, 201].includes(carkyc.status), carkyc.data?.error || '');
    const carVerifId = carkyc.data?.verification?.id;
    if (carVerifId && adminToken) {
        const a = await req('PUT', `/admin/verifications/cars/${carVerifId}`, { status: 'approved' }, adminToken);
        log('KYC', 'Admin approves car KYC', a.status === 200, a.data?.error || '');
    }

    // Courier KYC (transport_type must be: scooter | velo | voiture | a_pied)
    const ckyc = await req('POST', '/verifications/courier', {
        transport_type: 'scooter', submit: true,
    }, driverToken);
    log('KYC', 'Courier submits KYC', [200, 201].includes(ckyc.status), ckyc.data?.error || '');
    courierVerifId = ckyc.data?.verification?.id;
    if (courierVerifId && adminToken) {
        const a = await req('PUT', `/admin/verifications/couriers/${courierVerifId}`, { status: 'approved' }, adminToken);
        log('KYC', 'Admin approves courier KYC', a.status === 200, a.data?.error || '');
    }

    // Activate all services
    const actDriver = await req('PUT', '/auth/activate-service', { role: 'driver' }, driverToken);
    log('KYC', 'Activate driver service', actDriver.status === 200, actDriver.data?.error || '');

    const actStore = await req('PUT', '/auth/activate-service', { role: 'store_owner' }, driverToken);
    log('KYC', 'Activate store_owner service', actStore.status === 200, actStore.data?.error || '');

    const actCarSeller = await req('PUT', '/auth/activate-service', { role: 'car_seller' }, riderToken);
    log('KYC', 'Activate car_seller service', actCarSeller.status === 200, actCarSeller.data?.error || '');

    const actCourier = await req('PUT', '/auth/activate-service', { role: 'courier' }, driverToken);
    log('KYC', 'Activate courier service', actCourier.status === 200, actCourier.data?.error || '');

    const actRental = await req('PUT', '/auth/activate-service', { role: 'rental_owner' }, driverToken);
    log('KYC', 'Activate rental_owner service', actRental.status === 200, actRental.data?.error || '');
}

// ─── 4. VEHICLES ─────────────────────────────────────────────────────────────

async function testVehicles() {
    sep('4. VEHICLES');

    // vehicle_type: economy|comfort|premium|xl   field: license_plate
    const create = await req('POST', '/vehicles', {
        make: 'Toyota', model: 'Corolla', year: 2020,
        color: 'White', license_plate: `GA${ts % 9999}`,
        vehicle_type: 'economy', seats: 4,
    }, driverToken);
    log('Vehicle', 'Register vehicle', create.status === 201, create.data?.error || '');
    vehicleId = create.data?.vehicle?.id;

    // Admin must approve vehicle before driver can accept rides
    if (vehicleId && adminToken) {
        const approveV = await req('PUT', `/admin/vehicles/${vehicleId}/status`, { status: 'approved' }, adminToken);
        log('Vehicle', 'Admin approves vehicle', approveV.status === 200, approveV.data?.error || '');
    }

    const list = await req('GET', '/vehicles', null, driverToken);
    log('Vehicle', 'List my vehicles', list.status === 200,
        `${list.data?.vehicles?.length ?? 0} vehicle(s)`);
}

// ─── 5. WALLET ───────────────────────────────────────────────────────────────

async function testWallet() {
    sep('5. OMBIA WALLET');

    const bal = await req('GET', '/wallet/balance', null, riderToken);
    log('Wallet', 'Get balance', bal.status === 200, `Balance: ${bal.data?.balance ?? bal.data?.error}`);

    const topup = await req('POST', '/wallet/topup', { amount: 10000, method: 'airtel_money' }, riderToken);
    log('Wallet', 'Top-up (Airtel Money)', topup.status === 200,
        `New balance: ${topup.data?.new_balance ?? topup.data?.error}`);

    await req('POST', '/wallet/topup', { amount: 10000, method: 'airtel_money' }, driverToken);

    const txs = await req('GET', '/wallet/transactions', null, riderToken);
    log('Wallet', 'Transaction history', txs.status === 200,
        `${txs.data?.transactions?.length ?? 0} transaction(s)`);

    // Wallet transfer
    const driverProfile = await req('GET', '/auth/profile', null, driverToken);
    const driverId = driverProfile.data?.id;
    if (driverId) {
        const transfer = await req('POST', '/wallet/transfer', {
            recipient_id: driverId, amount: 500, note: 'Test transfer',
        }, riderToken);
        log('Wallet', 'Transfer between wallets', transfer.status === 200, transfer.data?.error || '');
    }
}

// ─── 6. RIDES ────────────────────────────────────────────────────────────────

async function testRides() {
    sep('6. VTC — RIDE FLOW');

    const ride = await req('POST', '/rides/request', {
        pickup_address: 'Libreville Centre',
        dropoff_address: 'Aéroport Libreville',
        pickup_lat: 0.3924, pickup_lng: 9.4536,
        dropoff_lat: 0.4584, dropoff_lng: 9.4121,
        distance_km: 8.5, duration_minutes: 20,
        vehicle_type: 'economy', payment_method: 'cash',
    }, riderToken);
    log('Ride', 'Request a ride', ride.status === 201, ride.data?.error || '');
    rideId = ride.data?.ride?.id;

    if (!rideId) { log('Ride', 'Full ride flow (skipped — no ride)', false, ''); return; }

    const accept = await req('POST', `/rides/${rideId}/accept`, { vehicle_id: vehicleId }, driverToken);
    log('Ride', 'Driver accepts ride', accept.status === 200, accept.data?.error || '');

    const start = await req('POST', `/rides/${rideId}/start`, {}, driverToken);
    log('Ride', 'Start ride', start.status === 200, start.data?.error || '');

    const complete = await req('POST', `/rides/${rideId}/complete`, {}, driverToken);
    log('Ride', 'Complete ride', complete.status === 200, complete.data?.error || '');

    const rate = await req('POST', `/rides/${rideId}/rate`, { rating: 5, comment: 'Excellent!' }, riderToken);
    log('Ride', 'Rate ride', rate.status === 200, rate.data?.error || '');

    const history = await req('GET', '/rides/history', null, riderToken);
    log('Ride', 'Ride history', history.status === 200,
        `${history.data?.rides?.length ?? 0} ride(s)`);
}

// ─── 7. RENTAL ───────────────────────────────────────────────────────────────

async function testRental() {
    sep('7. CAR RENTAL');

    // Required fields: license_plate, price_per_hour, price_per_day, pickup_lat, pickup_lng, pickup_address, available_from, available_until
    const car = await req('POST', '/rental/cars', {
        make: 'Toyota', model: 'RAV4', year: 2021,
        color: 'Black', license_plate: `RNT${ts % 9999}`,
        price_per_hour: 3000, price_per_day: 20000,
        pickup_lat: 0.3924, pickup_lng: 9.4536,
        pickup_address: 'Libreville Centre',
        available_from: new Date().toISOString(),
        available_until: new Date(Date.now() + 30 * 86400000).toISOString(),
        seats: 5, transmission: 'automatic', fuel_type: 'gasoline',
        description: 'SUV fiable',
    }, driverToken);
    log('Rental', 'List rental car', car.status === 201, car.data?.error || '');
    rentalCarId = car.data?.car?.id;

    // Admin must approve rental car before it shows as available
    if (rentalCarId && adminToken) {
        const approveC = await req('PUT', `/admin/rentals/cars/${rentalCarId}/status`, { status: 'available' }, adminToken);
        log('Rental', 'Admin approves rental car', approveC.status === 200, approveC.data?.error || '');
    }

    const browse = await req('GET', '/rental/cars/available', null, riderToken);
    log('Rental', 'Browse available cars', browse.status === 200,
        `${browse.data?.cars?.length ?? 0} car(s)`);

    if (!rentalCarId) { log('Rental', 'Book car (skipped)', false, ''); return; }

    const book = await req('POST', '/rental/bookings', {
        rental_car_id: rentalCarId,
        requested_start: new Date(Date.now() + 86400000).toISOString(),
        requested_end:   new Date(Date.now() + 86400000 * 3).toISOString(),
        notes: 'Test booking',
    }, riderToken);
    log('Rental', 'Book a car', book.status === 201, book.data?.error || '');

    const myBookings = await req('GET', '/rental/bookings/mine', null, riderToken);
    log('Rental', 'My bookings', myBookings.status === 200, myBookings.data?.error || '');
}

// ─── 8. DELIVERY ─────────────────────────────────────────────────────────────

async function testDelivery() {
    sep('8. DELIVERY');

    const delivery = await req('POST', '/deliveries', {
        pickup_address:      'Port Gentil Centre',
        dropoff_address:     'Quartier Louis',
        package_description: 'Documents',
        package_weight:      0.5,
        payment_method:      'cash',
    }, riderToken);
    log('Delivery', 'Create delivery request', delivery.status === 201, delivery.data?.error || '');
    deliveryId = delivery.data?.delivery?.id;

    const available = await req('GET', '/deliveries/available', null, driverToken);
    log('Delivery', 'Browse available deliveries', available.status === 200,
        `${available.data?.deliveries?.length ?? 0} delivery(ies)`);

    if (deliveryId) {
        const accept = await req('POST', `/deliveries/${deliveryId}/accept`, {}, driverToken);
        log('Delivery', 'Courier accepts delivery', accept.status === 200, accept.data?.error || '');
    }
}

// ─── 9. E-COMMERCE ───────────────────────────────────────────────────────────

async function testEcommerce() {
    sep('9. E-COMMERCE');

    // category: restaurant|grocery|fashion|beauty|electronics|home|sports|services|other
    const product = await req('POST', '/products', {
        name: 'Chemise Wax', price: 8500,
        description: 'Tissu wax qualité', category: 'fashion', stock: 10,
    }, driverToken);
    log('Ecommerce', 'Create product', product.status === 201, product.data?.error || '');
    productId = product.data?.product?.id;

    const browse = await req('GET', '/products', null, riderToken);
    log('Ecommerce', 'Browse products', browse.status === 200,
        `${browse.data?.products?.length ?? 0} product(s)`);

    if (!productId) { log('Ecommerce', 'Place order (skipped)', false, ''); return; }

    const order = await req('POST', '/orders', {
        seller_id: driverId,
        items: [{ product_id: productId, quantity: 1 }],
        payment_method: 'cash', delivery_address: 'Libreville, Gabon',
    }, riderToken);
    log('Ecommerce', 'Place order', order.status === 201, order.data?.error || '');

    const myOrders = await req('GET', '/orders/mine', null, riderToken);
    log('Ecommerce', 'My orders', myOrders.status === 200, myOrders.data?.error || '');
}

// ─── 10. CAR MARKET ──────────────────────────────────────────────────────────

async function testCarMarket() {
    sep('10. CAR MARKET');

    const listing = await req('POST', '/car-listings', {
        make: 'Honda', model: 'Civic', year: 2019,
        price: 4500000, mileage: 45000,
        color: 'Silver', condition: 'good',
        description: 'Première main', location: 'Libreville',
    }, riderToken);  // riderToken has car_seller role
    log('CarMarket', 'Create listing', listing.status === 201, listing.data?.error || '');
    listingId = listing.data?.listing?.id;

    const browse = await req('GET', '/car-listings', null, riderToken);
    log('CarMarket', 'Browse listings', browse.status === 200,
        `${browse.data?.listings?.length ?? 0} listing(s)`);
}

// ─── 11. SUPPORT ─────────────────────────────────────────────────────────────

async function testSupport() {
    sep('11. SUPPORT');

    const ticket = await req('POST', '/support/tickets', {
        subject: 'Test automatisé',
        type: 'question',          // valid: chat | incident | complaint | question
        service_type: 'general',   // valid: ride | rental | delivery | order | wallet | general
        first_message: 'Ceci est un ticket de test automatisé.',
    }, riderToken);
    log('Support', 'Create ticket', [200, 201].includes(ticket.status), ticket.data?.error || '');
    ticketId = ticket.data?.ticket?.id;

    const list = await req('GET', '/support/tickets', null, riderToken);
    log('Support', 'List my tickets', list.status === 200,
        `${list.data?.tickets?.length ?? 0} ticket(s)`);
}

// ─── 12. ADMIN ───────────────────────────────────────────────────────────────

async function testAdmin() {
    sep('12. ADMIN PANEL API');

    if (!adminToken) { log('Admin', 'All tests skipped — no admin token', false, ''); return; }

    const stats = await req('GET', '/admin/stats', null, adminToken);
    log('Admin', 'Dashboard stats', stats.status === 200, stats.data?.error || '');

    const users = await req('GET', '/admin/users', null, adminToken);
    log('Admin', 'List all users', users.status === 200,
        `${users.data?.users?.length ?? users.data?.total ?? 0} user(s)`);

    const rides = await req('GET', '/admin/rides', null, adminToken);
    log('Admin', 'List all rides', rides.status === 200, rides.data?.error || '');

    const wallets = await req('GET', '/admin/wallets', null, adminToken);
    log('Admin', 'List wallets', wallets.status === 200, wallets.data?.error || '');

    const rentals = await req('GET', '/admin/rentals/bookings', null, adminToken);
    log('Admin', 'List rental bookings', rentals.status === 200, rentals.data?.error || '');
}

// ─── 13. SECURITY ────────────────────────────────────────────────────────────

async function testSecurity() {
    sep('13. SECURITY');

    const noToken  = await req('GET', '/auth/profile');
    log('Security', 'Blocked without token',    noToken.status === 401, '');

    const fakeToken = await req('GET', '/auth/profile', null, 'fake.jwt.token');
    log('Security', 'Blocked with fake token',  fakeToken.status === 401, '');

    const riderAdmin = await req('GET', '/admin/users', null, riderToken);
    log('Security', 'Rider blocked from admin', [401, 403].includes(riderAdmin.status), '');
}

// ─── REPORT ──────────────────────────────────────────────────────────────────

function report() {
    console.log('\n' + '═'.repeat(58));
    console.log('  OMBIA EXPRESS — TEST REPORT');
    console.log('═'.repeat(58));
    console.log(`  ✅ Passed : ${passed}`);
    console.log(`  ❌ Failed : ${failed}`);
    console.log(`  📊 Total  : ${passed + failed}`);
    console.log('═'.repeat(58));
    if (failures.length) {
        console.log('\n  Failed tests:');
        failures.forEach(f => console.log('  ', f));
    }
    const pct = Math.round((passed / (passed + failed)) * 100);
    console.log(`\n  Score: ${pct}%  —  ${
        pct === 100 ? '🟢 ALL SYSTEMS GO — Ready for partners!' :
        pct >= 80   ? '🟡 MOSTLY GOOD — Minor issues only' :
        pct >= 60   ? '🟠 SOME ISSUES — Check failures above' :
                      '🔴 NEEDS ATTENTION — Critical failures'
    }`);
    console.log('');
}

// ─── RUN ─────────────────────────────────────────────────────────────────────

(async () => {
    console.log('═'.repeat(58));
    console.log('  OMBIA EXPRESS — Automated Flow Test v2');
    console.log(`  Server : ${BASE}`);
    console.log(`  Time   : ${new Date().toISOString()}`);
    console.log('═'.repeat(58));

    await testHealth();
    await testAuth();
    await testKYC();
    await testVehicles();
    await testWallet();
    await testRides();
    await testRental();
    await testDelivery();
    await testEcommerce();
    await testCarMarket();
    await testSupport();
    await testAdmin();
    await testSecurity();

    report();
})();
