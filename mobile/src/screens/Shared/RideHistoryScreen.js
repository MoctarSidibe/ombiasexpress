import { API_BASE } from '../../services/api.service';
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { rideAPI, rentalAPI, deliveryAPI, orderAPI, walletAPI } from '../../services/api.service';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../../constants/colors';


// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR');

const formatDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    const now   = new Date();
    const isToday     = date.toDateString() === now.toDateString();
    const isYesterday = new Date(now - 86400000).toDateString() === date.toDateString();
    const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (isToday)     return `Aujourd'hui ${time}`;
    if (isYesterday) return `Hier ${time}`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ── Status maps ───────────────────────────────────────────────────────────────

const RIDE_STATUS = {
    requested:        { label: 'Demandée',         color: '#F59E0B' },
    accepted:         { label: 'Acceptée',          color: '#3B82F6' },
    driver_arrived:   { label: 'Chauffeur arrivé',  color: '#8B5CF6' },
    in_progress:      { label: 'En cours',          color: '#10B981' },
    completed:        { label: 'Terminée',          color: '#6B7280' },
    cancelled_rider:  { label: 'Annulée',           color: '#EF4444' },
    cancelled_driver: { label: 'Annulée',           color: '#EF4444' },
};

const RENTAL_STATUS = {
    pending:   { label: 'En attente',  color: '#F59E0B' },
    approved:  { label: 'Approuvée',   color: '#10B981' },
    active:    { label: 'En cours',    color: '#3B82F6' },
    completed: { label: 'Terminée',    color: '#6B7280' },
    cancelled: { label: 'Annulée',     color: '#EF4444' },
    rejected:  { label: 'Refusée',     color: '#EF4444' },
};

const DELIVERY_STATUS = {
    pending:    { label: 'En attente',   color: '#F59E0B' },
    accepted:   { label: 'Acceptée',     color: '#3B82F6' },
    picked_up:  { label: 'Collectée',    color: '#8B5CF6' },
    in_transit: { label: 'En transit',   color: '#06B6D4' },
    delivered:  { label: 'Livrée',       color: '#10B981' },
    completed:  { label: 'Terminée',     color: '#6B7280' },
    cancelled:  { label: 'Annulée',      color: '#EF4444' },
};

const ORDER_STATUS = {
    pending:    { label: 'En attente',   color: '#F59E0B' },
    confirmed:  { label: 'Confirmée',    color: '#3B82F6' },
    preparing:  { label: 'En préparation', color: '#8B5CF6' },
    ready:      { label: 'Prête',        color: '#06B6D4' },
    shipped:    { label: 'Expédiée',     color: '#10B981' },
    delivered:  { label: 'Livrée',       color: '#10B981' },
    completed:  { label: 'Terminée',     color: '#6B7280' },
    cancelled:  { label: 'Annulée',      color: '#EF4444' },
};

// Keyed by tx.source (matches the WalletTransaction model's source ENUM)
const WALLET_SRC = {
    airtel_money:     { label: 'Recharge Airtel',   color: '#E53935', logo: require('../../../assets/airtel-money.png'), sign: '+' },
    moov_money:       { label: 'Recharge Moov',     color: '#1E88E5', logo: require('../../../assets/moov-money.png'),   sign: '+' },
    bank_card:        { label: 'Carte bancaire',    color: '#43A047', icon: 'card-outline',           sign: '+' },
    cash:             { label: 'Espèces',           color: '#6D4C41', icon: 'cash-outline',           sign: '+' },
    ride_payment:     { label: 'Paiement course',   color: '#F59E0B', icon: 'car-outline',            sign: '-' },
    ride_earning:     { label: 'Gain course',       color: '#10B981', icon: 'car-outline',            sign: '+' },
    rental_payment:   { label: 'Paiement location', color: '#8B5CF6', icon: 'key-outline',            sign: '-' },
    rental_earning:   { label: 'Gain location',     color: '#10B981', icon: 'key-outline',            sign: '+' },
    ecommerce_payment:{ label: 'Achat boutique',    color: '#7B1FA2', icon: 'bag-handle-outline',     sign: '-' },
    withdrawal:       { label: 'Retrait',           color: '#EF4444', icon: 'arrow-up-circle-outline',sign: '-' },
    refund:           { label: 'Remboursement',     color: '#10B981', icon: 'refresh-circle-outline', sign: '+' },
    promo:            { label: 'Promotion',         color: '#EC407A', icon: 'gift-outline',           sign: '+' },
    transfer_in:      { label: 'Reçu',              color: '#1565C0', icon: 'arrow-down-circle-outline',sign:'+' },
    transfer_out:     { label: 'Envoyé',            color: '#6B7280', icon: 'arrow-up-circle-outline', sign:'-' },
};

