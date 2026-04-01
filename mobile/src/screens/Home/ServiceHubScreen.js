import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    Animated,
    Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
    Bell, QrCode, ArrowsLeftRight, PlusCircle, ClockCounterClockwise,
    Compass, TrendUp, ShoppingBag, Car, Taxi, Scooter, Package,
    NavigationArrow, Key, ShieldStar, Storefront, Tote, MagnifyingGlass, Tag,
} from 'phosphor-react-native';
import { useAuth } from '../../context/AuthContext';
import { walletAPI } from '../../services/api.service';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_GAP  = 6;
const CARD_W    = (SCREEN_W - 32 - CARD_GAP * 2) / 3;
const CARD_W_2  = (SCREEN_W - 32 - CARD_GAP) / 2;
const SCREEN_H  = Dimensions.get('window').height;

// ─────────────────────────────────────────────────────────────
//  Pulse ring for logo
// ─────────────────────────────────────────────────────────────

const PulseRing = ({ delay, color, size }) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(anim, { toValue: 1, duration: 2000, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);
    const scale   = anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.6] });
    const opacity = anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.5, 0.2, 0] });
    return (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
            <Animated.View style={{
                width:        size,
                height:       size,
                borderRadius: size / 2,
                borderWidth:  1.5,
                borderColor:  color,
                opacity,
                transform:    [{ scale }],
            }} />
        </View>
    );
};

// ─────────────────────────────────────────────────────────────
//  Service definitions
// ─────────────────────────────────────────────────────────────

const CATEGORIES = [
    // ── 1. Consumer mobility ────────────────────────────────────────────
    {
        key:       'deplacement',
        label:     'Mobilité',
        sub:       'Courses, taxis & locations',
        PhIcon:    Compass,
        iconColor: '#FF6B35',
        services:  [
            {
                key:              'rider',
                PhIcon:           NavigationArrow,
                iconColor:        '#FF6B35',
                iconBg:           '#FFF0EB',
                cardBg:           '#FFFCFA',
                borderColor:      '#FFD5C5',
                label:            'Se déplacer',
                sub:              'Commander un taxi',
                screen:           'RideRequest',
                alwaysAccessible: true,
            },
            {
                key:              'renter',
                PhIcon:           Car,
                iconColor:        '#0288D1',
                iconBg:           '#E1F3FB',
                cardBg:           '#F5FBFF',
                borderColor:      '#9EDBF5',
                label:            'Louer un véhicule',
                sub:              'Location courte durée',
                screen:           'RentalMap',
                alwaysAccessible: true,
            },
            {
                key:              'delivery_sender',
                PhIcon:           Package,
                iconColor:        '#6D4C41',
                iconBg:           '#EFEBE9',
                cardBg:           '#FAFAF9',
                borderColor:      '#BCAAA4',
                label:            'Livraison Express',
                sub:              'Envoyer un colis',
                screen:           'DeliveryRequest',
                alwaysAccessible: true,
            },
        ],
    },

    // ── 2. Mobility providers (KYC required) ────────────────────────────
    {
        key:       'revenus',
        label:     'Générer des Revenus',
        sub:       'Chauffeur, flotte & propriétaire',
        PhIcon:    TrendUp,
        iconColor: '#26A69A',
        services:  [
            {
                key:              'driver',
                PhIcon:           Taxi,
                iconColor:        '#1565C0',
                iconBg:           '#DCEEFF',
                cardBg:           '#F5F9FF',
                borderColor:      '#90C3F5',
                label:            'Conduire Pour Ombia',
                sub:              'Chauffeur Ombia',
                screen:           'DriverHome',
                alwaysAccessible: false,
            },
            {
                key:              'rental_owner',
                PhIcon:           Key,
                iconColor:        '#00897B',
                iconBg:           '#D4F5F2',
                cardBg:           '#F3FFFD',
                borderColor:      '#80D8D1',
                label:            'Louer mon véhicule',
                sub:              'Mettre en location',
                screen:           'MyRentalCars',
                alwaysAccessible: false,
            },
            {
                key:              'fleet_owner',
                PhIcon:           ShieldStar,
                iconColor:        '#E65100',
                iconBg:           '#FFF3E0',
                cardBg:           '#FFFBF5',
                borderColor:      '#FFCC80',
                label:            'Flotte Ombia',
                sub:              'Déléguer mon véhicule à Ombia',
                screen:           'FleetOwnerHome',
                alwaysAccessible: false,
                fullWidth:        true,
            },
            {
                key:              'courier',
                PhIcon:           Scooter,
                iconColor:        '#6D4C41',
                iconBg:           '#EFEBE9',
                cardBg:           '#FAFAF9',
                borderColor:      '#BCAAA4',
                label:            'Coursier Colis',
                sub:              'Devenir coursier Ombia',
                screen:           'CourierHome',
                alwaysAccessible: true,
            },
        ],
    },

    // ── 3. E-commerce & boutiques ───────────────────────────────────────
    {
        key:       'ecommerce',
        label:     'Boutiques & Commerce',
        sub:       'Achats, boutiques & partenaires',
        PhIcon:    ShoppingBag,
        iconColor: '#1565C0',
        services:  [
            {
                key:              'ecommerce_browse',
                PhIcon:           ShoppingBag,
                iconColor:        '#1565C0',
                iconBg:           '#DCEEFF',
                cardBg:           '#F5F9FF',
                borderColor:      '#90C3F5',
                label:            'Faire ses achats',
                sub:              'Boutiques en ligne',
                screen:           'Ecommerce',
                alwaysAccessible: true,
            },
            {
                key:              'partner',
                PhIcon:           Storefront,
                iconColor:        '#00897B',
                iconBg:           '#D4F5F2',
                cardBg:           '#F3FFFD',
                borderColor:      '#80D8D1',
                label:            'Partenaire Marchand',
                sub:              'Recevez des paiements QR instantanément',
                screen:           'PartnerDashboard',
                alwaysAccessible: false,
            },
            {
                key:              'store_owner',
                PhIcon:           Tote,
                iconColor:        '#7B1FA2',
                iconBg:           '#F3E5F5',
                cardBg:           '#FDF5FF',
                borderColor:      '#CE93D8',
                label:            'Ouvrir ma boutique',
                sub:              'Vendez en ligne & gérez vos commandes',
                screen:           'ProductManage',
                alwaysAccessible: false,
                fullWidth:        true,
                partnerPromo:     true,
            },
        ],
    },

    // ── 4. Marché automobile ────────────────────────────────────────────
    {
        key:       'auto',
        label:     'Marché Automobile',
        sub:       'Achat & vente de véhicules',
        PhIcon:    Car,
        iconColor: '#7B1FA2',
        services:  [
            {
                key:              'car_market',
                PhIcon:           MagnifyingGlass,
                iconColor:        '#7B1FA2',
                iconBg:           '#F3E5F5',
                cardBg:           '#FDF5FF',
                borderColor:      '#CE93D8',
                label:            'Acheter un véhicule',
                sub:              'Parcourir les annonces',
                screen:           'CarMarket',
                alwaysAccessible: true,
            },
            {
                key:              'car_seller',
                PhIcon:           Tag,
                iconColor:        '#E65100',
                iconBg:           '#FFF3E0',
                cardBg:           '#FFFBF5',
                borderColor:      '#FFCC80',
                label:            'Vendre un véhicule',
                sub:              'Publier une annonce',
                screen:           'CarSellerDashboard',
                alwaysAccessible: false,
            },
        ],
    },
];

