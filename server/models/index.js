const { sequelize } = require('../config/database');
const User = require('./User');
const Vehicle = require('./Vehicle');
const Ride = require('./Ride');
const Payment = require('./Payment');
const RentalCar = require('./RentalCar');
const RentalBooking = require('./RentalBooking');
const RentalPayment = require('./RentalPayment');
const Setting = require('./Setting');
const Wallet = require('./Wallet');
const WalletTransaction = require('./WalletTransaction');
const Coupon = require('./Coupon');
const CouponRedemption = require('./CouponRedemption');
const WalletFeature = require('./WalletFeature');
const CommissionRule = require('./CommissionRule');
const CashbackRule = require('./CashbackRule');
const CashbackTransaction = require('./CashbackTransaction');
const DriverVerification = require('./DriverVerification');
const CarVerification = require('./CarVerification');
const MerchantVerification = require('./MerchantVerification');
const FleetVerification    = require('./FleetVerification');
const CarListing           = require('./CarListing');
const CourierVerification  = require('./CourierVerification');
const Delivery             = require('./Delivery');
const Rating               = require('./Rating');
const Product              = require('./Product');
const Order                = require('./Order');
const OrderItem            = require('./OrderItem');
const SupportTicket        = require('./SupportTicket');
const SupportMessage       = require('./SupportMessage');
const AdminRole            = require('./AdminRole');
const AdminStaff           = require('./AdminStaff');

// ── Ride-share associations ───────────────────────────────────────────────────
User.hasMany(Vehicle, { foreignKey: 'driver_id', as: 'vehicles' });
Vehicle.belongsTo(User, { foreignKey: 'driver_id', as: 'driver' });

User.hasMany(Ride, { foreignKey: 'rider_id', as: 'ridesAsRider' });
User.hasMany(Ride, { foreignKey: 'driver_id', as: 'ridesAsDriver' });
Ride.belongsTo(User, { foreignKey: 'rider_id', as: 'rider' });
Ride.belongsTo(User, { foreignKey: 'driver_id', as: 'driver' });
Ride.belongsTo(Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });

Ride.hasOne(Payment, { foreignKey: 'ride_id', as: 'payment' });
Payment.belongsTo(Ride, { foreignKey: 'ride_id', as: 'ride' });

// ── Rental associations ───────────────────────────────────────────────────────
User.hasMany(RentalCar, { foreignKey: 'owner_id', as: 'ownedRentalCars' });
RentalCar.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });

User.hasMany(RentalBooking, { foreignKey: 'renter_id', as: 'rentalBookingsAsRenter' });
RentalBooking.belongsTo(User, { foreignKey: 'renter_id', as: 'renter' });

User.hasMany(RentalBooking, { foreignKey: 'owner_id', as: 'rentalBookingsAsOwner' });
RentalBooking.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });

RentalCar.hasMany(RentalBooking, { foreignKey: 'rental_car_id', as: 'bookings' });
RentalBooking.belongsTo(RentalCar, { foreignKey: 'rental_car_id', as: 'rentalCar' });

RentalBooking.hasOne(RentalPayment, { foreignKey: 'booking_id', as: 'payment' });
RentalPayment.belongsTo(RentalBooking, { foreignKey: 'booking_id', as: 'booking' });

// ── Wallet associations ───────────────────────────────────────────────────────
User.hasOne(Wallet, { foreignKey: 'user_id', as: 'wallet' });
Wallet.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Wallet.hasMany(WalletTransaction, { foreignKey: 'wallet_id', as: 'transactions' });
WalletTransaction.belongsTo(Wallet, { foreignKey: 'wallet_id', as: 'wallet' });

// ── Cashback associations ─────────────────────────────────────────────────────
User.hasMany(CashbackTransaction, { foreignKey: 'user_id', as: 'cashbackTransactions' });
CashbackTransaction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ── KYC associations ──────────────────────────────────────────────────────────
User.hasMany(DriverVerification, { foreignKey: 'user_id', as: 'driverVerifications' });
DriverVerification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(CarVerification, { foreignKey: 'user_id', as: 'carVerifications' });
CarVerification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(MerchantVerification, { foreignKey: 'user_id', as: 'merchantVerifications' });
MerchantVerification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(FleetVerification, { foreignKey: 'user_id', as: 'fleetVerifications' });
FleetVerification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ── Car marketplace associations ──────────────────────────────────────────────
User.hasMany(CarListing, { foreignKey: 'seller_id', as: 'carListings' });
CarListing.belongsTo(User, { foreignKey: 'seller_id', as: 'seller' });

