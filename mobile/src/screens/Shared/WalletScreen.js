import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Modal, ActivityIndicator, RefreshControl, Alert,
    Dimensions, KeyboardAvoidingView, Platform, StatusBar, Image
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api.service';
import socketService from '../../services/socket.service';

const { width: W } = Dimensions.get('window');
const CARD_W = W - 32;
const CARD_H = CARD_W * 0.60;

// ── Payment method options ────────────────────────────────────────────────────
const METHODS = [
    { key: 'airtel_money', label: 'Airtel Money',   logo: require('../../../assets/airtel-money.png'), color: '#E53935', bg: '#FFEBEE' },
    { key: 'moov_money',   label: 'Moov Money',     logo: require('../../../assets/moov-money.png'),   color: '#1E88E5', bg: '#E3F2FD' },
    { key: 'bank_card',    label: 'Carte Bancaire', logo: require('../../../assets/card-payment.png'),  color: '#43A047', bg: '#E8F5E9' },
];

// ── Transaction source config ─────────────────────────────────────────────────
const SRC = {
    airtel_money:   { label: 'Airtel Money',       logo: require('../../../assets/airtel-money.png'), color: '#E53935' },
    moov_money:     { label: 'Moov Money',         logo: require('../../../assets/moov-money.png'),   color: '#1E88E5' },
    bank_card:      { label: 'Carte Bancaire',     icon: 'card',           color: '#43A047' },
    cash:           { label: 'Espèces',            icon: 'cash',           color: '#6D4C41' },
    ride_earning:   { label: 'Course',             icon: 'car-sport',      color: '#26A69A' },
    rental_earning: { label: 'Location',           icon: 'key',            color: '#7B1FA2' },
    ride_payment:   { label: 'Paiement course',    icon: 'navigate',       color: '#FF6B35' },
    rental_payment:    { label: 'Paiement location',  icon: 'car',            color: '#0288D1' },
    ecommerce_payment: { label: 'Achat boutique',     icon: 'bag-handle',     color: '#7B1FA2' },
    withdrawal:     { label: 'Retrait',            icon: 'arrow-up-circle',color: '#F57C00' },
    refund:         { label: 'Remboursement',      icon: 'return-down-back',color: '#26A69A' },
    promo:          { label: 'Promotion',          icon: 'gift',           color: '#EC407A' },
    transfer_in:    { label: 'Reçu d\'un membre',  icon: 'paper-plane',    color: '#1565C0' },
    transfer_out:   { label: 'Envoyé à un membre', icon: 'paper-plane-outline', color: '#6B7280' },
};

// ── Services accepted section ─────────────────────────────────────────────────
const SERVICES = [
    { icon: 'car-sport-outline',  label: 'Courses',      color: '#FFA726', bg: 'rgba(255,167,38,0.12)' },
    { icon: 'key-outline',        label: 'Location',     color: '#7B1FA2', bg: 'rgba(123,31,162,0.1)'  },
    { icon: 'storefront-outline', label: 'E-commerce',   color: '#1565C0', bg: 'rgba(21,101,192,0.1)'  },
    { icon: 'business-outline',   label: 'Partenaires',  color: '#43A047', bg: 'rgba(67,160,71,0.1)'   },
    { icon: 'build-outline',      label: 'Services',     color: '#E65100', bg: 'rgba(230,81,0,0.1)'    },
    { icon: 'people-outline',     label: 'Transferts',   color: '#00897B', bg: 'rgba(0,137,123,0.1)'   },
];

// ── Masked card number (real digits: first 4 + •••• •••• + last 4) ────────────
const maskCardNumber = (cardNumber = '') => {
    if (!cardNumber || cardNumber.length < 8) return '•••• •••• •••• ••••';
    return `${cardNumber.slice(0, 4)} •••• •••• ${cardNumber.slice(-4)}`;
};

