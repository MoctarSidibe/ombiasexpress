/**
 * GuestHomeScreen — app front for unauthenticated users.
 * No scroll: everything fits on one screen using flex proportions.
 */
import React, { useRef, useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Image, Dimensions, Animated, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    NavigationArrow, Car, Package, Storefront,
    Key, Scooter, ShoppingBag, Taxi,
} from 'phosphor-react-native';
import LottieView from 'lottie-react-native';

const { width: W, height: H } = Dimensions.get('window');

// ── Services ────────────────────────────────────────────────────────────────
const SERVICES = [
    { key: 'ride',     Icon: NavigationArrow, label: 'Course VTC',    color: '#FF6B35', bg: '#FFF0EB' },
    { key: 'rental',   Icon: Key,             label: 'Location auto', color: '#0288D1', bg: '#E1F3FB' },
    { key: 'delivery', Icon: Scooter,         label: 'Livraison',     color: '#6D4C41', bg: '#EFEBE9' },
    { key: 'market',   Icon: ShoppingBag,     label: 'Boutiques',     color: '#00897B', bg: '#E0F2F1' },
    { key: 'car_buy',  Icon: Car,             label: 'Acheter auto',  color: '#7B1FA2', bg: '#F3E5F5' },
    { key: 'store',    Icon: Storefront,      label: 'Partenaires',   color: '#E65100', bg: '#FFF3E0' },
];

// ── Pulse ring ───────────────────────────────────────────────────────────────
const RING = W * 0.22;
const PulseRing = ({ delay, color, thickness = 2 }) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, { toValue: 1, duration: 2400, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration: 0,    useNativeDriver: true }),
        ]));
        loop.start();
        return () => loop.stop();
    }, []);
    const scale   = anim.interpolate({ inputRange: [0, 1], outputRange: [0.45, 2.5] });
    const opacity = anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.6, 0.3, 0] });
    return (
        <Animated.View style={{
            position: 'absolute',
            width: RING, height: RING, borderRadius: RING / 2,
            borderWidth: thickness, borderColor: color,
            opacity, transform: [{ scale }],
        }} />
    );
};

// ── Auth prompt modal ────────────────────────────────────────────────────────
const AuthPrompt = ({ visible, onLogin, onRegister, onClose }) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
            <View style={styles.sheet}>
                <Text style={styles.sheetTitle}>Connexion requise</Text>
                <Text style={styles.sheetSub}>
                    Créez un compte gratuit ou connectez-vous pour accéder à ce service.
                </Text>
                <TouchableOpacity style={styles.sheetBtnPrimary} onPress={onLogin}>
                    <Text style={styles.sheetBtnPrimaryText}>Se connecter</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sheetBtnSecondary} onPress={onRegister}>
                    <Text style={styles.sheetBtnSecondaryText}>Créer un compte gratuit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ marginTop: 10 }} onPress={onClose}>
                    <Text style={{ color: '#aaa', fontSize: 13, textAlign: 'center' }}>Continuer à explorer</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    </Modal>
);