// ── Delivery associations ─────────────────────────────────────────────────────
User.hasMany(Delivery, { foreignKey: 'sender_id',  as: 'deliveriesAsSender' });
User.hasMany(Delivery, { foreignKey: 'courier_id', as: 'deliveriesAsCourier' });
Delivery.belongsTo(User, { foreignKey: 'sender_id',  as: 'sender' });
Delivery.belongsTo(User, { foreignKey: 'courier_id', as: 'courier' });

// ── Courier KYC associations ──────────────────────────────────────────────────
User.hasMany(CourierVerification, { foreignKey: 'user_id', as: 'courierVerifications' });
CourierVerification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ── Ecommerce associations ─────────────────────────────────────────────────────
User.hasMany(Product, { foreignKey: 'seller_id', as: 'products' });
Product.belongsTo(User, { foreignKey: 'seller_id', as: 'seller' });

User.hasMany(Order, { foreignKey: 'buyer_id',  as: 'ordersAsBuyer' });
User.hasMany(Order, { foreignKey: 'seller_id', as: 'ordersAsSeller' });
Order.belongsTo(User, { foreignKey: 'buyer_id',  as: 'buyer' });
Order.belongsTo(User, { foreignKey: 'seller_id', as: 'seller' });

Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// ── Admin RBAC associations ───────────────────────────────────────────────────
AdminRole.hasMany(AdminStaff, { foreignKey: 'role_id', as: 'staffMembers' });
AdminStaff.belongsTo(AdminRole, { foreignKey: 'role_id', as: 'role' });

User.hasOne(AdminStaff, { foreignKey: 'user_id', as: 'staffProfile' });
AdminStaff.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ── Support associations ──────────────────────────────────────────────────────
User.hasMany(SupportTicket, { foreignKey: 'user_id', as: 'supportTickets' });
SupportTicket.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

SupportTicket.hasMany(SupportMessage, { foreignKey: 'ticket_id', as: 'messages' });
SupportMessage.belongsTo(SupportTicket, { foreignKey: 'ticket_id', as: 'ticket' });

// ── Rating associations ───────────────────────────────────────────────────────
Rating.belongsTo(User, { foreignKey: 'rater_id',      as: 'rater' });
Rating.belongsTo(User, { foreignKey: 'rated_user_id', as: 'ratedUser' });
User.hasMany(Rating, { foreignKey: 'rated_user_id', as: 'ratingsReceived' });
User.hasMany(Rating, { foreignKey: 'rater_id',      as: 'ratingsGiven' });

// ── Coupon associations ───────────────────────────────────────────────────────
Coupon.hasMany(CouponRedemption, { foreignKey: 'coupon_id', as: 'redemptions' });
CouponRedemption.belongsTo(Coupon, { foreignKey: 'coupon_id', as: 'coupon' });
CouponRedemption.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
CouponRedemption.belongsTo(Ride, { foreignKey: 'ride_id', as: 'ride' });

// ── DB sync ───────────────────────────────────────────────────────────────────
const syncDatabase = async (force = false) => {
    try {
        await sequelize.sync({ force, alter: !force });
        console.log('✓ Database synchronized successfully');
    } catch (error) {
        console.error('✗ Database sync error:', error.message);
        throw error;
    }
};

const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('✓ Database connection established');
        return true;
    } catch (error) {
        console.error('✗ Database connection failed:', error.message);
        return false;
    }
};