// ─────────────────────────────────────────────────────────────
//  BorderTrace — each card gets its own random pattern
// ─────────────────────────────────────────────────────────────

// Stable pseudo-random from a numeric seed
const pr = (seed) => { const x = Math.sin(seed + 1) * 10000; return x - Math.floor(x); };

const BorderTrace = ({ color, cardWidth, cardHeight, delay = 0, seed = 0, starMode = false }) => {
    // starMode: all 4 edges, fast, comet tail effect
    // normal: random 2-3 edges, varied speed
    const lightLen  = starMode ? 48 : Math.round(18 + pr(seed) * 22);
    const dur       = starMode ? 700 : Math.round(500 + pr(seed + 1) * 500);
    const pause     = starMode ? 1400 : Math.round(2500 + pr(seed + 2) * 2500);
    const edgeCount = starMode ? 4 : (pr(seed + 3) > 0.5 ? 2 : 3);
    const startIdx  = starMode ? 0 : Math.floor(pr(seed + 4) * 4);
    const clockwise = starMode ? true : pr(seed + 5) > 0.4;

    const anims = [
        useRef(new Animated.Value(0)).current,
        useRef(new Animated.Value(0)).current,
        useRef(new Animated.Value(0)).current,
        useRef(new Animated.Value(0)).current,
    ];

    useEffect(() => {
        const run = () => {
            anims.forEach(a => a.setValue(0));
            Animated.sequence([
                Animated.delay(delay),
                ...anims.slice(0, edgeCount).map(a =>
                    Animated.timing(a, { toValue: 1, duration: dur, useNativeDriver: true })
                ),
                Animated.delay(pause),
            ]).start(({ finished }) => { if (finished) run(); });
        };
        run();
    }, []);

    const allEdges = clockwise ? [0, 1, 2, 3] : [0, 3, 2, 1];
    const startPos = allEdges.indexOf(startIdx) === -1 ? 0 : allEdges.indexOf(startIdx);
    const ordered  = [...allEdges.slice(startPos), ...allEdges.slice(0, startPos)].slice(0, edgeCount);

    const L = lightLen;

    // Comet: tail(dim) → body → bright head — rendered as flex row inside animated container
    const headGlow  = starMode ? 6 : 3;
    const headSize  = starMode ? 3.5 : 2.5;
    const headColor = starMode ? '#fff' : color;

    const Comet = ({ horizontal, size }) => (
        <View style={horizontal
            ? { flexDirection: 'row', alignItems: 'center', height: starMode ? 3 : 2.5 }
            : { flexDirection: 'column', alignItems: 'center', width: starMode ? 3 : 2.5 }}>
            {/* tail */}
            <View style={horizontal
                ? { width: size * 0.45, height: starMode ? 1.5 : 1, backgroundColor: color, opacity: starMode ? 0.18 : 0.12, borderRadius: 1 }
                : { height: size * 0.45, width: starMode ? 1.5 : 1, backgroundColor: color, opacity: starMode ? 0.18 : 0.12, borderRadius: 1 }} />
            {/* mid */}
            <View style={horizontal
                ? { width: size * 0.3, height: starMode ? 2 : 1.5, backgroundColor: color, opacity: starMode ? 0.5 : 0.4, borderRadius: 1 }
                : { height: size * 0.3, width: starMode ? 2 : 1.5, backgroundColor: color, opacity: starMode ? 0.5 : 0.4, borderRadius: 1 }} />
            {/* bright head */}
            <View style={horizontal
                ? { width: size * 0.25, height: headSize, backgroundColor: headColor, borderRadius: 2,
                    shadowColor: color, shadowOpacity: starMode ? 1 : 0.7, shadowRadius: headGlow, elevation: starMode ? 5 : 3 }
                : { height: size * 0.25, width: headSize, backgroundColor: headColor, borderRadius: 2,
                    shadowColor: color, shadowOpacity: starMode ? 1 : 0.7, shadowRadius: headGlow, elevation: starMode ? 5 : 3 }} />
        </View>
    );

    const getEdge = (edgeIdx, animVal) => {
        if (edgeIdx === 0) {
            const tx = animVal.interpolate({ inputRange: [0, 1], outputRange: [-L, cardWidth + L] });
            return (
                <View key="t" style={{ position: 'absolute', top: 0, left: 0, width: cardWidth, height: 4, overflow: 'hidden', justifyContent: 'center' }}>
                    <Animated.View style={{ position: 'absolute', transform: [{ translateX: tx }] }}>
                        <Comet horizontal size={L} />
                    </Animated.View>
                </View>
            );
        }
        if (edgeIdx === 1) {
            const ty = animVal.interpolate({ inputRange: [0, 1], outputRange: [-L, cardHeight + L] });
            return (
                <View key="r" style={{ position: 'absolute', top: 0, right: 0, width: 4, height: cardHeight, overflow: 'hidden', alignItems: 'center' }}>
                    <Animated.View style={{ position: 'absolute', transform: [{ translateY: ty }] }}>
                        <Comet horizontal={false} size={L} />
                    </Animated.View>
                </View>
            );
        }
        if (edgeIdx === 2) {
            const tx = animVal.interpolate({ inputRange: [0, 1], outputRange: [cardWidth + L, -L] });
            return (
                <View key="b" style={{ position: 'absolute', bottom: 0, left: 0, width: cardWidth, height: 4, overflow: 'hidden', justifyContent: 'center' }}>
                    <Animated.View style={{ position: 'absolute', transform: [{ translateX: tx }] }}>
                        <Comet horizontal size={L} />
                    </Animated.View>
                </View>
            );
        }
        const ty = animVal.interpolate({ inputRange: [0, 1], outputRange: [cardHeight + L, -L] });
        return (
            <View key="l" style={{ position: 'absolute', top: 0, left: 0, width: 4, height: cardHeight, overflow: 'hidden', alignItems: 'center' }}>
                <Animated.View style={{ position: 'absolute', transform: [{ translateY: ty }] }}>
                    <Comet horizontal={false} size={L} />
                </Animated.View>
            </View>
        );
    };

    return <>{ordered.map((edgeIdx, i) => getEdge(edgeIdx, anims[i]))}</>;
};

