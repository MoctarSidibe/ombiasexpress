import React, { useRef, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Dimensions,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    useAnimatedScrollHandler,
    interpolate,
    withRepeat,
    withSequence,
    withTiming,
    Extrapolation,
    useAnimatedReaction,
    runOnJS,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../context/LanguageContext';

const { width: W, height: H } = Dimensions.get('window');

// ── Slide data ────────────────────────────────────────────────────────────────

const SLIDES = [
    {
        key: 'welcome',
        bg: '#1C2E4A',
        accent: '#FFA726',
        icon: null, // custom logo slide
        bubbles: ['#FFA72640', '#4DB6E840', '#FFFFFF15'],
        title: 'Ombia\nExpress',
        titleSize: 52,
        subtitle: 'La super-app du transport\net des services au Gabon',
        isWelcome: true,
    },
    {
        key: 'rides',
        bg: '#2563EB',
        accent: '#BFDBFE',
        icon: 'car-sport',
        bubbles: ['#1D4ED840', '#93C5FD30', '#BFDBFE20'],
        badge: 'TRAJETS',
        title: 'Voyagez en toute\nconfiance',
        subtitle: 'Des chauffeurs vérifiés, un tarif transparent, un suivi en temps réel.',
        features: ['Chauffeurs KYC certifiés', 'Suivi GPS en direct', 'Paiement à la fin du trajet'],
    },
    {
        key: 'rental',
        bg: '#D97706',
        accent: '#FEF3C7',
        icon: 'key',
        bubbles: ['#B4550540', '#FCD34D30', '#FBBF2420'],
        badge: 'LOCATION',
        title: 'Louez ou\ngagnez avec votre auto',
        subtitle: 'Trouvez un véhicule disponible près de vous, ou mettez le vôtre en location.',
        features: ['Véhicules vérifiés', 'Réservation instantanée', '90% des revenus pour vous'],
    },
    {
        key: 'market',
        bg: '#7C3AED',
        accent: '#EDE9FE',
        icon: 'pricetag',
        bubbles: ['#5B21B640', '#A78BFA30', '#C4B5FD20'],
        badge: 'MARCHÉ AUTO',
        title: 'Achetez &\nvendez des véhicules',
        subtitle: 'Le plus grand marché automobile du Gabon. Annonces de vendeurs vérifiés Ombia.',
        features: ['Vendeurs certifiés', 'Photos & spécifications', 'Contact direct vendeur'],
    },
    {
        key: 'ecommerce',
        bg: '#1565C0',
        accent: '#BBDEFB',
        icon: 'bag-handle',
        bubbles: ['#0D47A140', '#42A5F530', '#90CAF920'],
        badge: 'E-COMMERCE',
        title: 'Des boutiques,\ndans votre poche',
        subtitle: 'Restauration, mode, beauté, électronique... Des centaines de marchands vérifiés Ombia près de vous.',
        features: ['9 catégories de produits', 'Commandes en 3 clics', 'Marchands certifiés Ombia'],
    },
    {
        key: 'wallet',
        bg: '#059669',
        accent: '#D1FAE5',
        icon: 'wallet',
        bubbles: ['#06522540', '#34D39930', '#6EE7B720'],
        badge: 'PORTEFEUILLE',
        title: 'Votre argent,\nen toute sécurité',
        subtitle: 'Rechargez via Airtel Money ou Moov Money. Payez, transférez, gagnez des points cashback.',
        features: ['-5% avec paiement wallet', 'Cashback sur chaque course', 'Transferts entre utilisateurs'],
    },
];

// ── Floating Bubble Component ─────────────────────────────────────────────────

const Bubble = ({ color, size, top, left, delay }) => {
    const y = useSharedValue(0);
    React.useEffect(() => {
        y.value = withRepeat(
            withSequence(
                withTiming(delay ? -14 : -10, { duration: 2200 + delay * 200 }),
                withTiming(delay ? 6 : 4,   { duration: 2200 + delay * 200 })
            ),
            -1,
            true
        );
    }, []);
    const style = useAnimatedStyle(() => ({
        transform: [{ translateY: y.value }],
    }));
    return (
        <Animated.View
            style={[style, {
                position: 'absolute',
                top, left,
                width: size, height: size,
                borderRadius: size / 2,
                backgroundColor: color,
            }]}
        />
    );
};

// ── Illustration per slide ────────────────────────────────────────────────────

const Illustration = ({ slide, index, scrollX }) => {
    const inputRange = [(index - 1) * W, index * W, (index + 1) * W];

    const iconScale = useSharedValue(0.8);
    const iconOpacity = useSharedValue(0);

    React.useEffect(() => {
        iconScale.value = withTiming(1, { duration: 500 });
        iconOpacity.value = withTiming(1, { duration: 400 });
    }, []);

    const iconStyle = useAnimatedStyle(() => ({
        transform: [{ scale: iconScale.value }],
        opacity: iconOpacity.value,
    }));

    const parallaxStyle = useAnimatedStyle(() => ({
        transform: [{
            translateX: interpolate(
                scrollX.value,
                inputRange,
                [W * 0.25, 0, -W * 0.25],
                Extrapolation.CLAMP
            )
        }],
    }));

    if (slide.isWelcome) {
        return (
            <Animated.View style={[styles.illustrationWrap, parallaxStyle]}>
                <Bubble color={slide.bubbles[0]} size={180} top={-30} left={-60} delay={0} />
                <Bubble color={slide.bubbles[1]} size={120} top={60} left={W * 0.55} delay={1} />
                <Bubble color={slide.bubbles[2]} size={80}  top={H * 0.18} left={W * 0.1} delay={2} />

                {/* Central logo mark */}
                <Animated.View style={[styles.logoMark, iconStyle]}>
                    <View style={styles.logoOuter}>
                        <View style={styles.logoInner}>
                            <Ionicons name="car-sport" size={54} color="#fff" />
                        </View>
                    </View>
                    <View style={styles.logoLines}>
                        {[30, 50, 70].map((w, i) => (
                            <View key={i} style={[styles.logoLine, { width: w, opacity: 0.4 + i * 0.2 }]} />
                        ))}
                    </View>
                </Animated.View>

                {/* Floating service badges */}
                {[
                    { icon: 'key-outline',     label: 'Location',  top: H * 0.04,  left: W * 0.05 },
                    { icon: 'pricetag-outline', label: 'Marché',    top: H * 0.06,  left: W * 0.62 },
                    { icon: 'wallet-outline',  label: 'Wallet',    top: H * 0.18,  left: W * 0.72 },
                ].map((b, i) => (
                    <Animated.View key={b.label} style={[styles.floatBadge, { top: b.top, left: b.left }, iconStyle]}>
                        <Ionicons name={b.icon} size={18} color="#FFA726" />
                        <Text style={styles.floatBadgeText}>{b.label}</Text>
                    </Animated.View>
                ))}
            </Animated.View>
        );
    }

    return (
        <Animated.View style={[styles.illustrationWrap, parallaxStyle]}>
            <Bubble color={slide.bubbles[0]} size={200} top={-50}      left={-80}       delay={0} />
            <Bubble color={slide.bubbles[1]} size={140} top={H * 0.08} left={W * 0.55}  delay={1} />
            <Bubble color={slide.bubbles[2]} size={90}  top={H * 0.16} left={W * 0.08}  delay={2} />

            <Animated.View style={[styles.iconCircleOuter, iconStyle]}>
                <View style={[styles.iconCircleInner, { backgroundColor: slide.accent + '30' }]}>
                    <View style={[styles.iconCircleCore, { backgroundColor: slide.accent + '50' }]}>
                        <Ionicons name={slide.icon} size={62} color="#fff" />
                    </View>
                </View>
            </Animated.View>
        </Animated.View>
    );
};

// ── Dot Indicator ─────────────────────────────────────────────────────────────

const Dot = ({ index, scrollX }) => {
    const style = useAnimatedStyle(() => {
        const inputRange = [(index - 1) * W, index * W, (index + 1) * W];
        const width   = interpolate(scrollX.value, inputRange, [8, 28, 8],   Extrapolation.CLAMP);
        const opacity = interpolate(scrollX.value, inputRange, [0.4, 1, 0.4], Extrapolation.CLAMP);
        return { width, opacity };
    });
    return <Animated.View style={[styles.dot, style]} />;
};

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function OnboardingScreen({ onDone }) {
    const flatRef = useRef(null);
    const scrollX = useSharedValue(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const { language, setLanguage, t, ta } = useLanguage();

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (e) => { scrollX.value = e.contentOffset.x; },
    });

    useAnimatedReaction(
        () => Math.round(scrollX.value / W),
        (idx) => { runOnJS(setCurrentIndex)(idx); }
    );

    const goNext = useCallback(() => {
        if (currentIndex < SLIDES.length - 1) {
            flatRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
        } else {
            finish();
        }
    }, [currentIndex]);

    const finish = async () => {
        await AsyncStorage.setItem('hasSeenOnboarding', 'true');
        onDone?.();
    };

    const slide = SLIDES[currentIndex];
    const isLast = currentIndex === SLIDES.length - 1;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Full-screen slides (illustration area) */}
            <Animated.FlatList
                ref={flatRef}
                data={SLIDES}
                keyExtractor={(s) => s.key}
                horizontal
                pagingEnabled
                scrollEventThrottle={16}
                showsHorizontalScrollIndicator={false}
                onScroll={scrollHandler}
                renderItem={({ item, index }) => (
                    <View style={[styles.slideBackground, { backgroundColor: item.bg }]}>
                        <Illustration slide={item} index={index} scrollX={scrollX} />
                    </View>
                )}
            />

            {/* Bottom card — overlaid on top */}
            <View style={[styles.bottomCard]}>

                {/* Language picker — top-right on welcome slide, skip on others */}
                {slide.isWelcome ? (
                    <View style={styles.langRow}>
                        <Text style={styles.langLabel}>{t('onboarding.language')}</Text>
                        <View style={styles.langBtns}>
                            {[{ code: 'fr', flag: '🇫🇷', label: 'FR' }, { code: 'en', flag: '🇬🇧', label: 'EN' }].map(l => (
                                <TouchableOpacity
                                    key={l.code}
                                    style={[styles.langBtn, language === l.code && styles.langBtnActive]}
                                    onPress={() => setLanguage(l.code)}
                                >
                                    <Text style={styles.langFlag}>{l.flag}</Text>
                                    <Text style={[styles.langBtnText, language === l.code && styles.langBtnTextActive]}>{l.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ) : !isLast ? (
                    <TouchableOpacity style={styles.skipBtn} onPress={finish}>
                        <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
                    </TouchableOpacity>
                ) : null}

                {/* Badge */}
                {slide.badge && (
                    <View style={[styles.badge, { backgroundColor: slide.bg + '18' }]}>
                        <Text style={[styles.badgeText, { color: slide.bg }]}>{slide.badge}</Text>
                    </View>
                )}

                {/* Title */}
                <Text style={styles.title}>{slide.title}</Text>

                {/* Subtitle */}
                <Text style={styles.subtitle}>{slide.subtitle}</Text>

                {/* Feature list */}
                {slide.features && (
                    <View style={styles.featureList}>
                        {slide.features.map((f) => (
                            <View key={f} style={styles.featureRow}>
                                <View style={[styles.featureDot, { backgroundColor: slide.bg }]} />
                                <Text style={styles.featureText}>{f}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Welcome tagline */}
                {slide.isWelcome && (
                    <Text style={styles.tagline}>
                        🇬🇦 Libreville · Port-Gentil · Franceville
                    </Text>
                )}

                {/* Dots */}
                <View style={styles.dotsRow}>
                    {SLIDES.map((_, i) => (
                        <Dot key={i} index={i} scrollX={scrollX} />
                    ))}
                </View>

                {/* CTA Button */}
                <TouchableOpacity
                    style={[styles.ctaBtn, { backgroundColor: slide.bg }]}
                    onPress={goNext}
                    activeOpacity={0.88}
                >
                    <Text style={styles.ctaBtnText}>
                        {isLast ? t('onboarding.getStarted') : t('onboarding.next', 'Suivant')}
                    </Text>
                    <Ionicons
                        name={isLast ? 'rocket-outline' : 'arrow-forward'}
                        size={20}
                        color="#fff"
                        style={{ marginLeft: 8 }}
                    />
                </TouchableOpacity>

                {/* Already have account */}
                {isLast && (
                    <TouchableOpacity onPress={finish} style={styles.loginLink}>
                        <Text style={styles.loginLinkText}>
                            {language === 'fr' ? 'J\'ai déjà un compte — ' : 'Already have an account — '}
                            <Text style={[styles.loginLinkBold, { color: slide.bg }]}>
                                {t('auth.login.submit')}
                            </Text>
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const CARD_HEIGHT = H * 0.5;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },

    // Slide background fills the entire screen
    slideBackground: {
        width: W,
        height: H,
    },

    // Illustration fills the top 55%
    illustrationWrap: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: H * 0.58,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },

    // Welcome slide
    logoMark: {
        alignItems: 'center',
        marginTop: 40,
    },
    logoOuter: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: '#FFFFFF15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoInner: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: '#FFA726',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#FFA726',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 12,
    },
    logoLines: { marginTop: 20, gap: 6, alignItems: 'center' },
    logoLine: { height: 3, backgroundColor: '#fff', borderRadius: 2 },

    floatBadge: {
        position: 'absolute',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF1A',
        borderWidth: 1,
        borderColor: '#FFFFFF30',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    floatBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },

    // Generic illustration
    iconCircleOuter: {
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: '#FFFFFF10',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 30,
    },
    iconCircleInner: {
        width: 160,
        height: 160,
        borderRadius: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconCircleCore: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
    },

    // Bottom card
    bottomCard: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: CARD_HEIGHT,
        backgroundColor: '#fff',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 28,
        paddingTop: 28,
        paddingBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 16,
    },

    skipBtn: {
        position: 'absolute',
        top: 20,
        right: 24,
        paddingVertical: 6,
        paddingHorizontal: 14,
    },
    skipText: { fontSize: 14, color: '#9CA3AF', fontWeight: '600' },

    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        marginBottom: 10,
    },
    badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },

    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#111827',
        lineHeight: 36,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 22,
        marginBottom: 12,
    },

    featureList: { marginBottom: 8, gap: 6 },
    featureRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
    featureDot:  { width: 6, height: 6, borderRadius: 3 },
    featureText: { fontSize: 13, color: '#374151', fontWeight: '500' },

    tagline: {
        fontSize: 13,
        color: '#9CA3AF',
        marginBottom: 8,
    },

    dotsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginVertical: 14,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        backgroundColor: '#1C2E4A',
    },

    ctaBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    ctaBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

    loginLink: { alignItems: 'center', paddingVertical: 4 },
    loginLinkText: { fontSize: 13, color: '#9CA3AF' },
    loginLinkBold: { fontWeight: '700' },

    // Language picker
    langRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    langLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
    langBtns: { flexDirection: 'row', gap: 8 },
    langBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
    },
    langBtnActive: { backgroundColor: '#1C2E4A', borderColor: '#1C2E4A' },
    langFlag: { fontSize: 14 },
    langBtnText: { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },
    langBtnTextActive: { color: '#fff' },
});