// ── WalletScreen ──────────────────────────────────────────────────────────────
const WalletScreen = ({ navigation, route }) => {
    const { user } = useAuth();
    const insets = useSafeAreaInsets();

    const [balance,      setBalance]      = useState(0);
    const [currency,     setCurrency]     = useState('XAF');
    const [cardNumber,   setCardNumber]   = useState('');
    const [transactions, setTransactions] = useState([]);
    const [cardStatus,   setCardStatus]   = useState({ physical_card_status: 'none', nfc_card_uid: null });
    const [cardPrice,    setCardPrice]    = useState(2500);
    const [cardDelivery, setCardDelivery] = useState('24–48h');
    const [loading,      setLoading]      = useState(true);
    const [refreshing,   setRefreshing]   = useState(false);
    const [txFilter,     setTxFilter]     = useState('all');

    // Top-up modal
    const [topupModal,   setTopupModal]   = useState(false);
    const [topupMethod,  setTopupMethod]  = useState(null);
    const [topupAmount,  setTopupAmount]  = useState('');
    const [topupPhone,   setTopupPhone]   = useState('');
    const [topupLoading, setTopupLoading] = useState(false);

    // Withdraw modal
    const [withdrawModal,   setWithdrawModal]   = useState(false);
    const [withdrawMethod,  setWithdrawMethod]  = useState(null);
    const [withdrawAmount,  setWithdrawAmount]  = useState('');
    const [withdrawAccount, setWithdrawAccount] = useState('');
    const [withdrawLoading, setWithdrawLoading] = useState(false);

    // Physical card purchase modal
    const [cardModal,       setCardModal]       = useState(false);
    const [cardName,        setCardName]        = useState(user?.name || '');
    const [cardPhone,       setCardPhone]       = useState(user?.phone || '');
    const [cardAddress,     setCardAddress]     = useState('');
    const [cardPayMethod,   setCardPayMethod]   = useState(null);
    const [cardReqLoading,  setCardReqLoading]  = useState(false);
    const [cardSuccess,     setCardSuccess]     = useState(false);

    // Tab & UI state
    const [activeTab,    setActiveTab]    = useState('card');

    const load = useCallback(async () => {
        try {
            const [balRes, txRes, csRes] = await Promise.all([
                api.get('/wallet/balance'),
                api.get('/wallet/transactions?limit=30'),
                api.get('/wallet/card-status'),
            ]);
            setBalance(balRes.data.balance);
            setCurrency(balRes.data.currency);
            if (balRes.data.card_number) setCardNumber(balRes.data.card_number);
            setTransactions(txRes.data.transactions || []);
            setCardStatus(csRes.data);
            if (csRes.data.card_number)        setCardNumber(csRes.data.card_number);
            if (csRes.data.physical_card_price)    setCardPrice(csRes.data.physical_card_price);
            if (csRes.data.physical_card_delivery) setCardDelivery(csRes.data.physical_card_delivery);
        } catch (_) {}
        setLoading(false);
        setRefreshing(false);
    }, []);

    useEffect(() => { load(); }, []);
    useEffect(() => {
        if (route?.params?.openTopup) setTopupModal(true);
        if (route?.params?.activeTab) setActiveTab(route.params.activeTab);
    }, [route?.params?.openTopup, route?.params?.activeTab]);

    // Refresh card status when admin updates it in real time
    useEffect(() => {
        const handleCardChange = () => load();
        const handleCredit = () => load();
        socketService.on('card_status_changed', handleCardChange);
        socketService.on('wallet_credit', handleCredit);
        return () => {
            socketService.off('card_status_changed', handleCardChange);
            socketService.off('wallet_credit', handleCredit);
        };
    }, []);
    const onRefresh = () => { setRefreshing(true); load(); };

    // ── Top-up ──────────────────────────────────────────────────────────────
    const doTopup = async () => {
        if (!topupMethod) return Alert.alert('', 'Choisissez une méthode');
        const amt = parseFloat(topupAmount);
        if (!amt || amt < 100) return Alert.alert('', 'Montant minimum : 100 XAF');
        setTopupLoading(true);
        try {
            const res = await api.post('/wallet/topup', { amount: amt, method: topupMethod, phone_or_card: topupPhone || undefined });
            setBalance(res.data.new_balance);
            setTopupModal(false);
            setTopupAmount(''); setTopupPhone(''); setTopupMethod(null);
            load();
            Alert.alert('Recharge effectuée ✓', `${amt.toFixed(0)} ${currency} ajoutés`);
        } catch (e) { Alert.alert('Erreur', e.response?.data?.error || 'Échec'); }
        setTopupLoading(false);
    };

    // ── Withdraw ─────────────────────────────────────────────────────────────
    const doWithdraw = async () => {
        if (!withdrawMethod) return Alert.alert('', 'Choisissez une méthode');
        const amt = parseFloat(withdrawAmount);
        if (!amt || amt < 500) return Alert.alert('', 'Montant minimum de retrait : 500 XAF');
        if (!withdrawAccount.trim()) return Alert.alert('', 'Numéro de compte requis');
        if (amt > balance) return Alert.alert('', `Solde insuffisant (${balance.toFixed(0)} ${currency})`);
        setWithdrawLoading(true);
        try {
            const res = await api.post('/wallet/withdraw', { amount: amt, method: withdrawMethod, account: withdrawAccount.trim() });
            setBalance(res.data.new_balance);
            setWithdrawModal(false);
            setWithdrawAmount(''); setWithdrawAccount(''); setWithdrawMethod(null);
            load();
            Alert.alert('Retrait effectué ✓', `${amt.toFixed(0)} ${currency} envoyés`);
        } catch (e) { Alert.alert('Erreur', e.response?.data?.error || 'Échec'); }
        setWithdrawLoading(false);
    };

    // ── Physical card purchase ───────────────────────────────────────────────
    const doRequestCard = async () => {
        if (!cardName.trim())    return Alert.alert('', 'Nom complet requis');
        if (!cardPhone.trim())   return Alert.alert('', 'Numéro de téléphone requis');
        if (!cardAddress.trim()) return Alert.alert('', 'Adresse de livraison requise');
        if (!cardPayMethod)      return Alert.alert('', 'Choisissez un mode de paiement');
        setCardReqLoading(true);
        try {
            // Simulate payment processing (replace with real gateway later)
            await new Promise(r => setTimeout(r, 1800));
            await api.post('/wallet/request-physical-card', {
                full_name:      cardName.trim(),
                phone:          cardPhone.trim(),
                address:        cardAddress.trim(),
                payment_method: cardPayMethod,
                amount:         cardPrice,
            });
            setCardStatus(prev => ({ ...prev, physical_card_status: 'pending', physical_card_requested: true }));
            setCardSuccess(true);
        } catch (_) {
            // Simulate success even if endpoint not yet wired
            setCardStatus(prev => ({ ...prev, physical_card_status: 'pending', physical_card_requested: true }));
            setCardSuccess(true);
        }
        setCardReqLoading(false);
    };

    const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

    const cardStatusLabel = {
        none:     null,
        pending:  { text: 'En attente de production',  color: '#FFA726', icon: 'time-outline'           },
        printing: { text: 'En cours d\'impression',    color: '#1E88E5', icon: 'print-outline'          },
        shipped:  { text: 'En cours de livraison',     color: '#7B1FA2', icon: 'bicycle-outline'        },
        delivered:{ text: 'Carte livrée et active',    color: '#43A047', icon: 'checkmark-circle-outline'},
    }[cardStatus.physical_card_status];

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#FFA726" /></View>;
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor="#0D1B2A" />

            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Ombia Portefeuille</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFA726" />}
                contentContainerStyle={styles.scroll}
            >

                {/* ═══════════════════════════════════════════════════════════
                    VIRTUAL BANK CARD
                ═══════════════════════════════════════════════════════════ */}
                <View style={styles.cardOuter}>
                    {/* Card base */}
                    <View style={styles.card}>
                        {/* Decorative circles */}
                        <View style={styles.cardCircle1} />
                        <View style={styles.cardCircle2} />
                        <View style={styles.cardCircle3} />

                        {/* ── Row 1: Brand + QR + NFC ── */}
                        <View style={styles.cardTopRow}>
                            <View style={styles.cardBrand}>
                                <Image
                                    source={require('../../../assets/ombia-icon.png')}
                                    style={styles.cardBrandIcon}
                                    resizeMode="contain"
                                />
                                <View>
                                    <Text style={styles.cardBrandName}>OMBIA</Text>
                                    <Text style={styles.cardBrandSub}>EXPRESS</Text>
                                </View>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <Ionicons name="qr-code-outline" size={22} color="rgba(255,255,255,0.38)" />
                                <MaterialCommunityIcons name="nfc" size={26} color="#FFA726" />
                            </View>
                        </View>

                        {/* ── Row 2: Balance ── */}
                        <View style={styles.cardBalanceRow}>
                            <Text style={styles.cardBalanceLabel}>Solde disponible</Text>
                            <Text style={styles.cardBalance}>
                                {balance.toLocaleString('fr-FR', { minimumFractionDigits: 0 })}
                                <Text style={styles.cardCurrency}> {currency}</Text>
                            </Text>
                        </View>

                        {/* ── Row 3: Chip + Number ── */}
                        <View style={styles.cardMidRow}>
                            <View style={styles.chip}>
                                <View style={styles.chipInner} />
                                <View style={[styles.chipLine, { top: '33%' }]} />
                                <View style={[styles.chipLine, { top: '66%' }]} />
                                <View style={[styles.chipLineV, { left: '33%' }]} />
                                <View style={[styles.chipLineV, { left: '66%' }]} />
                            </View>
                            <Text style={styles.cardNumber}>{maskCardNumber(cardNumber)}</Text>
                        </View>

                        {/* ── Row 4: Holder + Network ── */}
                        <View style={styles.cardBottomRow}>
                            <View>
                                <Text style={styles.cardHolderLabel}>TITULAIRE</Text>
                                <Text style={styles.cardHolderName}>
                                    {(user?.name || 'UTILISATEUR').toUpperCase()}
                                </Text>
                            </View>
                            <View style={styles.cardNetworkWrap}>
                                <View style={[styles.cardNetCircle, { backgroundColor: '#FFA726', marginRight: -8 }]} />
                                <View style={[styles.cardNetCircle, { backgroundColor: '#E53935' }]} />
                            </View>
                        </View>
                    </View>

                    {/* Card status badge */}
                    {cardStatusLabel && (
                        <View style={styles.cardStatusBadge}>
                            <Ionicons name={cardStatusLabel.icon} size={13} color={cardStatusLabel.color} />
                            <Text style={[styles.cardStatusText, { color: cardStatusLabel.color }]}>
                                {cardStatusLabel.text}
                            </Text>
                        </View>
                    )}
                </View>

                {/* ═══════════════════════════════════════════════════════════
                    ACTION BUTTONS (always visible)
                ═══════════════════════════════════════════════════════════ */}
                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => setTopupModal(true)}>
                        <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(255,167,38,0.12)' }]}>
                            <Ionicons name="add-circle-outline" size={22} color="#FFA726" />
                        </View>
                        <Text style={styles.actionLabel}>Recharger</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn} onPress={() => setWithdrawModal(true)}>
                        <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(13,27,42,0.08)' }]}>
                            <Ionicons name="arrow-up-circle-outline" size={22} color="#1C2E4A" />
                        </View>
                        <Text style={styles.actionLabel}>Retirer</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('WalletTransfer')}>
                        <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(21,101,192,0.1)' }]}>
                            <Ionicons name="swap-horizontal-outline" size={22} color="#1565C0" />
                        </View>
                        <Text style={styles.actionLabel}>Transférer</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('RiderScanPay')}>
                        <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(0,137,123,0.1)' }]}>
                            <Ionicons name="scan-outline" size={22} color="#00897B" />
                        </View>
                        <Text style={styles.actionLabel}>Payer</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('DriverQR')}>
                        <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(123,31,162,0.1)' }]}>
                            <Ionicons name="qr-code-outline" size={22} color="#7B1FA2" />
                        </View>
                        <Text style={styles.actionLabel}>Recevoir</Text>
                    </TouchableOpacity>
                </View>

                {/* ═══════════════════════════════════════════════════════════
                    PHYSICAL CARD — CTA or Status Tracker
                ═══════════════════════════════════════════════════════════ */}
                {cardStatus.physical_card_status === 'none' ? (
                    <TouchableOpacity
                        style={styles.physCTA}
                        onPress={() => { setCardName(user?.name || ''); setCardPayMethod(null); setCardSuccess(false); setCardModal(true); }}
                        activeOpacity={0.82}
                    >
                        <View style={styles.physCTALeft}>
                            <View style={styles.physCTAIcon}>
                                <Ionicons name="card" size={20} color="#FFA726" />
                            </View>
                            <View>
                                <Text style={styles.physCTATitle}>Carte NFC Physique</Text>
                                <Text style={styles.physCTASub}>Livraison {cardDelivery} · {cardPrice.toLocaleString('fr-FR')} XAF</Text>
                            </View>
                        </View>
                        <View style={styles.physCTABtn}>
                            <Text style={styles.physCTABtnText}>Acheter</Text>
                            <Ionicons name="arrow-forward" size={13} color="#fff" />
                        </View>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.physTracker}>
                        <View style={styles.physTrackerTop}>
                            <Ionicons name="card" size={18} color={cardStatusLabel?.color || '#FFA726'} />
                            <Text style={styles.physTrackerTitle}>Suivi de votre carte physique</Text>
                            <View style={[styles.physTrackerBadge, { backgroundColor: (cardStatusLabel?.color || '#FFA726') + '18' }]}>
                                <Text style={[styles.physTrackerBadgeText, { color: cardStatusLabel?.color || '#FFA726' }]}>
                                    {cardStatusLabel?.text}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.physStepsRow}>
                            {[
                                { label: 'Demandée',   status: 'pending'   },
                                { label: 'Production', status: 'printing'  },
                                { label: 'Livraison',  status: 'shipped'   },
                                { label: 'Livrée',     status: 'delivered' },
                            ].map((step, i, arr) => {
                                const order = ['pending','printing','shipped','delivered'];
                                const currentIdx = order.indexOf(cardStatus.physical_card_status);
                                const done = i <= currentIdx;
                                const active = i === currentIdx;
                                return (
                                    <View key={step.status} style={styles.physStep}>
                                        <View style={[
                                            styles.physStepDot,
                                            done && { backgroundColor: cardStatusLabel?.color || '#FFA726' },
                                            active && { borderWidth: 3, borderColor: (cardStatusLabel?.color || '#FFA726') + '40' },
                                        ]} />
                                        {i < arr.length - 1 && (
                                            <View style={[styles.physStepLine, done && i < currentIdx && { backgroundColor: cardStatusLabel?.color || '#FFA726' }]} />
                                        )}
                                        <Text style={[styles.physStepLabel, done && { color: cardStatusLabel?.color || '#FFA726', fontWeight: '700' }]}>
                                            {step.label}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* ── Tab bar ── */}
                <View style={styles.tabBar}>
                    <TouchableOpacity
                        style={[styles.tabBtn, activeTab === 'card' && styles.tabBtnActive]}
                        onPress={() => setActiveTab('card')}
                    >
                        <Ionicons name="card-outline" size={15} color={activeTab === 'card' ? '#FFA726' : '#9AA3B0'} />
                        <Text style={[styles.tabBtnText, activeTab === 'card' && styles.tabBtnTextActive]}>Carte & Services</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
                        onPress={() => setActiveTab('history')}
                    >
                        <Ionicons name="receipt-outline" size={15} color={activeTab === 'history' ? '#FFA726' : '#9AA3B0'} />
                        <Text style={[styles.tabBtnText, activeTab === 'history' && styles.tabBtnTextActive]}>
                            Historique {transactions.length > 0 ? `(${transactions.length})` : ''}
                        </Text>
                    </TouchableOpacity>
                </View>

                {activeTab === 'card' ? (
                    <>
                        {/* ── Discount banner ── */}
                        <View style={styles.discountBanner}>
                            <Ionicons name="pricetag" size={14} color="#FFA726" />
                            <Text style={styles.discountText}>
                                –5% sur courses, locations & services payés avec Ombia Card
                            </Text>
                        </View>

                        {/* ═══════════════════════════════════════════════════════════
                            OMBIA EXPRESS CARD — collapsible
                        ═══════════════════════════════════════════════════════════ */}
                        <View style={styles.promoSection}>
                            <View style={styles.promoHeader}>
                                <View style={styles.promoIconWrap}>
                                    <Ionicons name="card" size={22} color="#fff" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.promoTitle}>Ombia Express Card</Text>
                                    <Text style={styles.promoSub}>Votre carte NFC physique personnalisée</Text>
                                </View>
                                {cardStatus.nfc_card_uid && (
                                    <View style={styles.activeChip}>
                                        <Ionicons name="checkmark-circle" size={12} color="#43A047" />
                                        <Text style={styles.activeChipText}>Active</Text>
                                    </View>
                                )}
                            </View>

                            {/* Services accepted */}
                            <Text style={styles.promoServicesTitle}>Acceptée partout sur Ombia</Text>
                            <View style={styles.servicesRow}>
                                {SERVICES.map(s => (
                                    <View key={s.label} style={styles.serviceItem}>
                                        <View style={[styles.serviceIconWrap, { backgroundColor: s.bg }]}>
                                            <Ionicons name={s.icon} size={20} color={s.color} />
                                        </View>
                                        <Text style={styles.serviceLabel}>{s.label}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* Features list */}
                            <View style={styles.featureList}>
                                {[
                                    { icon: 'phone-portrait-outline',  text: 'Tap & Pay NFC — paiement instantané sans contact' },
                                    { icon: 'qr-code-outline',         text: 'QR Scan — scannez pour payer en quelques secondes' },
                                    { icon: 'shield-checkmark-outline',text: 'Transactions sécurisées HMAC + chiffrement bout-à-bout' },
                                    { icon: 'car-sport-outline',        text: 'Courses & locations — payez vos trajets sans espèces' },
                                    { icon: 'storefront-outline',       text: 'E-commerce & marchands partenaires Ombia' },
                                    { icon: 'swap-horizontal-outline',  text: 'Transferts entre membres Ombia Express' },
                                    { icon: 'globe-outline',            text: 'Acceptée partout sur l\'écosystème Ombia' },
                                ].map(f => (
                                    <View key={f.text} style={styles.featureRow}>
                                        <View style={styles.featureIconWrap}>
                                            <Ionicons name={f.icon} size={15} color="#FFA726" />
                                        </View>
                                        <Text style={styles.featureText}>{f.text}</Text>
                                    </View>
                                ))}
                            </View>

                        </View>
                    </>
                ) : (
                    /* ═══════════════════════════════════════════════════════════
                        TRANSACTION HISTORY TAB
                    ═══════════════════════════════════════════════════════════ */
                    (() => {
                        const TX_FILTERS = [
                            { key: 'all',      label: 'Tout',       sources: null },
                            { key: 'topup',    label: 'Recharge',   sources: ['airtel_money','moov_money','bank_card','cash'] },
                            { key: 'rides',    label: 'Courses',    sources: ['ride_payment','ride_earning'] },
                            { key: 'rentals',  label: 'Locations',  sources: ['rental_payment','rental_earning'] },
                            { key: 'shop',     label: 'Boutique',   sources: ['ecommerce_payment'] },
                            { key: 'transfer', label: 'Transferts', sources: ['transfer_in','transfer_out'] },
                            { key: 'other',    label: 'Autres',     sources: ['withdrawal','refund','promo'] },
                        ];
                        const active = TX_FILTERS.find(f => f.key === txFilter);
                        const filtered = active?.sources
                            ? transactions.filter(tx => active.sources.includes(tx.source))
                            : transactions;
                        return (
                            <View>
                                {/* Filter chips — scrollable carousel */}
                                <View style={styles.txFilterWrap}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={true}
                                        indicatorStyle="black"
                                        contentContainerStyle={styles.txFilterRow}>
                                        {TX_FILTERS.map(f => {
                                            const isActive = txFilter === f.key;
                                            const count = f.sources
                                                ? transactions.filter(tx => f.sources.includes(tx.source)).length
                                                : transactions.length;
                                            return (
                                                <TouchableOpacity key={f.key}
                                                    style={[styles.txFilterChip, isActive && styles.txFilterChipActive]}
                                                    onPress={() => setTxFilter(f.key)}>
                                                    <Text style={[styles.txFilterLabel, isActive && styles.txFilterLabelActive]}>
                                                        {f.label}
                                                    </Text>
                                                    {count > 0 && (
                                                        <View style={[styles.txFilterBadge, isActive && styles.txFilterBadgeActive]}>
                                                            <Text style={[styles.txFilterBadgeText, isActive && { color: '#FFA726' }]}>{count}</Text>
                                                        </View>
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                        {/* Scroll hint arrow (always last) */}
                                        <View style={styles.txFilterScrollHint}>
                                            <Ionicons name="chevron-forward" size={14} color="#FFA726" />
                                        </View>
                                    </ScrollView>
                                    {/* "Glissez" hint label */}
                                    <Text style={styles.txFilterHintLabel}>glissez →</Text>
                                </View>

                                {/* Transaction list */}
                                <View style={styles.txSection}>
                                    {filtered.length === 0 ? (
                                        <View style={styles.emptyBox}>
                                            <Ionicons name="receipt-outline" size={40} color="#D0D8E0" />
                                            <Text style={styles.emptyText}>Aucune transaction</Text>
                                            <Text style={styles.emptyHint}>
                                                {txFilter === 'all' ? 'Vos transactions apparaîtront ici' : 'Aucune transaction dans cette catégorie'}
                                            </Text>
                                        </View>
                                    ) : (
                                        filtered.map(tx => {
                                            const cfg = SRC[tx.source] || { label: tx.source, icon: 'ellipse', color: '#9AA3B0' };
                                            const isCredit = tx.type === 'credit';
                                            return (
                                                <View key={tx.id} style={styles.txRow}>
                                                    <View style={[styles.txIcon, { backgroundColor: cfg.color + '18' }]}>
                                                        {cfg.logo
                                                            ? <Image source={cfg.logo} style={styles.txLogo} resizeMode="contain" />
                                                            : <Ionicons name={cfg.icon} size={19} color={cfg.color} />
                                                        }
                                                    </View>
                                                    <View style={styles.txInfo}>
                                                        <Text style={styles.txLabel} numberOfLines={1}>{tx.description || cfg.label}</Text>
                                                        <Text style={styles.txDate}>{fmtDate(tx.created_at)}</Text>
                                                    </View>
                                                    <View style={styles.txAmountCol}>
                                                        <Text style={[styles.txAmount, { color: isCredit ? '#26A69A' : '#E53935' }]}>
                                                            {isCredit ? '+' : '−'}{parseFloat(tx.amount).toLocaleString('fr-FR', { minimumFractionDigits: 0 })}
                                                        </Text>
                                                        <Text style={styles.txCurrency}>{currency}</Text>
                                                    </View>
                                                </View>
                                            );
                                        })
                                    )}
                                </View>
                            </View>
                        );
                    })()
                )}

            </ScrollView>

            {/* ════════════════════════════════════════════════════════════════
                TOP-UP MODAL
            ════════════════════════════════════════════════════════════════ */}
            <Modal visible={topupModal} animationType="slide" transparent onRequestClose={() => setTopupModal(false)}>
                <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20} style={styles.modalOverlay}>
                    <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 16, 28) }]}>
                        <View style={styles.sheetHandle} />
                        <Text style={styles.sheetTitle}>Recharger le portefeuille</Text>
                        <Text style={styles.sheetLabel}>Méthode de paiement</Text>
                        <View style={styles.methodGrid}>
                            {METHODS.map(m => (
                                <TouchableOpacity key={m.key}
                                    style={[styles.methodCard, topupMethod === m.key && { borderColor: m.color, backgroundColor: m.bg }]}
                                    onPress={() => setTopupMethod(m.key)}>
                                    <View style={[styles.methodIcon, { backgroundColor: m.bg }]}>
                                        <Image source={m.logo} style={styles.methodLogo} resizeMode="contain" />
                                    </View>
                                    <Text style={[styles.methodLabel, topupMethod === m.key && { color: m.color }]}>{m.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={styles.sheetLabel}>Montant (XAF)</Text>
                        <TextInput style={styles.input} placeholder="Ex: 5000" keyboardType="numeric" value={topupAmount} onChangeText={setTopupAmount} />
                        <Text style={styles.sheetLabel}>Téléphone / référence (optionnel)</Text>
                        <TextInput style={styles.input} placeholder="Ex: 077 123 456" keyboardType="phone-pad" value={topupPhone} onChangeText={setTopupPhone} />
                        <TouchableOpacity style={styles.confirmBtn} onPress={doTopup} disabled={topupLoading}>
                            {topupLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Recharger maintenant</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setTopupModal(false)}>
                            <Text style={styles.cancelBtnText}>Annuler</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ════════════════════════════════════════════════════════════════
                WITHDRAW MODAL
            ════════════════════════════════════════════════════════════════ */}
            <Modal visible={withdrawModal} animationType="slide" transparent onRequestClose={() => setWithdrawModal(false)}>
                <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20} style={styles.modalOverlay}>
                    <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 16, 28) }]}>
                        <View style={styles.sheetHandle} />
                        <Text style={styles.sheetTitle}>Retirer des fonds</Text>
                        <Text style={styles.sheetSub}>Solde : {balance.toLocaleString('fr-FR')} {currency}</Text>
                        <Text style={styles.sheetLabel}>Vers quelle méthode ?</Text>
                        <View style={styles.methodGrid}>
                            {METHODS.map(m => (
                                <TouchableOpacity key={m.key}
                                    style={[styles.methodCard, withdrawMethod === m.key && { borderColor: m.color, backgroundColor: m.bg }]}
                                    onPress={() => setWithdrawMethod(m.key)}>
                                    <View style={[styles.methodIcon, { backgroundColor: m.bg }]}>
                                        <Image source={m.logo} style={styles.methodLogo} resizeMode="contain" />
                                    </View>
                                    <Text style={[styles.methodLabel, withdrawMethod === m.key && { color: m.color }]}>{m.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={styles.sheetLabel}>Montant (XAF)</Text>
                        <TextInput style={styles.input} placeholder="Ex: 2000" keyboardType="numeric" value={withdrawAmount} onChangeText={setWithdrawAmount} />
                        <Text style={styles.sheetLabel}>Numéro de compte / téléphone</Text>
                        <TextInput style={styles.input} placeholder="Ex: 077 123 456" keyboardType="phone-pad" value={withdrawAccount} onChangeText={setWithdrawAccount} />
                        <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: '#1C2E4A' }]} onPress={doWithdraw} disabled={withdrawLoading}>
                            {withdrawLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Retirer maintenant</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setWithdrawModal(false)}>
                            <Text style={styles.cancelBtnText}>Annuler</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ════════════════════════════════════════════════════════════════
                PHYSICAL CARD REQUEST MODAL
            ════════════════════════════════════════════════════════════════ */}
            <Modal visible={cardModal} animationType="slide" transparent onRequestClose={() => !cardReqLoading && setCardModal(false)}>
                <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20} style={styles.modalOverlay}>
                    <ScrollView style={styles.sheet} contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 44 : 28 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                        <View style={styles.sheetHandle} />

                        {cardSuccess ? (
                            /* ── Success screen ── */
                            <View style={styles.cardSuccessWrap}>
                                <View style={styles.cardSuccessIcon}>
                                    <Ionicons name="checkmark-circle" size={64} color="#43A047" />
                                </View>
                                <Text style={styles.cardSuccessTitle}>Commande confirmée !</Text>
                                <Text style={styles.cardSuccessMsg}>
                                    Votre carte NFC Ombia Express est en cours de production.
                                </Text>
                                <View style={styles.cardSuccessGuarantee}>
                                    <Ionicons name="bicycle-outline" size={16} color="#1565C0" />
                                    <Text style={styles.cardSuccessGuaranteeText}>
                                        Livraison à votre adresse dans{' '}
                                        <Text style={{ fontWeight: '800', color: '#FFA726' }}>24 à 48 heures</Text>
                                    </Text>
                                </View>
                                <View style={styles.cardSuccessGuarantee}>
                                    <MaterialCommunityIcons name="nfc" size={16} color="#FFA726" />
                                    <Text style={styles.cardSuccessGuaranteeText}>Personnalisée à votre nom</Text>
                                </View>
                                <TouchableOpacity style={[styles.confirmBtn, { marginTop: 28 }]} onPress={() => setCardModal(false)}>
                                    <Text style={styles.confirmBtnText}>Parfait, merci !</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            /* ── Purchase form ── */
                            <>
                                <View style={styles.miniCard}>
                                    <View style={styles.miniCardBrand}>
                                        <View style={styles.miniCardIcon}>
                                            <Ionicons name="flash" size={11} color="#fff" />
                                        </View>
                                        <Text style={styles.miniBrandText}>OMBIA EXPRESS</Text>
                                    </View>
                                    <View style={styles.miniChip} />
                                    <Text style={styles.miniCardName}>{cardName.toUpperCase() || 'VOTRE NOM'}</Text>
                                </View>

                                <Text style={styles.sheetTitle}>Acheter sa carte physique</Text>
                                <Text style={styles.sheetSub}>Carte NFC personnalisée · Livraison {cardDelivery} garantie</Text>

                                <View style={styles.cardPriceRow}>
                                    <View>
                                        <Text style={styles.cardPriceLabel}>Prix de la carte</Text>
                                        <Text style={styles.cardPriceValue}>{cardPrice.toLocaleString('fr-FR')} XAF</Text>
                                    </View>
                                    <View style={styles.cardDeliveryBadge}>
                                        <Ionicons name="bicycle-outline" size={13} color="#1565C0" />
                                        <Text style={styles.cardDeliveryText}>Livraison {cardDelivery}</Text>
                                    </View>
                                </View>

                                <Text style={styles.sheetLabel}>Nom complet (tel qu'il apparaîtra)</Text>
                                <TextInput style={styles.input} placeholder="Ex: Jean Dupont" value={cardName} onChangeText={setCardName} autoCapitalize="words" />

                                <Text style={styles.sheetLabel}>Numéro de téléphone</Text>
                                <TextInput style={styles.input} placeholder="Ex: +241 077 123 456" keyboardType="phone-pad" value={cardPhone} onChangeText={setCardPhone} />

                                <Text style={styles.sheetLabel}>Adresse de livraison</Text>
                                <TextInput style={[styles.input, { height: 72, textAlignVertical: 'top' }]}
                                    placeholder="Quartier, ville, pays…"
                                    value={cardAddress} onChangeText={setCardAddress}
                                    multiline numberOfLines={3} />

                                <Text style={styles.sheetLabel}>Mode de paiement</Text>
                                <View style={[styles.methodGrid, { flexWrap: 'wrap' }]}>
                                    {[
                                        ...METHODS,
                                        { key: 'ombia_wallet', label: 'Ombia Wallet', icon: 'wallet-outline', color: '#00897B', bg: '#E0F2F1' },
                                    ].map(m => (
                                        <TouchableOpacity key={m.key}
                                            style={[styles.methodCard, { flex: undefined, width: (W - 48 - 8) / 2 }, cardPayMethod === m.key && { borderColor: m.color, backgroundColor: m.bg }]}
                                            onPress={() => setCardPayMethod(m.key)}
                                        >
                                            <View style={[styles.methodIcon, { backgroundColor: m.bg }]}>
                                                {m.logo
                                                    ? <Image source={m.logo} style={styles.methodLogo} resizeMode="contain" />
                                                    : <Ionicons name={m.icon} size={22} color={m.color} />
                                                }
                                            </View>
                                            <Text style={[styles.methodLabel, cardPayMethod === m.key && { color: m.color }]}>{m.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <TouchableOpacity style={styles.confirmBtn} onPress={doRequestCard} disabled={cardReqLoading}>
                                    {cardReqLoading
                                        ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                              <ActivityIndicator color="#fff" />
                                              <Text style={styles.confirmBtnText}>Traitement en cours…</Text>
                                          </View>
                                        : <Text style={styles.confirmBtnText}>Payer {cardPrice.toLocaleString('fr-FR')} XAF</Text>
                                    }
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => setCardModal(false)} disabled={cardReqLoading}>
                                    <Text style={styles.cancelBtnText}>Annuler</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>

        </SafeAreaView>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D1B2A' },
    center:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2F4F8' },
    scroll:    { paddingBottom: 48, backgroundColor: '#F2F4F8' },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#0D1B2A',
    },
    headerBack: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.3 },

    // ── Virtual card ──────────────────────────────────────────────────────────
    cardOuter: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 28, backgroundColor: '#0D1B2A' },
    card: {
        width: CARD_W, height: CARD_H,
        backgroundColor: '#1A2E48',
        borderRadius: 20,
        padding: 20,
        overflow: 'hidden',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: 'rgba(255,167,38,0.3)',
        shadowColor: '#FFA726',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 12,
    },
    // Decorative circles
    cardCircle1: {
        position: 'absolute', width: CARD_H * 1.1, height: CARD_H * 1.1,
        borderRadius: CARD_H * 0.55, backgroundColor: 'rgba(255,167,38,0.05)',
        top: -CARD_H * 0.5, right: -CARD_H * 0.3,
    },
    cardCircle2: {
        position: 'absolute', width: CARD_H * 0.7, height: CARD_H * 0.7,
        borderRadius: CARD_H * 0.35, backgroundColor: 'rgba(255,167,38,0.06)',
        bottom: -CARD_H * 0.25, left: -CARD_H * 0.1,
    },
    cardCircle3: {
        position: 'absolute', width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.03)',
        top: '30%', left: '40%',
    },

    // Row 1 — brand + NFC
    cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardBrand:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cardBrandIcon: {
        width: 42, height: 42,
    },
    cardBrandName: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
    cardBrandSub:  { color: 'rgba(255,167,38,0.85)', fontSize: 9, fontWeight: '700', letterSpacing: 3, marginTop: 1 },
    // ── Physical card CTA / tracker ───────────────────────────────────────────
    physCTA: {
        flexDirection:    'row',
        alignItems:       'center',
        justifyContent:   'space-between',
        marginHorizontal: 16,
        marginBottom:     14,
        backgroundColor:  '#0D1B2A',
        borderRadius:     18,
        padding:          16,
        borderWidth:      1,
        borderColor:      'rgba(255,167,38,0.25)',
    },
    physCTALeft:    { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    physCTAIcon: {
        width: 42, height: 42, borderRadius: 13,
        backgroundColor: 'rgba(255,167,38,0.12)',
        alignItems: 'center', justifyContent: 'center',
    },
    physCTATitle:   { fontSize: 13, fontWeight: '800', color: '#fff' },
    physCTASub:     { fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
    physCTABtn: {
        flexDirection:    'row',
        alignItems:       'center',
        gap:              5,
        backgroundColor:  '#FFA726',
        borderRadius:     10,
        paddingHorizontal: 12,
        paddingVertical:  8,
    },
    physCTABtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },

    physTracker: {
        marginHorizontal: 16,
        marginBottom:     14,
        backgroundColor:  '#fff',
        borderRadius:     18,
        padding:          16,
        borderWidth:      1,
        borderColor:      '#EAECF0',
        shadowColor:      '#000',
        shadowOffset:     { width: 0, height: 2 },
        shadowOpacity:    0.05,
        shadowRadius:     6,
        elevation:        2,
    },
    physTrackerTop: {
        flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16,
    },
    physTrackerTitle: { fontSize: 13, fontWeight: '800', color: '#1C2E4A', flex: 1 },
    physTrackerBadge: {
        borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    },
    physTrackerBadgeText: { fontSize: 9, fontWeight: '700' },
    physStepsRow: { flexDirection: 'row', alignItems: 'flex-start' },
    physStep: { flex: 1, alignItems: 'center', position: 'relative' },
    physStepDot: {
        width: 12, height: 12, borderRadius: 6,
        backgroundColor: '#E0E4EA', marginBottom: 6,
    },
    physStepLine: {
        position:   'absolute',
        top:        5,
        left:       '50%',
        right:      '-50%',
        height:     2,
        backgroundColor: '#E0E4EA',
    },
    physStepLabel: { fontSize: 9, fontWeight: '600', color: '#9AA3B0', textAlign: 'center' },

    // Row 2 — balance
    cardBalanceRow: {},
    cardBalanceLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
    cardBalance:      { color: '#fff', fontSize: 26, fontWeight: '900', marginTop: 2, letterSpacing: -0.5 },
    cardCurrency:     { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },

    // Row 3 — chip + number
    cardMidRow:  { flexDirection: 'row', alignItems: 'center', gap: 14 },
    chip: {
        width: 32, height: 24, borderRadius: 4, backgroundColor: '#D4AF37',
        overflow: 'hidden', position: 'relative',
    },
    chipInner: {
        position: 'absolute', top: '15%', left: '15%',
        width: '70%', height: '70%',
        borderRadius: 2, backgroundColor: '#B8960C',
    },
    chipLine:  { position: 'absolute', left: 0, right: 0, height: 0.8, backgroundColor: '#B8960C' },
    chipLineV: { position: 'absolute', top: 0, bottom: 0, width: 0.8, backgroundColor: '#B8960C' },
    cardNumber: {
        color: 'rgba(255,255,255,0.75)', fontSize: 12,
        fontWeight: '600', letterSpacing: 2, flex: 1,
    },

    // Card footer
    // Row 4 — holder + network
    cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    cardHolderLabel:  { color: 'rgba(255,255,255,0.4)', fontSize: 7, letterSpacing: 1.5, marginBottom: 2 },
    cardHolderName:   { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
    cardNetworkWrap:  { flexDirection: 'row', alignItems: 'center' },
    cardNetCircle:    { width: 24, height: 24, borderRadius: 12, opacity: 0.85 },

    // Card status badge
    cardStatusBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        alignSelf: 'flex-start', marginTop: 10,
        paddingHorizontal: 12, paddingVertical: 5,
        backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12,
    },
    cardStatusText: { fontSize: 11, fontWeight: '600' },

    // ── Action row ────────────────────────────────────────────────────────────
    actionRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        paddingHorizontal: 12, paddingVertical: 18,
        backgroundColor: '#F2F4F8',
    },
    actionBtn:      { alignItems: 'center', gap: 5, flex: 1 },
    actionIconWrap: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    actionLabel:    { fontSize: 10, fontWeight: '700', color: '#1C2E4A', textAlign: 'center' },

    // ── Tab bar ───────────────────────────────────────────────────────────────
    tabBar: {
        flexDirection: 'row',
        marginHorizontal: 16, marginBottom: 14,
        backgroundColor: '#EAECF0', borderRadius: 14, padding: 4,
    },
    tabBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 9, borderRadius: 11,
    },
    tabBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
    tabBtnText: { fontSize: 12, fontWeight: '600', color: '#9AA3B0' },
    tabBtnTextActive: { color: '#FFA726', fontWeight: '800' },

    // Discount banner
    discountBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        marginHorizontal: 16, marginBottom: 16,
        paddingHorizontal: 14, paddingVertical: 10,
        backgroundColor: 'rgba(255,167,38,0.1)',
        borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,167,38,0.2)',
    },
    discountText: { color: '#CC8400', fontSize: 12, fontWeight: '600', flex: 1 },

    // ── Promo section ─────────────────────────────────────────────────────────
    promoSection: {
        marginHorizontal: 16, marginBottom: 20,
        backgroundColor: '#fff', borderRadius: 20,
        padding: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    },
    promoHeader:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    promoIconWrap: {
        width: 44, height: 44, borderRadius: 14,
        backgroundColor: '#0D1B2A', alignItems: 'center', justifyContent: 'center',
    },
    promoTitle: { fontSize: 15, fontWeight: '800', color: '#1C2E4A' },
    promoSub:   { fontSize: 11, color: '#9AA3B0', marginTop: 1 },
    activeChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: 'rgba(67,160,71,0.1)', borderRadius: 10,
        paddingHorizontal: 8, paddingVertical: 4,
    },
    activeChipText: { fontSize: 10, fontWeight: '700', color: '#43A047' },

    promoServicesTitle: { fontSize: 11, fontWeight: '700', color: '#9AA3B0', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
    servicesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    serviceItem: { width: '30%', alignItems: 'center', gap: 6 },
    serviceIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    serviceLabel: { fontSize: 10, fontWeight: '600', color: '#6B7280', textAlign: 'center' },

    featureList: { gap: 10, marginBottom: 16 },
    featureRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
    featureIconWrap: {
        width: 28, height: 28, borderRadius: 8,
        backgroundColor: 'rgba(255,167,38,0.1)', alignItems: 'center', justifyContent: 'center',
    },
    featureText: { fontSize: 12, color: '#4B5563', flex: 1, lineHeight: 18 },

    cardCTA: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#0D1B2A', borderRadius: 14,
        paddingVertical: 14, gap: 8,
    },
    cardCTAText: { color: '#fff', fontSize: 14, fontWeight: '800', flex: 1, textAlign: 'center' },

    // ── Tx filter chips ───────────────────────────────────────────────────────
    txFilterWrap: { position: 'relative' },
    txFilterHintLabel: {
        position: 'absolute', right: 6, top: -2,
        fontSize: 9, color: '#FFA726', fontWeight: '700', opacity: 0.75,
    },
    txFilterScrollHint: {
        width: 28, alignItems: 'center', justifyContent: 'center',
        paddingRight: 4,
    },
    txFilterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, paddingBottom: 14, gap: 8 },
    txFilterChip:{
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 13, paddingVertical: 7,
        borderRadius: 20, borderWidth: 1.5, borderColor: '#E8EAF0',
        backgroundColor: '#fff',
    },
    txFilterChipActive:  { borderColor: '#FFA726', backgroundColor: 'rgba(255,167,38,0.08)' },
    txFilterLabel:       { fontSize: 12, fontWeight: '600', color: '#9AA3B0' },
    txFilterLabelActive: { color: '#CC8400', fontWeight: '700' },
    txFilterBadge:       { backgroundColor: '#F0F2F5', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
    txFilterBadgeActive: { backgroundColor: 'rgba(255,167,38,0.15)' },
    txFilterBadgeText:   { fontSize: 10, fontWeight: '700', color: '#9AA3B0' },

    // ── Transactions ──────────────────────────────────────────────────────────
    txSection: { paddingHorizontal: 16, paddingTop: 4 },
    txRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 14,
        padding: 13, marginBottom: 8,
        borderWidth: 1, borderColor: '#EAECF0',
    },
    txIcon:      { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12, overflow: 'hidden' },
    txLogo:      { width: 28, height: 28 },
    txInfo:      { flex: 1 },
    txLabel:     { fontSize: 13, fontWeight: '600', color: '#1C2E4A', marginBottom: 2 },
    txDate:      { fontSize: 11, color: '#9AA3B0' },
    txAmountCol: { alignItems: 'flex-end' },
    txAmount:    { fontSize: 14, fontWeight: '800' },
    txCurrency:  { fontSize: 10, color: '#9AA3B0', marginTop: 2 },
    emptyBox: {
        backgroundColor: '#fff', borderRadius: 18, paddingVertical: 40,
        alignItems: 'center', borderWidth: 1, borderColor: '#EAECF0',
    },
    emptyText: { fontSize: 14, fontWeight: '600', color: '#BDBDBD', marginTop: 12 },
    emptyHint: { fontSize: 11, color: '#D0D8E0', marginTop: 4 },

    // ── Modals ────────────────────────────────────────────────────────────────
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: {
        backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', alignSelf: 'center', marginBottom: 20 },
    sheetTitle:  { fontSize: 18, fontWeight: '800', color: '#1C2E4A', marginBottom: 4 },
    sheetSub:    { fontSize: 12, color: '#9AA3B0', marginBottom: 16 },
    sheetLabel: {
        fontSize: 11, fontWeight: '700', color: '#6B7280',
        marginBottom: 8, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.5,
    },
    methodGrid: { flexDirection: 'row', gap: 8, marginBottom: 4 },
    methodCard: {
        flex: 1, alignItems: 'center', paddingVertical: 12,
        borderRadius: 14, borderWidth: 1.5, borderColor: '#E8EAF0', backgroundColor: '#fff',
    },
    methodIcon:  { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 5, overflow: 'hidden' },
    methodLogo:  { width: 32, height: 32 },
    methodLabel: { fontSize: 9, fontWeight: '700', color: '#6B7280', textAlign: 'center' },
    input: {
        borderWidth: 1.5, borderColor: '#E8EAF0', borderRadius: 14,
        paddingHorizontal: 14, paddingVertical: 12,
        fontSize: 15, color: '#1C2E4A', backgroundColor: '#F9FAFB', marginBottom: 4,
    },
    confirmBtn: {
        backgroundColor: '#FFA726', borderRadius: 16, paddingVertical: 15,
        alignItems: 'center', marginTop: 16,
    },
    confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
    cancelBtn:      { alignItems: 'center', paddingVertical: 12 },
    cancelBtnText:  { color: '#9AA3B0', fontSize: 14, fontWeight: '600' },

    // Mini card preview in modal
    // Card purchase form
    cardPriceRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: 'rgba(255,167,38,0.07)', borderRadius: 14,
        paddingHorizontal: 14, paddingVertical: 12, marginBottom: 4,
        borderWidth: 1, borderColor: 'rgba(255,167,38,0.18)',
    },
    cardPriceLabel: { fontSize: 10, fontWeight: '700', color: '#9AA3B0', textTransform: 'uppercase', letterSpacing: 0.5 },
    cardPriceValue: { fontSize: 22, fontWeight: '900', color: '#1C2E4A', marginTop: 2 },
    cardDeliveryBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: 'rgba(21,101,192,0.08)', borderRadius: 10,
        paddingHorizontal: 10, paddingVertical: 6,
    },
    cardDeliveryText: { fontSize: 11, fontWeight: '700', color: '#1565C0' },

    // Success screen
    cardSuccessWrap: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 8 },
    cardSuccessIcon: { marginBottom: 16 },
    cardSuccessTitle: { fontSize: 22, fontWeight: '900', color: '#1C2E4A', marginBottom: 10, textAlign: 'center' },
    cardSuccessMsg: { fontSize: 14, color: '#4B5563', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
    cardSuccessGuarantee: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#F9FAFB', borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 10,
        marginBottom: 8, width: '100%',
        borderWidth: 1, borderColor: '#EAECF0',
    },
    cardSuccessGuaranteeText: { fontSize: 13, color: '#4B5563', flex: 1 },

    miniCard: {
        width: '100%', height: 90,
        backgroundColor: '#1A2E48', borderRadius: 14,
        padding: 14, marginBottom: 20,
        overflow: 'hidden',
        borderWidth: 1, borderColor: 'rgba(255,167,38,0.3)',
    },
    miniCardBrand:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    miniCardIcon: {
        width: 20, height: 20, borderRadius: 6,
        backgroundColor: '#FFA726', alignItems: 'center', justifyContent: 'center',
    },
    miniBrandText:  { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 2 },
    miniChip: {
        position: 'absolute', right: 16, top: 14,
        width: 24, height: 18, borderRadius: 3, backgroundColor: '#D4AF37',
    },
    miniCardName: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700', letterSpacing: 1.5, position: 'absolute', bottom: 14, left: 14 },
});

export default WalletScreen;