// ── Seed default settings if they don't exist ─────────────────────────────────
const seedSettings = async () => {
    const defaults = [
        {
            key: 'ride_commission_rate',
            value: String(process.env.COMMISSION_RATE || '20'),
            label: 'Ride Commission Rate (%)',
            description: 'Percentage the platform keeps from each ride fare'
        },
        {
            key: 'rental_commission_rate',
            value: String(process.env.COMMISSION_RATE || '20'),
            label: 'Rental Commission Rate (%)',
            description: 'Percentage the platform keeps from each rental booking'
        },
        {
            key: 'cashback_redemption_rate',
            value: '100',
            label: 'Cashback Redemption Rate (pts per XAF)',
            description: 'How many points equal 1 XAF when redeeming. Default: 100 pts = 1 XAF',
        },
        {
            key: 'wallet_discount_rate',
            value: '5',
            label: 'Wallet Discount Rate (%)',
            description: 'Discount applied when user pays with Ombia Wallet'
        },
        {
            key: 'ride_base_fare',
            value: '500',
            label: 'Ride Base Fare (XAF)',
            description: 'Fixed starting fare for every ride'
        },
        {
            key: 'ride_per_km',
            value: '200',
            label: 'Ride Price per km (XAF)',
            description: 'Amount charged per kilometre'
        },
        {
            key: 'ride_per_minute',
            value: '50',
            label: 'Ride Price per minute (XAF)',
            description: 'Amount charged per minute of ride duration'
        },
        {
            key: 'ride_booking_fee',
            value: '150',
            label: 'Ride Booking Fee (XAF)',
            description: 'Fixed booking/platform fee added to every ride'
        },
        {
            key: 'ride_hourly_base_fare',
            value: '2000',
            label: 'Ride Hourly Base Fare (XAF)',
            description: 'Fixed starting fare for hourly rides'
        },
        {
            key: 'ride_hourly_per_hour',
            value: '3500',
            label: 'Ride Price per Hour (XAF)',
            description: 'Amount charged per hour for hourly rides'
        },
        {
            key: 'ride_hourly_booking_fee',
            value: '500',
            label: 'Ride Hourly Booking Fee (XAF)',
            description: 'Fixed booking/platform fee for hourly rides'
        },
        // ── Smart pricing ─────────────────────────────────────────────────────
        {
            key: 'ride_min_fare',
            value: '800',
            label: 'Minimum Fare (XAF)',
            description: 'Minimum charge for any ride, regardless of distance'
        },
        {
            key: 'ride_night_surcharge_pct',
            value: '20',
            label: 'Night Surcharge (%)',
            description: 'Extra % added to fare between night_start and night_end. Set 0 to disable.'
        },
        {
            key: 'ride_night_start_hour',
            value: '22',
            label: 'Night Surcharge Start Hour (0–23)',
            description: 'Hour at which night surcharge begins (e.g. 22 = 10 PM)'
        },
        {
            key: 'ride_night_end_hour',
            value: '6',
            label: 'Night Surcharge End Hour (0–23)',
            description: 'Hour at which night surcharge ends (e.g. 6 = 6 AM)'
        },
        {
            key: 'ride_long_dist_threshold_km',
            value: '25',
            label: 'Long Distance Threshold (km)',
            description: 'Above this distance the reduced long-distance per-km rate applies'
        },
        {
            key: 'ride_long_dist_per_km',
            value: '120',
            label: 'Long Distance Rate per km (XAF)',
            description: 'Lower per-km rate applied beyond the threshold (loyalty for long trips)'
        },
        {
            key: 'ride_promo_first_ride_pct',
            value: '50',
            label: 'First Ride Promo Discount (%)',
            description: 'Discount applied to a user\'s very first ride. Set 0 to disable.'
        },
        {
            key: 'ride_hourly_enabled',
            value: '1',
            label: 'Hourly Fare Option Enabled',
            description: 'Show the "À l\'heure" fare type on the mobile booking screen. Set 0 to hide it.'
        }
    ];
    for (const s of defaults) {
        const exists = await Setting.findOne({ where: { key: s.key } });
        if (!exists) await Setting.create(s);
    }
    console.log('✓ Settings seeded');
};

// ── Seed default commission rules ─────────────────────────────────────────────
const seedCommissionRules = async () => {
    const defaults = [
        { service_type: 'ride',      name: 'Courses standard',     rate: 20, is_default: true,  sort_order: 0, description: 'Commission sur toutes les courses Ombia' },
        { service_type: 'rental',    name: 'Location standard',    rate: 20, is_default: true,  sort_order: 0, description: 'Commission sur toutes les locations' },
        { service_type: 'partner',   name: 'Partenaires standard', rate: 10, is_default: true,  sort_order: 0, description: 'Commission sur les paiements partenaires' },
        { service_type: 'ecommerce', name: 'E-commerce standard',  rate: 12, is_default: true,  sort_order: 0, description: 'Commission sur les ventes e-commerce' },
        { service_type: 'transfer',  name: 'Transferts standard',  rate: 1,  is_default: true,  sort_order: 0, description: 'Commission sur les transferts entre membres' },
    ];
    for (const r of defaults) {
        const exists = await CommissionRule.findOne({ where: { service_type: r.service_type, is_default: true } });
        if (!exists) await CommissionRule.create(r);
    }
    console.log('✓ Commission rules seeded');
};