// ── Screen ───────────────────────────────────────────────────────────────────
export default function GuestHomeScreen({ navigation }) {
    const [promptVisible, setPromptVisible] = useState(false);
    const goLogin    = () => { setPromptVisible(false); navigation.navigate('Login'); };
    const goRegister = () => { setPromptVisible(false); navigation.navigate('Register'); };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

            {/* ── 1. Logo + pulse rings ── */}
            <View style={styles.logoSection}>
                <View style={styles.logoWrap}>
                    <PulseRing delay={0}    color="#FFA726" thickness={2.5} />
                    <PulseRing delay={800}  color="#4DB6E8" thickness={2}   />
                    <PulseRing delay={1600} color="#FFA726" thickness={1.5} />
                    <Image
                        source={require('../../../assets/logo.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>
                <Text style={styles.tagline}>
                    <Text style={styles.taglineAccent}>Move Freely</Text>
                    {'  ·  '}Anytime{'  ·  '}Anywhere
                </Text>
            </View>

            {/* ── 2. Lottie animation — centred, bigger ── */}
            <View style={styles.lottieSection}>
                <LottieView
                    source={require('../../../assets/delivery.json')}
                    autoPlay
                    loop
                    style={styles.lottie}
                />
            </View>

            {/* ── 3. Service grid — 3 columns, compact ── */}
            <View style={styles.grid}>
                {SERVICES.map(s => (
                    <TouchableOpacity
                        key={s.key}
                        style={[styles.card, { borderColor: s.color + '28' }]}
                        onPress={() => setPromptVisible(true)}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.cardIcon, { backgroundColor: s.bg }]}>
                            <s.Icon size={20} color={s.color} weight="duotone" />
                        </View>
                        <Text style={styles.cardLabel} numberOfLines={1}>{s.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* ── 4. CTA buttons ── */}
            <View style={styles.ctaSection}>
                <TouchableOpacity style={styles.ctaPrimary} onPress={goLogin}>
                    <Text style={styles.ctaPrimaryText}>Se connecter</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ctaSecondary} onPress={goRegister}>
                    <Text style={styles.ctaSecondaryText}>Créer un compte gratuit →</Text>
                </TouchableOpacity>
            </View>

            <AuthPrompt
                visible={promptVisible}
                onLogin={goLogin}
                onRegister={goRegister}
                onClose={() => setPromptVisible(false)}
            />
        </SafeAreaView>
    );
}

// ── Card width for 3-column grid ─────────────────────────────────────────────
const CARD_W = (W - 32 - 16) / 3;   // 16px side padding × 2, 8px × 2 gaps

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFBFC' },

    // Logo section — small, at top
    logoSection: {
        alignItems: 'center',
        paddingTop: 10,
        height: H * 0.14,
        justifyContent: 'center',
    },
    logoWrap: {
        width: RING * 2, height: RING * 1.4,
        alignItems: 'center', justifyContent: 'center',
    },
    logo:          { width: W * 0.44, height: W * 0.44 * 0.48 },
    tagline:       { fontSize: 11, color: '#6B7280', marginTop: 4, letterSpacing: 0.3 },
    taglineAccent: { color: '#FFA726', fontWeight: '800' },

    // Lottie — flex to fill remaining space, properly centred
    lottieSection: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    lottie: {
        width: W * 0.82,
        height: W * 0.82 * 0.96,
    },

    // Grid — 3 columns, compact cards
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
        gap: 8,
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    card: {
        width: CARD_W,
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 8,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#F0F0F0',
        gap: 6,
    },
    cardIcon: {
        width: 36, height: 36, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
    },
    cardLabel: { fontSize: 10, fontWeight: '700', color: '#374151', textAlign: 'center' },

    // CTA
    ctaSection:       { paddingHorizontal: 20, paddingBottom: 8, gap: 8 },
    ctaPrimary:       { backgroundColor: '#FFA726', paddingVertical: 14, borderRadius: 14, alignItems: 'center', elevation: 4, shadowColor: '#FFA726', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    ctaPrimaryText:   { color: '#fff', fontSize: 15, fontWeight: '700' },
    ctaSecondary:     { alignItems: 'center', paddingVertical: 6 },
    ctaSecondaryText: { color: '#4DB6E8', fontSize: 13, fontWeight: '600' },

    // Auth modal
    overlay:             { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet:               { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 40 },
    sheetTitle:          { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
    sheetSub:            { fontSize: 14, color: '#6B7280', marginBottom: 22, lineHeight: 20 },
    sheetBtnPrimary:     { backgroundColor: '#FFA726', paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginBottom: 10 },
    sheetBtnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    sheetBtnSecondary:    { backgroundColor: '#F0F9FF', paddingVertical: 15, borderRadius: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#BAE6FD' },
    sheetBtnSecondaryText:{ color: '#0288D1', fontWeight: '700', fontSize: 15 },
});