// ── Card components ───────────────────────────────────────────────────────────

const StatusBadge = ({ status, map }) => {
    const cfg = map[status] || { label: status, color: '#6B7280' };
    return (
        <View style={[styles.badge, { backgroundColor: cfg.color + '22' }]}>
            <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
    );
};

const RideCard = ({ ride, userId }) => {
    const other = ride.rider_id === userId ? ride.driver : ride.rider;
    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.serviceTag}>
                    <Ionicons name="car-outline" size={13} color="#FFA726" />
                    <Text style={styles.serviceTagText}>Course</Text>
                </View>
                <StatusBadge status={ride.status} map={RIDE_STATUS} />
            </View>
            <Text style={styles.dateText}>{formatDate(ride.completed_at || ride.created_at)}</Text>
            <View style={styles.routeBlock}>
                <View style={styles.routeDot} />
                <Text style={styles.routeText} numberOfLines={1}>{ride.pickup_address || 'Point de départ'}</Text>
            </View>
            <View style={[styles.routeBlock, { marginTop: 2 }]}>
                <View style={[styles.routeDot, { backgroundColor: '#6B7280' }]} />
                <Text style={styles.routeText} numberOfLines={1}>{ride.dropoff_address || 'Destination'}</Text>
            </View>
            {other && (
                <View style={styles.partyRow}>
                    <Ionicons name="person-outline" size={13} color="#9CA3AF" />
                    <Text style={styles.partyText}>{other.name || '—'}</Text>
                    {other.rating != null && <>
                        <Ionicons name="star" size={12} color="#FFD700" />
                        <Text style={styles.partyRating}>{Number(other.rating).toFixed(1)}</Text>
                    </>}
                </View>
            )}
            {ride.status === 'completed' && ride.fare != null && (
                <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Total</Text>
                    <Text style={[styles.amountValue, { color: '#FFA726' }]}>{fmt(ride.fare)} XAF</Text>
                </View>
            )}
        </View>
    );
};

const RentalCard = ({ booking }) => {
    const car    = booking.rentalCar || booking.car || {};
    const photos = car.photos || [];
    const thumb  = photos[0]
        ? (photos[0].startsWith('http') ? photos[0] : `${API_BASE}${photos[0]}`)
        : null;
    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={[styles.serviceTag, { backgroundColor: '#F3E5F5' }]}>
                    <Ionicons name="key-outline" size={13} color="#8B5CF6" />
                    <Text style={[styles.serviceTagText, { color: '#8B5CF6' }]}>Location</Text>
                </View>
                <StatusBadge status={booking.status} map={RENTAL_STATUS} />
            </View>
            <Text style={styles.dateText}>{formatDate(booking.created_at)}</Text>
            <View style={styles.rentalRow}>
                {thumb
                    ? <Image source={{ uri: thumb }} style={styles.rentalThumb} />
                    : <View style={[styles.rentalThumb, styles.rentalThumbEmpty]}>
                        <Ionicons name="car-outline" size={22} color="#D1D5DB" />
                      </View>
                }
                <View style={{ flex: 1 }}>
                    <Text style={styles.rentalName} numberOfLines={1}>
                        {car.make || '—'} {car.model || ''}
                    </Text>
                    <Text style={styles.rentalDates}>
                        {formatDate(booking.start_date)} → {formatDate(booking.end_date)}
                    </Text>
                    {booking.total_price != null && (
                        <View style={styles.amountRow}>
                            <Text style={styles.amountLabel}>Total</Text>
                            <Text style={[styles.amountValue, { color: '#8B5CF6' }]}>{fmt(booking.total_price)} XAF</Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
};

const DeliveryCard = ({ delivery, userId }) => {
    const isRequester = delivery.requester_id === userId;
    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={[styles.serviceTag, { backgroundColor: '#E0F7FA' }]}>
                    <Ionicons name="bicycle-outline" size={13} color="#06B6D4" />
                    <Text style={[styles.serviceTagText, { color: '#06B6D4' }]}>Livraison</Text>
                </View>
                <StatusBadge status={delivery.status} map={DELIVERY_STATUS} />
            </View>
            <Text style={styles.dateText}>{formatDate(delivery.created_at)}</Text>
            <View style={styles.routeBlock}>
                <View style={[styles.routeDot, { backgroundColor: '#06B6D4' }]} />
                <Text style={styles.routeText} numberOfLines={1}>{delivery.pickup_address || 'Collecte'}</Text>
            </View>
            <View style={[styles.routeBlock, { marginTop: 2 }]}>
                <View style={[styles.routeDot, { backgroundColor: '#6B7280' }]} />
                <Text style={styles.routeText} numberOfLines={1}>{delivery.dropoff_address || 'Livraison'}</Text>
            </View>
            {delivery.description ? (
                <Text style={styles.deliveryDesc} numberOfLines={1}>{delivery.description}</Text>
            ) : null}
            {delivery.fare != null && (
                <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>{isRequester ? 'Coût' : 'Gain'}</Text>
                    <Text style={[styles.amountValue, { color: isRequester ? '#06B6D4' : '#10B981' }]}>
                        {isRequester ? '' : '+'}{fmt(delivery.fare)} XAF
                    </Text>
                </View>
            )}
        </View>
    );
};

const OrderCard = ({ order }) => {
    const itemCount = order.items?.length || 0;
    const firstItem = order.items?.[0];
    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={[styles.serviceTag, { backgroundColor: '#FFF3E0' }]}>
                    <Ionicons name="bag-handle-outline" size={13} color="#F59E0B" />
                    <Text style={[styles.serviceTagText, { color: '#F59E0B' }]}>Commande</Text>
                </View>
                <StatusBadge status={order.status} map={ORDER_STATUS} />
            </View>
            <Text style={styles.dateText}>{formatDate(order.created_at)}</Text>
            {firstItem && (
                <Text style={styles.orderItem} numberOfLines={1}>
                    {firstItem.product?.name || firstItem.name || '—'}
                    {itemCount > 1 ? `  +${itemCount - 1} autre(s)` : ''}
                </Text>
            )}
            {order.seller?.name && (
                <View style={styles.partyRow}>
                    <Ionicons name="storefront-outline" size={13} color="#9CA3AF" />
                    <Text style={styles.partyText}>{order.seller.name}</Text>
                </View>
            )}
            {order.total_amount != null && (
                <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Total</Text>
                    <Text style={[styles.amountValue, { color: '#F59E0B' }]}>{fmt(order.total_amount)} XAF</Text>
                </View>
            )}
        </View>
    );
};