// ─────────────────────────────────────────────────────────────
//  ServiceRow — used inside the bottom sheet
// ─────────────────────────────────────────────────────────────

const ServiceRow = ({ service, hasAccess, onPress }) => {
    const locked = !hasAccess && !service.comingSoon;
    return (
        <TouchableOpacity
            style={[styles.serviceRow, { borderColor: service.borderColor, backgroundColor: service.cardBg }]}
            onPress={service.comingSoon ? undefined : onPress}
            activeOpacity={service.comingSoon ? 1 : 0.72}
        >
            <View style={[styles.serviceRowIcon, { backgroundColor: service.iconBg }]}>
                <service.PhIcon
                    size={22}
                    color={service.comingSoon ? '#BDBDBD' : service.iconColor}
                    weight={locked || service.comingSoon ? 'regular' : 'fill'}
                />
            </View>
            <View style={styles.serviceRowInfo}>
                <Text style={[styles.serviceRowLabel, (locked || service.comingSoon) && { color: '#B0B8C1' }]}>
                    {service.label}
                </Text>
                {service.sub ? <Text style={styles.serviceRowSub}>{service.sub}</Text> : null}
            </View>
            {service.comingSoon ? (
                <View style={[styles.serviceRowBadge, { backgroundColor: '#7B1FA215' }]}>
                    <Text style={[styles.serviceRowBadgeText, { color: '#7B1FA2' }]}>Bientôt</Text>
                </View>
            ) : locked ? (
                <View style={[styles.serviceRowBadge, { backgroundColor: '#FFA72615' }]}>
                    <Text style={[styles.serviceRowBadgeText, { color: '#FFA726' }]}>Rejoindre</Text>
                </View>
            ) : (
                <View style={[styles.serviceRowBadge, { backgroundColor: service.iconColor + '18' }]}>
                    <Text style={[styles.serviceRowBadgeText, { color: service.iconColor }]}>Actif</Text>
                </View>
            )}
            <Ionicons name="chevron-forward" size={15} color="#C0C8D4" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
    );
};

