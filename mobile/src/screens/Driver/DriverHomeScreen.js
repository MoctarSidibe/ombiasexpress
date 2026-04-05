import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Switch, Animated, Dimensions, ScrollView, FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LeafletMap from '../../components/LeafletMap';
import { useAuth } from '../../context/AuthContext';
import socketService from '../../services/socket.service';
import locationService from '../../services/location.service';
import { rideAPI, walletAPI } from '../../services/api.service';

const { width: W } = Dimensions.get('window');
const NAVY   = '#1C2E4A';
const ORANGE = '#FFA726';
const GREEN  = '#2E7D32';
const GREEN_LIGHT = '#E8F5E9';

// ── helpers ───────────────────────────────────────────────────────────────────

const xaf = (n) => Number(n).toLocaleString('fr-FR') + ' XAF';

const fmtDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
        + ' ' + dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

const STATUS_LABEL = {
    completed:        { label: 'Terminée',    color: GREEN,   bg: GREEN_LIGHT },
    cancelled_driver: { label: 'Annulée',     color: '#C62828', bg: '#FFEBEE' },
    cancelled_rider:  { label: 'Annulée',     color: '#C62828', bg: '#FFEBEE' },
    in_progress:      { label: 'En cours',    color: '#1565C0', bg: '#E3F2FD' },
};

// ── StatTile ──────────────────────────────────────────────────────────────────