const WalletCard = ({ tx }) => {
    const cfg = WALLET_SRC[tx.source] || { label: tx.source || tx.type, color: '#9AA3B0', icon: 'wallet-outline', sign: tx.type === 'credit' ? '+' : '-' };
    const isCredit = tx.type === 'credit';
    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={[styles.walletIconWrap, { backgroundColor: cfg.color + '18', overflow: 'hidden' }]}>
                    {cfg.logo
                        ? <Image source={cfg.logo} style={{ width: 28, height: 28 }} resizeMode="contain" />
                        : <Ionicons name={cfg.icon || 'wallet-outline'} size={18} color={cfg.color} />
                    }
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.walletType}>{cfg.label}</Text>
                    <Text style={styles.dateText}>{formatDate(tx.created_at)}</Text>
                </View>
                <Text style={[styles.walletAmount, { color: isCredit ? '#10B981' : '#EF4444' }]}>
                    {cfg.sign}{fmt(tx.amount)} XAF
                </Text>
            </View>
            {tx.description ? (
                <Text style={styles.walletDesc} numberOfLines={2}>{tx.description}</Text>
            ) : null}
            <View style={styles.walletBalance}>
                <Text style={styles.walletBalanceLabel}>Solde après</Text>
                <Text style={styles.walletBalanceValue}>{fmt(tx.balance_after)} XAF</Text>
            </View>
        </View>
    );
};

// ── Tabs config ───────────────────────────────────────────────────────────────

const TABS = [
    { key: 'rides',     label: 'Trajets',    icon: 'car-outline',          color: '#FFA726' },
    { key: 'deliveries',label: 'Livraisons', icon: 'bicycle-outline',      color: '#06B6D4' },
    { key: 'rentals',   label: 'Locations',  icon: 'key-outline',          color: '#8B5CF6' },
    { key: 'orders',    label: 'Commandes',  icon: 'bag-handle-outline',   color: '#F59E0B' },
    { key: 'wallet',    label: 'Solde',      icon: 'wallet-outline',       color: '#10B981' },
];

// ── Main Screen ───────────────────────────────────────────────────────────────