// ── Seed default cashback rules ────────────────────────────────────────────────
const seedCashbackRules = async () => {
    const defaults = [
        { service_type: 'ride',      name: 'Cashback courses',    earn_rate: 5,  expiry_days: 365, description: '5 pts par 100 XAF dépensé en course' },
        { service_type: 'rental',    name: 'Cashback location',   earn_rate: 8,  expiry_days: 365, description: '8 pts par 100 XAF dépensé en location' },
        { service_type: 'partner',   name: 'Cashback partenaire', earn_rate: 10, expiry_days: 180, description: '10 pts par 100 XAF chez un partenaire' },
        { service_type: 'ecommerce', name: 'Cashback e-commerce', earn_rate: 7,  expiry_days: 180, description: '7 pts par 100 XAF en e-commerce' },
        { service_type: 'transfer',  name: 'Cashback transfert',  earn_rate: 2,  expiry_days: 365, description: '2 pts par 100 XAF transféré' },
    ];
    for (const r of defaults) {
        const exists = await CashbackRule.findOne({ where: { service_type: r.service_type } });
        if (!exists) await CashbackRule.create(r);
    }
    console.log('✓ Cashback rules seeded');
};

// ── Seed default wallet feature cards ─────────────────────────────────────────
const seedWalletFeatures = async () => {
    const defaults = [
        {
            key:          'send_money',
            title:        'Envoyer de l\'argent',
            subtitle:     'Transfert instantané · –5% sur vos envois Ombia',
            icon:         'paper-plane-outline',
            icon_color:   '#1565C0',
            icon_bg:      '#DCEEFF',
            card_bg:      '#F5F9FF',
            border_color: '#90C3F5',
            screen_route: 'WalletTransfer',
            badge_text:   '–5%',
            badge_color:  '#1565C0',
            enabled:      true,
            sort_order:   0,
            full_width:   false,
        },
        {
            key:          'pay_partners',
            title:        'Payer un partenaire',
            subtitle:     'Marchands Ombia · –5% & cashback exclusif',
            icon:         'storefront-outline',
            icon_color:   '#00897B',
            icon_bg:      '#D4F5F2',
            card_bg:      '#F3FFFD',
            border_color: '#80D8D1',
            screen_route: null,
            badge_text:   'Bientôt',
            badge_color:  '#7B1FA2',
            enabled:      true,
            sort_order:   1,
            full_width:   false,
        },
    ];
    for (const f of defaults) {
        const exists = await WalletFeature.findOne({ where: { key: f.key } });
        if (!exists) await WalletFeature.create(f);
    }
    console.log('✓ Wallet features seeded');
};

// ── Create wallets for users registered before wallet system existed ───────────
const seedWallets = async () => {
    try {
        const { Op } = require('sequelize');
        const usersWithoutWallet = await User.findAll({
            include: [{ model: Wallet, as: 'wallet', required: false }],
            where: { '$wallet.id$': null },
        });
        if (!usersWithoutWallet.length) return;
        const luhn = (partial) => {
            const digits = partial.split('').map(Number);
            let sum = 0, dbl = true;
            for (let i = digits.length - 1; i >= 0; i--) {
                let d = digits[i]; if (dbl) { d *= 2; if (d > 9) d -= 9; }
                sum += d; dbl = !dbl;
            }
            return ((10 - (sum % 10)) % 10).toString();
        };
        let count = 0;
        for (const user of usersWithoutWallet) {
            let cardNumber, exists;
            do {
                const rand = Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join('');
                const partial = '6246' + rand;
                cardNumber = partial + luhn(partial);
                exists = await Wallet.findOne({ where: { card_number: cardNumber } });
            } while (exists);
            await Wallet.create({ user_id: user.id, card_number: cardNumber });
            count++;
        }
        if (count) console.log(`✓ Created wallets for ${count} existing user(s)`);
    } catch (e) {
        console.error('seedWallets error:', e.message);
    }
};

module.exports = { sequelize, User, Vehicle, Ride, Payment, RentalCar, RentalBooking, RentalPayment, Setting, Wallet, WalletTransaction, Coupon, CouponRedemption, WalletFeature, CommissionRule, CashbackRule, CashbackTransaction, DriverVerification, CarVerification, MerchantVerification, FleetVerification, CarListing, CourierVerification, Delivery, Product, Order, OrderItem, SupportTicket, SupportMessage, AdminRole, AdminStaff, syncDatabase, testConnection, seedSettings, seedWalletFeatures, seedCommissionRules, seedCashbackRules, seedWallets };