function StatTile({ icon, label, value, accent, small }) {
    return (
        <View style={[styles.statTile, small && styles.statTileSmall]}>
            <View style={[styles.statIcon, { backgroundColor: accent + '18' }]}>
                <Ionicons name={icon} size={small ? 16 : 18} color={accent} />
            </View>
            <Text style={[styles.statValue, small && styles.statValueSmall]}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

// ── DriverTabBar ──────────────────────────────────────────────────────────────

const DRIVER_TABS = [
    { key: 'map',       icon: 'map',             iconOutline: 'map-outline',          label: 'Carte' },
    { key: 'dashboard', icon: 'stats-chart',      iconOutline: 'stats-chart-outline',  label: 'Tableau' },
    { key: 'history',   icon: 'time',             iconOutline: 'time-outline',         label: 'Historique' },
];

function DriverTabBar({ activeTab, onChange, insets }) {
    return (
        <View style={[driverTabStyles.bar, { paddingBottom: insets.bottom || 8 }]}>
            <View style={driverTabStyles.topLine} />
            <View style={driverTabStyles.row}>
                {DRIVER_TABS.map(tab => {
                    const active = activeTab === tab.key;
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={driverTabStyles.item}
                            onPress={() => onChange(tab.key)}
                            activeOpacity={0.8}
                        >
                            {active && (
                                <View style={[driverTabStyles.pill, { backgroundColor: ORANGE + '18' }]} />
                            )}
                            <Ionicons
                                name={active ? tab.icon : tab.iconOutline}
                                size={24}
                                color={active ? ORANGE : '#B0BAC8'}
                            />
                            <Text style={[driverTabStyles.label, active && driverTabStyles.labelActive]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const driverTabStyles = StyleSheet.create({
    bar: {
        backgroundColor: '#fff',
        shadowColor: NAVY,
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.07,
        shadowRadius: 12,
        elevation: 16,
    },
    topLine: { height: 0.5, backgroundColor: 'rgba(0,0,0,0.06)' },
    row: {
        flexDirection: 'row',
        paddingTop: 8,
        paddingHorizontal: 8,
        paddingBottom: 4,
    },
    item: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        paddingVertical: 4,
    },
    pill: {
        position: 'absolute',
        top: -2, left: 6, right: 6, bottom: -2,
        borderRadius: 14,
    },
    label: {
        fontSize: 10,
        marginTop: 3,
        fontWeight: '600',
        color: '#B0BAC8',
    },
    labelActive: { color: ORANGE, fontWeight: '800' },
});

// ── main ──────────────────────────────────────────────────────────────────────

export default function DriverHomeScreen({ navigation }) {
    const { user }   = useAuth();
    const insets     = useSafeAreaInsets();

    const isVerifiedDriver = user?.active_services?.includes('driver');

    const [driverTab,     setDriverTab]     = useState('map');
    const [isOnline,      setIsOnline]      = useState(false);
    const [location,      setLocation]      = useState(null);
    const [todayEarnings, setTodayEarnings] = useState(0);
    const [tripsToday,    setTripsToday]    = useState(0);
    const [weekEarnings,  setWeekEarnings]  = useState(0);
    const [totalTrips,    setTotalTrips]    = useState(0);
    const [totalEarnings, setTotalEarnings] = useState(0);
    const [walletBalance, setWalletBalance] = useState(null);
    const [mapType,       setMapType]       = useState('standard');
    const [allRides,      setAllRides]      = useState([]);
    const mapRef = useRef(null);

    // Pulse animation
    const pulseAnim = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        if (!isOnline) { pulseAnim.setValue(1); return; }
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1,   duration: 800, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [isOnline]);

    // Location
    useEffect(() => {
        (async () => {
            try {
                await locationService.requestPermissions();
                const loc = await locationService.getCurrentLocation();
                setLocation(loc);
                mapRef.current?.animateToRegion(
                    { latitude: loc.latitude, longitude: loc.longitude, latitudeDelta: 0.015, longitudeDelta: 0.015 }, 800
                );
            } catch (_) {}
        })();
    }, []);

    // Socket online/offline
    useEffect(() => {
        if (!isOnline) return;
        socketService.toggleAvailability(true);
        return () => socketService.toggleAvailability(false);
    }, [isOnline]);

    // Incoming rides
    useEffect(() => {
        if (!isOnline) return;
        const handleNewRide = (data) => {
            navigation.navigate('RideAccept', {
                rideId:   data.ride_id,
                rideData: {
                    pickup_address:   data.pickup_address,
                    dropoff_address:  data.dropoff_address,
                    pickup_location:  data.pickup_location,
                    fare:             data.fare,
                    distance_km:      data.distance_km,
                    duration_minutes: data.duration_minutes,
                    rider:            data.rider,
                },
            });
        };
        socketService.on('new_ride_request', handleNewRide);
        return () => socketService.off('new_ride_request', handleNewRide);
    }, [isOnline, navigation]);

    // Load stats
    useEffect(() => { loadStats(); }, []);

    const loadStats = async () => {
        try {
            const [ridesRes, walletRes] = await Promise.allSettled([
                rideAPI.getHistory({ limit: 200 }),
                walletAPI.getBalance(),
            ]);

            if (ridesRes.status === 'fulfilled') {
                const rides = ridesRes.value.data?.rides || [];
                const now      = new Date();
                const todayStr = now.toDateString();
                const weekAgo  = new Date(now - 7 * 86400000);
                let dayEarnings = 0, dayCount = 0, weekEarn = 0, allTrips = 0, total = 0;

                // All driver rides (completed + others)
                const driverRides = rides.filter(r => r.driver_id === user?.id);
                driverRides.forEach(r => {
                    if (r.status !== 'completed') return;
                    const earned = parseFloat(r.payment?.driver_earnings || r.fare || 0);
                    const date   = new Date(r.completed_at || r.created_at);
                    total += earned;
                    allTrips++;
                    if (date.toDateString() === todayStr) { dayEarnings += earned; dayCount++; }
                    if (date >= weekAgo) weekEarn += earned;
                });

                setTodayEarnings(dayEarnings);
                setTripsToday(dayCount);
                setWeekEarnings(weekEarn);
                setTotalTrips(allTrips);
                setTotalEarnings(total);
                setAllRides(driverRides.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
            }

            if (walletRes.status === 'fulfilled') {
                setWalletBalance(walletRes.value.data?.balance ?? null);
            }
        } catch (_) {}
    };

    // ── KYC guard ─────────────────────────────────────────────────────────────

    if (!isVerifiedDriver) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
                <View style={{ backgroundColor: '#FFF8E1', borderRadius: 20, padding: 28, alignItems: 'center', width: '100%' }}>
                    <Ionicons name="shield-outline" size={54} color={ORANGE} />
                    <Text style={{ fontSize: 20, fontWeight: '800', color: NAVY, textAlign: 'center', marginTop: 16, marginBottom: 10 }}>
                        Vérification requise
                    </Text>
                    <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 21, marginBottom: 24 }}>
                        Pour conduire sur Ombia, vous devez compléter votre vérification chauffeur.
                    </Text>
                    <TouchableOpacity
                        style={[styles.onlineBtn, { width: '100%' }]}
                        onPress={() => navigation.replace('ServiceActivation', { serviceKey: 'driver' })}
                    >
                        <Text style={styles.onlineBtnText}>Commencer la vérification</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ marginTop: 12 }} onPress={() => navigation.goBack()}>
                        <Text style={{ color: '#aaa', fontSize: 14 }}>Retour</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // ── shared header ─────────────────────────────────────────────────────────

    const Header = () => (
        <View style={styles.header}>
            <View style={styles.headerAccent} />
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={22} color={NAVY} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
                <View style={[styles.onlineDot, { backgroundColor: isOnline ? '#43A047' : '#ccc' }]}>
                    {isOnline && (
                        <Animated.View style={[styles.onlineDotRing, { transform: [{ scale: pulseAnim }] }]} />
                    )}
                </View>
                <Text style={styles.headerTitle}>
                    {isOnline ? 'En ligne' : 'Conduire Pour Ombia'}
                </Text>
            </View>
            <View style={styles.headerRight}>
                <Text style={styles.toggleLabel}>{isOnline ? 'Actif' : 'Inactif'}</Text>
                <Switch
                    value={isOnline}
                    onValueChange={setIsOnline}
                    trackColor={{ false: '#E0E0E0', true: '#A5D6A7' }}
                    thumbColor={isOnline ? '#43A047' : '#fff'}
                    ios_backgroundColor="#E0E0E0"
                />
            </View>
        </View>
    );

    // ── TAB: MAP ──────────────────────────────────────────────────────────────

    const MapTab = () => (
        <View style={{ flex: 1 }}>
            <View style={styles.mapWrap}>
                <LeafletMap
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={location
                        ? { latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.015, longitudeDelta: 0.015 }
                        : { latitude: 0.4162, longitude: 9.4673, latitudeDelta: 0.08, longitudeDelta: 0.08 }
                    }
                    showsUserLocation
                    userLocation={location}
                    markers={location ? [{ id: 'driver', coordinate: { latitude: location.latitude, longitude: location.longitude }, type: 'driver' }] : []}
                />

                {/* Map buttons */}
                <View style={styles.mapBtns}>
                    <TouchableOpacity
                        style={[styles.mapTypeBtn, mapType === 'satellite' && styles.mapTypeBtnActive]}
                        onPress={() => setMapType(t => t === 'standard' ? 'satellite' : 'standard')}
                        activeOpacity={0.82}
                    >
                        <Ionicons
                            name={mapType === 'standard' ? 'planet-outline' : 'map-outline'}
                            size={15} color={mapType === 'satellite' ? '#fff' : NAVY}
                        />
                        <Text style={[styles.mapTypeBtnLabel, mapType === 'satellite' && { color: '#fff' }]}>
                            {mapType === 'standard' ? 'Satellite' : 'Plan'}
                        </Text>
                    </TouchableOpacity>
                    {location && (
                        <TouchableOpacity
                            style={styles.locateBtn}
                            onPress={() => mapRef.current?.fitToCoordinates(
                                [{ latitude: location.latitude, longitude: location.longitude }],
                                { edgePadding: { top: 80, right: 60, bottom: 230, left: 60 }, animated: true }
                            )}
                        >
                            <Ionicons name="locate" size={18} color={NAVY} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Offline overlay */}
                {!isOnline && (
                    <View style={styles.offlineOverlay}>
                        <View style={styles.offlineCard}>
                            <View style={styles.offlineIconWrap}>
                                <Ionicons name="moon" size={28} color="#888" />
                            </View>
                            <Text style={styles.offlineTitle}>Vous êtes hors ligne</Text>
                            <Text style={styles.offlineSub}>Activez le mode en ligne pour recevoir des courses</Text>
                            <TouchableOpacity style={styles.onlineBtn} onPress={() => setIsOnline(true)}>
                                <Text style={styles.onlineBtnText}>Passer en ligne</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Listening badge */}
                {isOnline && (
                    <View style={styles.listeningBadge}>
                        <Animated.View style={[styles.listeningDot, { transform: [{ scale: pulseAnim }] }]} />
                        <Text style={styles.listeningText}>En attente de courses…</Text>
                    </View>
                )}
            </View>

            {/* Compact stats bar */}
            <View style={styles.compactStats}>
                <View style={styles.compactItem}>
                    <Text style={styles.compactValue}>{xaf(todayEarnings)}</Text>
                    <Text style={styles.compactLabel}>Aujourd'hui</Text>
                </View>
                <View style={styles.compactDivider} />
                <View style={styles.compactItem}>
                    <Text style={styles.compactValue}>{tripsToday}</Text>
                    <Text style={styles.compactLabel}>Courses auj.</Text>
                </View>
                <View style={styles.compactDivider} />
                <TouchableOpacity style={styles.compactItem} onPress={() => navigation.navigate('Wallet')}>
                    <Text style={[styles.compactValue, { color: ORANGE }]}>
                        {walletBalance !== null ? xaf(walletBalance) : '—'}
                    </Text>
                    <Text style={styles.compactLabel}>Portefeuille</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // ── TAB: DASHBOARD ────────────────────────────────────────────────────────

    const DashboardTab = () => (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.dashScroll} showsVerticalScrollIndicator={false}>

            {/* Section: Today */}
            <Text style={styles.dashSection}>Aujourd'hui</Text>
            <View style={styles.statsRow}>
                <StatTile icon="cash-outline"           label="Revenus"        value={xaf(todayEarnings)} accent={GREEN} />
                <View style={styles.statsDivider} />
                <StatTile icon="checkmark-circle-outline" label="Courses"       value={String(tripsToday)} accent="#0288D1" />
                <View style={styles.statsDivider} />
                <StatTile icon="time-outline"            label="Moy. / course"
                    value={tripsToday ? xaf(Math.round(todayEarnings / tripsToday)) : '—'}
                    accent={ORANGE}
                />
            </View>

            {/* Section: Cette semaine */}
            <Text style={styles.dashSection}>Cette semaine</Text>
            <View style={styles.statsRow}>
                <StatTile icon="calendar-outline"  label="Revenus"    value={xaf(weekEarnings)}  accent={ORANGE} />
                <View style={styles.statsDivider} />
                <StatTile icon="trending-up-outline" label="Progression"
                    value={totalEarnings ? (weekEarnings / totalEarnings * 100).toFixed(0) + '%' : '—'}
                    accent="#7B61FF"
                />
            </View>

            {/* Section: Total */}
            <Text style={styles.dashSection}>Depuis le début</Text>
            <View style={styles.statsRow}>
                <StatTile icon="car-outline"         label="Courses"       value={String(totalTrips)}   accent="#7B61FF" />
                <View style={styles.statsDivider} />
                <StatTile icon="trending-up-outline" label="Total gagné"   value={xaf(totalEarnings)}   accent={GREEN} />
                <View style={styles.statsDivider} />
                <StatTile icon="star-outline"        label="Note"
                    value={user?.rating ? parseFloat(user.rating).toFixed(1) + ' ★' : '—'}
                    accent={ORANGE}
                />
            </View>

            {/* Wallet card */}
            <TouchableOpacity style={styles.walletCard} onPress={() => navigation.navigate('Wallet')} activeOpacity={0.85}>
                <View style={[styles.statIcon, { backgroundColor: ORANGE + '18', width: 44, height: 44, borderRadius: 13, marginBottom: 0 }]}>
                    <Ionicons name="wallet-outline" size={20} color={ORANGE} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.walletLabel}>Portefeuille Ombia</Text>
                    <Text style={styles.walletValue}>
                        {walletBalance !== null ? xaf(walletBalance) : '— XAF'}
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#ccc" />
            </TouchableOpacity>

            {/* Performance tips */}
            <View style={styles.tipCard}>
                <View style={styles.tipIcon}>
                    <Ionicons name="bulb-outline" size={22} color={ORANGE} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.tipTitle}>Conseil du jour</Text>
                    <Text style={styles.tipText}>
                        Restez actif aux heures de pointe (7h–9h et 17h–20h) pour maximiser vos revenus.
                    </Text>
                </View>
            </View>

            <TouchableOpacity style={styles.refreshBtn} onPress={loadStats}>
                <Ionicons name="refresh-outline" size={16} color={NAVY} />
                <Text style={styles.refreshBtnText}>Actualiser les stats</Text>
            </TouchableOpacity>
        </ScrollView>
    );

    // ── TAB: HISTORY ──────────────────────────────────────────────────────────

    const HistoryTab = () => (
        <View style={{ flex: 1 }}>
            {allRides.length === 0 ? (
                <View style={styles.emptyHistory}>
                    <Ionicons name="car-outline" size={54} color="#D0D5DD" />
                    <Text style={styles.emptyHistoryTitle}>Aucune course</Text>
                    <Text style={styles.emptyHistoryText}>Vos courses effectuées apparaîtront ici</Text>
                </View>
            ) : (
                <FlatList
                    data={allRides}
                    keyExtractor={r => r.id}
                    contentContainerStyle={{ padding: 16, gap: 10 }}
                    renderItem={({ item: ride }) => {
                        const meta = STATUS_LABEL[ride.status] || { label: ride.status, color: '#888', bg: '#F5F5F5' };
                        const earned = parseFloat(ride.payment?.driver_earnings || ride.fare || 0);
                        return (
                            <View style={styles.rideCard}>
                                <View style={styles.rideCardTop}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.rideAddr} numberOfLines={1}>
                                            {ride.pickup_address}
                                        </Text>
                                        <View style={styles.rideDotLine} />
                                        <Text style={styles.rideAddr} numberOfLines={1}>
                                            {ride.dropoff_address}
                                        </Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                                            <Text style={[styles.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
                                        </View>
                                        {ride.status === 'completed' && (
                                            <Text style={styles.rideEarning}>{xaf(earned)}</Text>
                                        )}
                                    </View>
                                </View>
                                <View style={styles.rideCardBottom}>
                                    <Ionicons name="time-outline" size={12} color="#aaa" />
                                    <Text style={styles.rideDate}>{fmtDate(ride.created_at)}</Text>
                                    {ride.distance_km && (
                                        <>
                                            <Text style={styles.rideDot}>·</Text>
                                            <Text style={styles.rideDate}>{parseFloat(ride.distance_km).toFixed(1)} km</Text>
                                        </>
                                    )}
                                    {ride.driver_rating && (
                                        <>
                                            <Text style={styles.rideDot}>·</Text>
                                            <Ionicons name="star" size={11} color="#FFD700" />
                                            <Text style={styles.rideDate}>{ride.driver_rating}</Text>
                                        </>
                                    )}
                                </View>
                            </View>
                        );
                    }}
                />
            )}
        </View>
    );

    // ── render ────────────────────────────────────────────────────────────────

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header />

            {driverTab === 'map'       && <MapTab />}
            {driverTab === 'dashboard' && <DashboardTab />}
            {driverTab === 'history'   && <HistoryTab />}

            <DriverTabBar activeTab={driverTab} onChange={setDriverTab} insets={insets} />
        </SafeAreaView>
    );
}

// ── styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F4F8' },

    /* Header */
    header: {
        flexDirection:    'row',
        alignItems:       'center',
        paddingHorizontal: 16,
        paddingVertical:   10,
        backgroundColor:  '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    headerAccent: { width: 4, height: 32, borderRadius: 2, backgroundColor: ORANGE, marginRight: 10 },
    backBtn:       { marginRight: 10 },
    headerCenter:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle:   { fontSize: 17, fontWeight: '700', color: NAVY },
    headerRight:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
    toggleLabel:   { fontSize: 12, fontWeight: '600', color: '#888' },
    onlineDot: {
        width: 10, height: 10, borderRadius: 5,
        alignItems: 'center', justifyContent: 'center',
    },
    onlineDotRing: {
        position: 'absolute', width: 18, height: 18, borderRadius: 9,
        borderWidth: 2, borderColor: '#43A047', opacity: 0.4,
    },

    /* Map */
    mapWrap: { flex: 1 },
    map:     { flex: 1 },
    mapBtns: { position: 'absolute', top: 14, right: 14, gap: 8 },
    mapTypeBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 12,
        borderRadius: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
    },
    mapTypeBtnActive:  { backgroundColor: NAVY },
    mapTypeBtnLabel:   { fontSize: 12, fontWeight: '700', color: NAVY },
    locateBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
    },
    driverMarker: {
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: '#888', alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#fff',
    },
    driverMarkerOnline: { backgroundColor: ORANGE },
    offlineOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(28,46,74,0.45)',
        alignItems: 'center', justifyContent: 'center', padding: 32,
    },
    offlineCard: {
        backgroundColor: '#fff', borderRadius: 20, padding: 28,
        alignItems: 'center', width: '100%',
    },
    offlineIconWrap: {
        width: 64, height: 64, borderRadius: 32, backgroundColor: '#F5F5F5',
        alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    },
    offlineTitle: { fontSize: 18, fontWeight: '800', color: NAVY, marginBottom: 6 },
    offlineSub:   { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 19, marginBottom: 20 },
    onlineBtn: {
        backgroundColor: ORANGE, paddingVertical: 13, paddingHorizontal: 28,
        borderRadius: 12, shadowColor: ORANGE, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    onlineBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    listeningBadge: {
        position: 'absolute', bottom: 16, alignSelf: 'center',
        left: W * 0.2, right: W * 0.2,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        backgroundColor: '#E8F5E9', borderRadius: 20,
        paddingVertical: 6, paddingHorizontal: 14,
        borderWidth: 1, borderColor: '#A5D6A7',
    },
    listeningDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN },
    listeningText: { fontSize: 12, fontWeight: '600', color: GREEN },

    /* Compact stats bar (map tab bottom) */
    compactStats: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 4,
    },
    compactItem: { flex: 1, alignItems: 'center' },
    compactValue: { fontSize: 13, fontWeight: '800', color: NAVY, marginBottom: 2 },
    compactLabel: { fontSize: 10, color: '#aaa', fontWeight: '600' },
    compactDivider: { width: 1, backgroundColor: '#F0F0F0', marginVertical: 4 },

    /* Dashboard tab */
    dashScroll: { padding: 16, paddingBottom: 24 },
    dashSection: {
        fontSize: 12, fontWeight: '700', color: '#aaa',
        letterSpacing: 0.8, textTransform: 'uppercase',
        marginBottom: 10, marginTop: 8,
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 8,
        marginBottom: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    statsDivider: { width: 1, backgroundColor: '#F0F0F0', marginHorizontal: 8 },
    statTile:      { flex: 1, alignItems: 'center', paddingVertical: 4 },
    statTileSmall: {},
    statIcon: {
        width: 32, height: 32, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center', marginBottom: 5,
    },
    statValue:      { fontSize: 14, fontWeight: '800', color: NAVY, textAlign: 'center', marginBottom: 2 },
    statValueSmall: { fontSize: 13 },
    statLabel:      { fontSize: 10, color: '#aaa', fontWeight: '600', textAlign: 'center' },

    walletCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#fff', borderRadius: 16, padding: 14,
        marginTop: 8, marginBottom: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    walletLabel: { fontSize: 11, color: '#888', fontWeight: '600' },
    walletValue: { fontSize: 16, fontWeight: '800', color: NAVY, marginTop: 2 },

    tipCard: {
        flexDirection: 'row', gap: 12, alignItems: 'flex-start',
        backgroundColor: '#FFF8E1', borderRadius: 14, padding: 14,
        borderWidth: 1, borderColor: '#FFCC80', marginBottom: 16,
    },
    tipIcon: {
        width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFE0B2',
        alignItems: 'center', justifyContent: 'center',
    },
    tipTitle: { fontSize: 13, fontWeight: '700', color: NAVY, marginBottom: 3 },
    tipText:  { fontSize: 12, color: '#666', lineHeight: 17 },

    refreshBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 10, borderRadius: 10,
        backgroundColor: '#F2F4F8', borderWidth: 1, borderColor: '#E0E3E8',
    },
    refreshBtnText: { fontSize: 13, fontWeight: '600', color: NAVY },

    /* History tab */
    emptyHistory: {
        flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40,
    },
    emptyHistoryTitle: { fontSize: 18, fontWeight: '700', color: NAVY, marginTop: 16, marginBottom: 6 },
    emptyHistoryText:  { fontSize: 13, color: '#aaa', textAlign: 'center' },

    rideCard: {
        backgroundColor: '#fff', borderRadius: 14, padding: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
    },
    rideCardTop: { flexDirection: 'row', gap: 10, marginBottom: 8 },
    rideAddr:    { fontSize: 13, fontWeight: '600', color: NAVY },
    rideDotLine: { height: 14, width: 1, backgroundColor: '#E0E0E0', marginLeft: 6, marginVertical: 2 },
    rideEarning: { fontSize: 14, fontWeight: '800', color: GREEN },
    statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    statusBadgeText: { fontSize: 10, fontWeight: '700' },
    rideCardBottom: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
    rideDate:        { fontSize: 11, color: '#aaa' },
    rideDot:         { fontSize: 11, color: '#ccc' },
});