// Sub-filters per tab
const SUB_FILTERS = {
    rides:      [{ key: 'all', label: 'Tous' }, { key: 'completed', label: 'Terminés' }, { key: 'in_progress', label: 'En cours' }, { key: 'cancelled_rider', label: 'Annulés', match: ['cancelled_rider','cancelled_driver'] }],
    deliveries: [{ key: 'all', label: 'Tous' }, { key: 'delivered', label: 'Livrées' }, { key: 'in_transit', label: 'En transit' }, { key: 'cancelled', label: 'Annulées' }],
    rentals:    [{ key: 'all', label: 'Tous' }, { key: 'completed', label: 'Terminées' }, { key: 'active', label: 'En cours' }, { key: 'pending', label: 'En attente' }, { key: 'cancelled', label: 'Annulées' }],
    orders:     [{ key: 'all', label: 'Tous' }, { key: 'completed', label: 'Terminées' }, { key: 'preparing', label: 'En préparation' }, { key: 'cancelled', label: 'Annulées' }],
    wallet:     [{ key: 'all', label: 'Tous' }, { key: 'credit', label: 'Reçus' }, { key: 'debit', label: 'Dépenses' }],
};

export default function RideHistoryScreen() {
    const { user } = useAuth();
    const [activeTab,   setActiveTab]   = useState('rides');
    const [subFilter,   setSubFilter]   = useState('all');
    const [rides,       setRides]       = useState([]);
    const [rentals,     setRentals]     = useState([]);
    const [deliveries,  setDeliveries]  = useState([]);
    const [orders,      setOrders]      = useState([]);
    const [wallet,      setWallet]      = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [refreshing,  setRefreshing]  = useState(false);

    const loadAll = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        await Promise.allSettled([
            rideAPI.getHistory({ limit: 50 }).then(r => setRides(r.data?.rides || [])).catch(() => {}),
            rentalAPI.getMyBookings().then(r => setRentals(r.data?.bookings || r.data || [])).catch(() => {}),
            deliveryAPI.getHistory({ limit: 50 }).then(r => setDeliveries(r.data?.deliveries || r.data || [])).catch(() => {}),
            orderAPI.getMine().then(r => setOrders(r.data?.orders || r.data || [])).catch(() => {}),
            walletAPI.getTransactions({ limit: 50 }).then(r => setWallet(r.data?.transactions || r.data || [])).catch(() => {}),
        ]);

        setLoading(false);
        setRefreshing(false);
    }, []);

    useEffect(() => { loadAll(); }, [loadAll]);

    const rawDataMap = { rides, deliveries, rentals, orders, wallet };

    const emptyMap = {
        rides:      { icon: 'car-outline',        msg: 'Aucune course pour le moment' },
        deliveries: { icon: 'bicycle-outline',    msg: 'Aucune livraison pour le moment' },
        rentals:    { icon: 'key-outline',        msg: 'Aucune location pour le moment' },
        orders:     { icon: 'bag-handle-outline', msg: 'Aucune commande pour le moment' },
        wallet:     { icon: 'wallet-outline',     msg: 'Aucune transaction pour le moment' },
    };

    // Apply sub-filter
    const applySubFilter = (items) => {
        if (subFilter === 'all') return items;
        const sf = (SUB_FILTERS[activeTab] || []).find(f => f.key === subFilter);
        if (!sf) return items;
        const matchKeys = sf.match || [sf.key];
        if (activeTab === 'wallet') {
            return items.filter(tx => tx.type === subFilter);
        }
        return items.filter(item => matchKeys.includes(item.status));
    };

    const data    = applySubFilter(rawDataMap[activeTab] || []);
    const isEmpty = data.length === 0;
    const empty   = emptyMap[activeTab];

    const renderItem = ({ item }) => {
        switch (activeTab) {
            case 'rides':      return <RideCard ride={item} userId={user?.id} />;
            case 'rentals':    return <RentalCard booking={item} />;
            case 'deliveries': return <DeliveryCard delivery={item} userId={user?.id} />;
            case 'orders':     return <OrderCard order={item} />;
            case 'wallet':     return <WalletCard tx={item} />;
            default:           return null;
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Activités</Text>
                <Text style={styles.subtitle}>
                    {rides.length + deliveries.length + rentals.length + orders.length} transactions
                </Text>
            </View>

            {/* Fixed full-width tab bar — all 5 visible at once */}
            <View style={styles.tabBarWrap}>
                {TABS.map(t => {
                    const active = activeTab === t.key;
                    const count  = (rawDataMap[t.key] || []).length;
                    return (
                        <TouchableOpacity
                            key={t.key}
                            style={[styles.tabChip, active && { borderBottomColor: t.color, borderBottomWidth: 2.5 }]}
                            onPress={() => { setActiveTab(t.key); setSubFilter('all'); }}
                            activeOpacity={0.7}
                        >
                            {/* Icon with coloured background pill when active */}
                            <View style={[styles.tabIconWrap, active && { backgroundColor: t.color + '1A' }]}>
                                <Ionicons name={t.icon} size={18} color={active ? t.color : '#B0B8C1'} />
                                {count > 0 && (
                                    <View style={[styles.tabBadge, { backgroundColor: active ? t.color : '#D1D5DB' }]}>
                                        <Text style={styles.tabBadgeText}>{count > 99 ? '99+' : count}</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={[styles.tabChipLabel, active && { color: t.color, fontWeight: '700' }]}>
                                {t.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Sub-filter chips */}
            {(SUB_FILTERS[activeTab] || []).length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}
                    contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 8, gap: 8, flexDirection: 'row' }}>
                    {(SUB_FILTERS[activeTab] || []).map(sf => {
                        const isActive = subFilter === sf.key;
                        const tabCfg = TABS.find(t => t.key === activeTab);
                        const color  = tabCfg?.color || '#1C2E4A';
                        return (
                            <TouchableOpacity key={sf.key}
                                style={[styles.subFilterChip, isActive && { borderColor: color, backgroundColor: color + '12' }]}
                                onPress={() => setSubFilter(sf.key)}>
                                <Text style={[styles.subFilterLabel, isActive && { color, fontWeight: '700' }]}>{sf.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            )}

            {/* Content */}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={data}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={isEmpty ? styles.emptyContainer : styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => loadAll(true)}
                            colors={[COLORS.primary]}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name={empty.icon} size={64} color="#D1D5DB" />
                            <Text style={styles.emptyTitle}>{empty.msg}</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container:  { flex: 1, backgroundColor: '#F9FAFB' },
    header: {
        backgroundColor: '#fff',
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.md,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 10,
    },
    title:    { fontSize: FONT_SIZES.xl, fontWeight: '800', color: '#111827' },
    subtitle: { fontSize: 12, color: '#9CA3AF' },
    center:   { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // ── Fixed full-width tab bar ──────────────────────────────────────────────
    tabBarWrap: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    tabChip: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 2.5,
        borderBottomColor: 'transparent',
    },
    tabIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 3,
    },
    tabBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 3,
    },
    tabBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
    tabChipLabel:  { fontSize: 10, fontWeight: '500', color: '#B0B8C1' },

    // ── Sub-filter chips ──────────────────────────────────────────────────────
    subFilterChip: {
        paddingHorizontal: 14, paddingVertical: 6,
        borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
    },
    subFilterLabel: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },

    // ── List ─────────────────────────────────────────────────────────────────
    list:           { padding: SPACING.md, paddingBottom: 100 },
    emptyContainer: { flexGrow: 1, justifyContent: 'center' },
    emptyState:     { alignItems: 'center', paddingVertical: 60 },
    emptyTitle:     { fontSize: 16, fontWeight: '600', color: '#9CA3AF', marginTop: 16 },

    // ── Card ─────────────────────────────────────────────────────────────────
    card: {
        backgroundColor: '#fff',
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    serviceTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FFF8F0',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    serviceTagText: { fontSize: 11, fontWeight: '700', color: '#FFA726' },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    badgeText: { fontSize: 11, fontWeight: '700' },
    dateText:  { fontSize: 12, color: '#9CA3AF', marginBottom: 8 },

    // Route
    routeBlock: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    routeDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
    routeText:  { flex: 1, fontSize: 13, color: '#374151' },

    // Party
    partyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    partyText:   { flex: 1, fontSize: 12, color: '#374151' },
    partyRating: { fontSize: 12, color: '#6B7280' },

    // Amount
    amountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    amountLabel: { fontSize: 12, color: '#9CA3AF' },
    amountValue: { fontSize: 14, fontWeight: '700' },

    // Rental
    rentalRow:        { flexDirection: 'row', gap: 12, alignItems: 'center' },
    rentalThumb:      { width: 72, height: 56, borderRadius: 8 },
    rentalThumbEmpty: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    rentalName:       { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
    rentalDates:      { fontSize: 12, color: '#6B7280', marginBottom: 4 },

    // Delivery
    deliveryDesc: { fontSize: 12, color: '#6B7280', marginTop: 6, fontStyle: 'italic' },

    // Order
    orderItem: { fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 4 },

    // Wallet
    walletIconWrap: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#F9FAFB',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: '#F0F0F0',
    },
    walletType:        { fontSize: 13, fontWeight: '700', color: '#111827' },
    walletAmount:      { fontSize: 16, fontWeight: '800' },
    walletDesc:        { fontSize: 12, color: '#9CA3AF', marginTop: 6 },
    walletBalance: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    walletBalanceLabel: { fontSize: 11, color: '#9CA3AF' },
    walletBalanceValue: { fontSize: 12, fontWeight: '600', color: '#374151' },
});