// ─────────────────────────────────────────────────────────────
//  ServiceHubScreen
// ─────────────────────────────────────────────────────────────

const renderAvatar = (user, styles) => {
    if (user?.profile_photo) {
        return <Image source={{ uri: user.profile_photo }} style={styles.avatar} />;
    }
    if (user) {
        return (
            <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>{user.name[0].toUpperCase()}</Text>
            </View>
        );
    }
    return (
        <View style={[styles.avatar, styles.avatarGuest]}>
            <Image
                source={require('../../../assets/ombia-icon.png')}
                style={styles.avatarGuestLogo}
                resizeMode="contain"
            />
        </View>
    );
};

const ServiceHubScreen = ({ navigation }) => {
    const { user }  = useAuth();
    const insets    = useSafeAreaInsets();

    // Map service card keys to the active_services token used on the server
    const SERVICE_KEY_MAP = {
        ecommerce_browse: null,         // alwaysAccessible, no token needed
        car_market:       null,         // alwaysAccessible, no token needed
        driver:           'driver',
        rental_owner:     'rental_owner',
        fleet_owner:      'fleet_owner',
        partner:          'partner',
        store_owner:      'store_owner',
        car_seller:       'car_seller',
    };

    const hasAccess = (service) => {
        if (service.alwaysAccessible) return true;
        if (service.comingSoon)       return false;
        const token    = SERVICE_KEY_MAP[service.key] ?? service.key;
        const services = user?.active_services || ['rider', 'renter'];
        return services.includes(token);
    };

    const handleServicePress = (service) => {
        if (service.comingSoon) return;
        // Guest: redirect to login before any service action
        if (!user) { navigation.navigate('Login'); return; }
        if (hasAccess(service)) {
            if (service.screen) navigation.navigate(service.screen, { fromHub: true });
        } else {
            // Use the mapped token (driver, rental_owner, etc.) as the activation key
            const token = SERVICE_KEY_MAP[service.key] ?? service.key;
            navigation.navigate('ServiceActivation', { serviceKey: token });
        }
    };

    const fullName  = user?.name || '';
    const firstName = fullName.split(' ')[0] || '';
    const PULSE_SIZE = 72;
    const [balance,     setBalance]     = React.useState(null);
    const [cardNumber,  setCardNumber]  = React.useState('');

    // ── Bottom sheet state ───────────────────────────────────────────────────
    const [activeCat,   setActiveCat]   = useState(null);
    const [catH,        setCatH]        = useState({});
    const sheetAnim    = useRef(new Animated.Value(0)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    const openSheet = (cat) => {
        sheetAnim.setValue(0);
        backdropAnim.setValue(0);
        setActiveCat(cat);
        Animated.parallel([
            Animated.spring(sheetAnim,    { toValue: 1, useNativeDriver: true, tension: 65, friction: 11 }),
            Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        ]).start();
    };
    const closeSheet = () => {
        Animated.parallel([
            Animated.timing(sheetAnim,    { toValue: 0, duration: 260, useNativeDriver: true }),
            Animated.timing(backdropAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
        ]).start(() => setActiveCat(null));
    };

    // Re-fetch balance every time this screen is focused (e.g. returning from WalletScreen)
    useFocusEffect(useCallback(() => {
        walletAPI.getBalance().then(r => {
            setBalance(r.data?.balance ?? null);
            if (r.data?.card_number) setCardNumber(r.data.card_number);
        }).catch(() => {});
    }, []));

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>

            {/* ── Sticky Navbar ── */}
            <View style={styles.navbar}>
                {/* Avatar */}
                <TouchableOpacity
                    style={styles.avatarBtn}
                    onPress={() => navigation.navigate(user ? 'Profile' : 'Login')}
                >
                    {renderAvatar(user, styles)}
                </TouchableOpacity>

                {/* Pulsing logo */}
                <View style={styles.logoWrap}>
                    <PulseRing delay={0}    color="#FFA726" size={PULSE_SIZE} />
                    <PulseRing delay={800}  color="#4DB6E8" size={PULSE_SIZE} />
                    <Image
                        source={require('../../../assets/logo.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>

                {/* Bell */}
                <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')}>
                    <Bell size={22} color="#1C2E4A" weight="regular" />
                </TouchableOpacity>
            </View>


            <View style={styles.body}>

                {/* ── Hero: card + quick actions ── */}
                <View style={styles.heroWrap}>

                    {user ? (
                    /* ── Authenticated: wallet card ── */
                    <TouchableOpacity
                        style={styles.miniCard}
                        onPress={() => navigation.navigate('Wallet')}
                        activeOpacity={0.86}
                    >
                        {/* Shine overlay */}
                        <View style={styles.miniCardShine} />

                        {/* Top row: brand + NFC */}
                        <View style={styles.miniCardTop}>
                            <View style={styles.miniCardBrand}>
                                <Image
                                    source={require('../../../assets/ombia-icon.png')}
                                    style={styles.miniCardIcon}
                                    resizeMode="contain"
                                />
                                <View style={{ marginLeft: 6 }}>
                                    <Text style={styles.miniCardBrandTop}>OMBIA</Text>
                                    <Text style={styles.miniCardBrandBot}>EXPRESS</Text>
                                </View>
                            </View>
                            {/* QR + NFC icons */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <QrCode size={19} color="rgba(255,255,255,0.35)" weight="light" />
                                <MaterialCommunityIcons name="nfc" size={22} color="#FFA726" />
                            </View>
                        </View>

                        {/* Balance */}
                        <View>
                            <Text style={styles.miniCardBalLabel}>Solde disponible</Text>
                            <Text style={styles.miniCardBalValue}>
                                {balance !== null
                                    ? `${Number(balance).toLocaleString('fr-FR')} XAF`
                                    : '— XAF'}
                            </Text>
                        </View>

                        {/* Bottom row: name (left) + Portefeuille link (right) */}
                        <View style={styles.miniCardBottom}>
                            <View>
                                <Text style={styles.miniCardHolderLabel}>TITULAIRE</Text>
                                <Text style={styles.miniCardHolderName} numberOfLines={1}>
                                    {(fullName || 'UTILISATEUR').toUpperCase()}
                                </Text>
                                <Text style={styles.miniCardNum}>
                                    {cardNumber
                                        ? `${cardNumber.slice(0, 4)} •••• •••• ${cardNumber.slice(-4)}`
                                        : '•••• •••• •••• ••••'}
                                </Text>
                            </View>
                            <View style={styles.miniCardSeeMore}>
                                <Text style={styles.miniCardSeeText}>Portefeuille</Text>
                                <Ionicons name="chevron-forward" size={11} color="rgba(255,255,255,0.65)" />
                            </View>
                        </View>
                    </TouchableOpacity>
                ) : (
                    /* ── Guest: same card dimensions, invite to register ── */
                    <View style={styles.miniCard}>
                        <View style={styles.miniCardShine} />
                        {/* Top: brand */}
                        <View style={styles.miniCardTop}>
                            <View style={styles.miniCardBrand}>
                                <Image source={require('../../../assets/ombia-icon.png')} style={styles.miniCardIcon} resizeMode="contain" />
                                <View style={{ marginLeft: 6 }}>
                                    <Text style={styles.miniCardBrandTop}>OMBIA</Text>
                                    <Text style={styles.miniCardBrandBot}>EXPRESS</Text>
                                </View>
                            </View>
                            <Ionicons name="lock-closed" size={16} color="rgba(255,255,255,0.3)" />
                        </View>
                        {/* Middle: headline */}
                        <View>
                            <Text style={styles.miniCardBalLabel}>ACCÈS SERVICES</Text>
                            <Text style={[styles.miniCardBalValue, { fontSize: 19, lineHeight: 26 }]} numberOfLines={1} adjustsFontSizeToFit>
                                Créez votre compte gratuit
                            </Text>
                        </View>
                        {/* Bottom: CTAs */}
                        <View style={styles.miniCardBottom}>
                            <TouchableOpacity style={styles.guestCardBtnPrimary} onPress={() => navigation.navigate('Register')}>
                                <Text style={styles.guestCardBtnPrimaryText}>S'inscrire</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.guestCardBtnSecondary} onPress={() => navigation.navigate('Login')}>
                                <Text style={styles.guestCardBtnSecondaryText}>Déjà un compte →</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                </View>

                {/* ── Quick Actions ── */}
                <View style={styles.quickBar}>
                    {[
                        { icon: PlusCircle,             label: 'Recharger',  color: '#00897B', bg: '#D4F5F2', screen: 'Wallet', params: { openTopup: true } },
                        { icon: ArrowsLeftRight,        label: 'Transférer', color: '#1565C0', bg: '#DCEEFF', screen: 'WalletTransfer' },
                        { icon: QrCode,                 label: 'Scanner & Payer', color: '#7B1FA2', bg: '#F3E5F5', screen: 'RiderScanPay' },
                        { icon: ClockCounterClockwise,  label: 'Historique', color: '#E65100', bg: '#FFF3E0', screen: 'Wallet', params: { activeTab: 'history' } },
                    ].map(({ icon: Icon, label, color, bg, screen, params }) => (
                        <TouchableOpacity
                            key={label}
                            style={styles.quickBtn}
                            onPress={() => user ? navigation.navigate(screen, params) : navigation.navigate('Login')}
                            activeOpacity={0.72}
                        >
                            <View style={[styles.quickIconWrap, { backgroundColor: user ? bg : '#F3F4F6' }]}>
                                <Icon size={22} color={user ? color : '#C0C8D4'} weight="fill" />
                            </View>
                            <Text style={[styles.quickLabel, !user && { color: '#C0C8D4' }]}>{label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── 2×2 Category Grid ── */}
                <View style={styles.catGrid}>
                    {[CATEGORIES.slice(0, 2), CATEGORIES.slice(2, 4)].map((row, rowIdx) => (
                        <View key={rowIdx} style={styles.catRow}>
                            {row.map((cat, colIdx) => {
                                const i = rowIdx * 2 + colIdx;
                                return (
                                    <TouchableOpacity
                                        key={cat.key}
                                        style={[styles.catCard, { backgroundColor: cat.iconColor + '0E', borderColor: cat.iconColor + '30' }]}
                                        onPress={() => openSheet(cat)}
                                        activeOpacity={0.78}
                                        onLayout={e => {
                                            const h = e.nativeEvent.layout.height;
                                            if (h > 0) setCatH(prev => ({ ...prev, [cat.key]: h }));
                                        }}
                                    >
                                        {catH[cat.key] > 0 && (
                                            <BorderTrace
                                                color={cat.iconColor}
                                                cardWidth={(SCREEN_W - 32 - 10) / 2}
                                                cardHeight={catH[cat.key]}
                                                delay={i * 700}
                                                seed={i * 5 + 2}
                                            />
                                        )}
                                        {/* Left accent bar */}
                                        <View style={[styles.catAccentBar, { backgroundColor: cat.iconColor }]} />

                                        {/* Top: icon + inline title */}
                                        <View style={styles.catCardHeader}>
                                            <View style={[styles.catCardIcon, { backgroundColor: cat.iconColor + '1A' }]}>
                                                <cat.PhIcon size={28} color={cat.iconColor} weight="fill" />
                                            </View>
                                            <Text style={[styles.catCardTitle, { color: cat.iconColor }]} numberOfLines={3}>{cat.label}</Text>
                                        </View>

                                        {/* Bottom: service chips + arrow */}
                                        <View>
                                            {cat.services.map(s => (
                                                <View key={s.key} style={[styles.catBulletRow, { backgroundColor: cat.iconColor + '12' }, cat.services.length > 3 && { paddingVertical: 2, marginBottom: 2 }]}>
                                                    <View style={[styles.catBulletDot, { backgroundColor: cat.iconColor }]} />
                                                    <Text style={[styles.catBulletText, cat.services.length > 3 && { fontSize: 9, lineHeight: 12 }]} numberOfLines={1}>{s.label}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    ))}
                </View>

                {/* ── Bottom Sheet Modal ── */}
                <Modal
                    visible={!!activeCat}
                    transparent
                    animationType="none"
                    onRequestClose={closeSheet}
                    statusBarTranslucent
                >
                    <View style={styles.sheetOverlay}>
                        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: backdropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.52] }) }]} />
                        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeSheet} />
                        <Animated.View style={[styles.sheetContainer, { transform: [{ translateY: sheetAnim.interpolate({
                            inputRange: [0, 1], outputRange: [SCREEN_H * 0.76, 0],
                        }) }] }]}>
                            {activeCat && (
                                <>
                                    <View style={styles.sheetHandle} />
                                    <View style={[styles.sheetCatHeader, { backgroundColor: activeCat.iconColor + '0E' }]}>
                                        <View style={[styles.sheetCatIconWrap, { backgroundColor: activeCat.iconColor + '1A' }]}>
                                            <activeCat.PhIcon size={26} color={activeCat.iconColor} weight="fill" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.sheetCatTitle}>{activeCat.label}</Text>
                                            <Text style={styles.sheetCatSub}>{activeCat.sub}</Text>
                                        </View>
                                        <TouchableOpacity style={styles.sheetCloseBtn} onPress={closeSheet}>
                                            <Ionicons name="close" size={18} color="#6B7280" />
                                        </TouchableOpacity>
                                    </View>
                                    <ScrollView
                                        style={{ flex: 1 }}
                                        contentContainerStyle={[styles.sheetScroll, { paddingBottom: 32 + insets.bottom }]}
                                        showsVerticalScrollIndicator={false}
                                    >
                                        {activeCat.services.map(service => (
                                            <ServiceRow
                                                key={service.key}
                                                service={service}
                                                hasAccess={hasAccess(service)}
                                                onPress={() => {
                                                    closeSheet();
                                                    setTimeout(() => handleServicePress(service), 290);
                                                }}
                                            />
                                        ))}
                                    </ScrollView>
                                </>
                            )}
                        </Animated.View>
                    </View>
                </Modal>


            </View>
        </SafeAreaView>
    );
};

// ─────────────────────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F4F8' },
    safeTop: { backgroundColor: '#1C2E4A' },
    body:      { flex: 1 },

    /* ── Guest card buttons (inside miniCard) ── */
    guestCardBtnPrimary:     { backgroundColor: '#FFA726', paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20, elevation: 3, shadowColor: '#FFA726', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4 },
    guestCardBtnPrimaryText: { color: '#fff', fontSize: 12, fontWeight: '800' },
    guestCardBtnSecondary:     {},
    guestCardBtnSecondaryText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600' },

    /* ── Navbar ── */
    navbar: {
        flexDirection:    'row',
        alignItems:       'center',
        justifyContent:   'space-between',
        paddingHorizontal: 16,
        paddingVertical:   6,
        height:            100,
        backgroundColor:  'transparent',
    },
    avatarBtn: {},
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarFallback: {
        backgroundColor: '#FFA726',
        alignItems:      'center',
        justifyContent:  'center',
    },
    avatarGuest: {
        backgroundColor: '#EAECF0',
        alignItems:      'center',
        justifyContent:  'center',
    },
    avatarGuestLogo: {
        width:   24,
        height:  24,
        opacity: 0.4,
        tintColor: '#6B7280',
    },
    avatarInitial: {
        color:      '#fff',
        fontSize:   17,
        fontWeight: '700',
    },
    logoWrap: {
        flex:           1,
        alignItems:     'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    logo: {
        width:  '100%',
        height: 92,
    },
    navRight: {
        flexDirection: 'row',
        alignItems:    'center',
        gap:           6,
        flexShrink:    0,
        maxWidth:      160,
    },
    navName: {
        fontSize:   12,
        fontWeight: '700',
        color:      '#1C2E4A',
        maxWidth:   110,
    },
    bellBtn: {
        width:          40,
        height:         40,
        borderRadius:   20,
        backgroundColor: '#F3F4F6',
        alignItems:     'center',
        justifyContent: 'center',
        flexShrink:     0,
    },

    /* ── Hero Section ── */
    heroWrap: {
        marginHorizontal: 16,
        marginTop:        4,
        marginBottom:     2,
    },

    /* Mini virtual bank card */
    miniCard: {
        backgroundColor: '#1A2E48',
        borderRadius:    20,
        padding:         16,
        height:          152,
        justifyContent:  'space-between',
        overflow:        'hidden',
        shadowColor:     '#1A2E48',
        shadowOffset:    { width: 0, height: 6 },
        shadowOpacity:   0.3,
        shadowRadius:    14,
        elevation:       8,
    },
    miniCardShine: {
        position:        'absolute',
        top:             -40,
        right:           -30,
        width:           160,
        height:          160,
        borderRadius:    80,
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    miniCardTop: {
        flexDirection:  'row',
        alignItems:     'center',
        justifyContent: 'space-between',
    },
    miniCardBrand: {
        flexDirection: 'row',
        alignItems:    'center',
    },
    miniCardIcon: {
        width:  30,
        height: 30,
    },
    miniCardBrandTop: {
        color:       '#fff',
        fontSize:    12,
        fontWeight:  '900',
        letterSpacing: 1.8,
        lineHeight:  14,
    },
    miniCardBrandBot: {
        color:       'rgba(255,167,38,0.85)',
        fontSize:    9,
        fontWeight:  '700',
        letterSpacing: 2,
        lineHeight:  11,
    },
    miniCardBalLabel: {
        fontSize:    9,
        fontWeight:  '700',
        color:       'rgba(255,255,255,0.45)',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    miniCardBalValue: {
        fontSize:   26,
        fontWeight: '900',
        color:      '#fff',
        letterSpacing: 0.3,
    },
    miniCardBottom: {
        flexDirection:  'row',
        alignItems:     'center',
        justifyContent: 'space-between',
    },
    miniCardHolderLabel: {
        fontSize:     7,
        fontWeight:   '700',
        color:        'rgba(255,255,255,0.35)',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom:  1,
    },
    miniCardHolderName: {
        fontSize:     12,
        fontWeight:   '800',
        color:        'rgba(255,255,255,0.9)',
        letterSpacing: 0.8,
        maxWidth:     160,
        marginBottom:  3,
    },
    miniCardNum: {
        fontSize:    10,
        fontWeight:  '500',
        color:       'rgba(255,255,255,0.4)',
        letterSpacing: 2,
    },
    miniCardSeeMore: {
        flexDirection: 'row',
        alignItems:    'center',
        gap:           2,
    },
    miniCardSeeText: {
        fontSize:   11,
        fontWeight: '700',
        color:      'rgba(255,255,255,0.65)',
    },
    /* ── Quick Actions ── */
    quickBar: {
        flexDirection:    'row',
        justifyContent:   'space-between',
        marginHorizontal: 16,
        marginTop:        8,
        marginBottom:     2,
        backgroundColor:  '#fff',
        borderRadius:     16,
        paddingVertical:  10,
        paddingHorizontal: 8,
        borderWidth:      1,
        borderColor:      '#EAECF0',
    },
    quickBtn: {
        flex:           1,
        alignItems:     'center',
        gap:            6,
    },
    quickIconWrap: {
        width:          40,
        height:         40,
        borderRadius:   20,
        alignItems:     'center',
        justifyContent: 'center',
    },
    quickLabel: {
        fontSize:   10,
        fontWeight: '700',
        color:      '#1C2E4A',
        textAlign:  'center',
    },

    /* ── 2×2 Category Grid ── */
    catGrid: {
        flex:             1,
        gap:              8,
        marginHorizontal: 16,
        marginTop:        8,
        marginBottom:     8,
    },
    catRow: {
        flex:          1,
        flexDirection: 'row',
        gap:           8,
    },
    catCard: {
        flex:          1,
        borderRadius:  20,
        borderWidth:   1.5,
        paddingTop:    14,
        paddingBottom: 16,
        paddingLeft:   18,
        paddingRight:  10,
        overflow:      'hidden',
        gap:           8,
    },
    catAccentBar: {
        position:     'absolute',
        left:         0,
        top:          16,
        bottom:       16,
        width:        3.5,
        borderRadius: 2,
    },
    catCardHeader: {
        flexDirection: 'row',
        alignItems:    'center',
        gap:           10,
    },
    catCardIcon: {
        width:          46,
        height:         46,
        borderRadius:   14,
        alignItems:     'center',
        justifyContent: 'center',
        flexShrink:     0,
    },
    catCardTitle: {
        fontSize:   11,
        fontWeight: '800',
        lineHeight: 15,
        flex:       1,
    },
    catBulletRow: {
        flexDirection:    'row',
        alignItems:       'center',
        gap:              4,
        marginBottom:     2,
        borderRadius:     6,
        paddingVertical:  2,
        paddingHorizontal: 5,
    },
    catBulletDot: {
        width:        3.5,
        height:       3.5,
        borderRadius: 2,
        opacity:      0.85,
        flexShrink:   0,
    },
    catBulletText: {
        fontSize:   10,
        fontWeight: '700',
        color:      '#374151',
        lineHeight: 14,
        flex:       1,
    },
    catCardFooter: {
        flexDirection:  'row',
        alignItems:     'center',
        justifyContent: 'flex-end',
        marginTop:      6,
    },
    catCardCount: {
        fontSize:   10,
        fontWeight: '700',
    },
    catArrowBtn: {
        width:          22,
        height:         22,
        borderRadius:   11,
        alignItems:     'center',
        justifyContent: 'center',
    },

    /* ── Bottom Sheet ── */
    sheetOverlay: {
        flex:           1,
        justifyContent: 'flex-end',
    },
    sheetContainer: {
        backgroundColor:      '#fff',
        borderTopLeftRadius:  28,
        borderTopRightRadius: 28,
        height:               SCREEN_H * 0.6,
        shadowColor:          '#000',
        shadowOffset:         { width: 0, height: -4 },
        shadowOpacity:        0.12,
        shadowRadius:         20,
        elevation:            24,
    },
    sheetHandle: {
        width:        40,
        height:       4,
        borderRadius: 2,
        backgroundColor: '#E0E4EA',
        alignSelf:    'center',
        marginTop:    12,
        marginBottom: 4,
    },
    sheetCatHeader: {
        flexDirection:  'row',
        alignItems:     'center',
        gap:            12,
        marginHorizontal: 16,
        marginVertical: 12,
        padding:        14,
        borderRadius:   18,
    },
    sheetCatIconWrap: {
        width:          48,
        height:         48,
        borderRadius:   16,
        alignItems:     'center',
        justifyContent: 'center',
    },
    sheetCatTitle: {
        fontSize:   16,
        fontWeight: '800',
        color:      '#1C2E4A',
    },
    sheetCatSub: {
        fontSize:  11,
        color:     '#9AA3B0',
        marginTop: 2,
    },
    sheetCloseBtn: {
        width:          34,
        height:         34,
        borderRadius:   17,
        backgroundColor: '#F3F4F6',
        alignItems:     'center',
        justifyContent: 'center',
    },
    sheetScroll: {
        paddingHorizontal: 16,
        paddingBottom:     32,
        gap:               8,
    },

    /* ── Service Row (inside sheet) ── */
    serviceRow: {
        flexDirection:  'row',
        alignItems:     'center',
        borderRadius:   16,
        borderWidth:    1.5,
        padding:        14,
        gap:            12,
        shadowColor:    '#000',
        shadowOffset:   { width: 0, height: 1 },
        shadowOpacity:  0.04,
        shadowRadius:   4,
        elevation:      2,
    },
    serviceRowIcon: {
        width:          48,
        height:         48,
        borderRadius:   16,
        alignItems:     'center',
        justifyContent: 'center',
        flexShrink:     0,
    },
    serviceRowInfo: {
        flex: 1,
    },
    serviceRowLabel: {
        fontSize:    14,
        fontWeight:  '700',
        color:       '#1C2E4A',
        marginBottom: 3,
    },
    serviceRowSub: {
        fontSize:  12,
        color:     '#9AA3B0',
        lineHeight: 16,
    },
    serviceRowBadge: {
        paddingHorizontal: 9,
        paddingVertical:   4,
        borderRadius:      10,
    },
    serviceRowBadgeText: {
        fontSize:   10,
        fontWeight: '700',
    },
});

export default ServiceHubScreen;
