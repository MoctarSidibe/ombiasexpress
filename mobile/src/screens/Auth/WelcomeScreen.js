/**
 * WelcomeScreen — shown only on first app install.
 * After tapping any CTA, the flag is set and this screen never shows again.
 */
import React, { useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Image, Dimensions, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: W, height: H } = Dimensions.get('window');
const RING = W * 0.28;

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

const markSeen = () => AsyncStorage.setItem('welcome_seen', '1');

export default function WelcomeScreen({ navigation }) {
    const goLogin = async () => {
        await markSeen();
        navigation.replace('Login');
    };
    const goRegister = async () => {
        await markSeen();
        navigation.replace('Register');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

            {/* ── Logo + pulse rings ── */}
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

            {/* ── Lottie animation ── */}
            <View style={styles.lottieSection}>
                <LottieView
                    source={require('../../../assets/delivery.json')}
                    autoPlay
                    loop
                    style={styles.lottie}
                />
            </View>

            {/* ── Tagline text ── */}
            <View style={styles.textSection}>
                <Text style={styles.headline}>Votre super-app{'\n'}de mobilité & livraison</Text>
                <Text style={styles.sub}>Course VTC · Location auto · Livraison · Boutiques</Text>
            </View>

            {/* ── CTA buttons ── */}
            <View style={styles.ctaSection}>
                <TouchableOpacity style={styles.ctaPrimary} onPress={goRegister}>
                    <Text style={styles.ctaPrimaryText}>Créer un compte gratuit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ctaSecondary} onPress={goLogin}>
                    <Text style={styles.ctaSecondaryText}>J'ai déjà un compte →</Text>
                </TouchableOpacity>
            </View>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFBFC' },

    logoSection: {
        alignItems: 'center',
        paddingTop: 10,
        height: H * 0.20,
        justifyContent: 'center',
    },
    logoWrap: {
        width: RING * 2.8, height: RING * 2,
        alignItems: 'center', justifyContent: 'center',
    },
    logo:          { width: W * 0.72, height: W * 0.72 * 0.48 },
    tagline:       { fontSize: 11, color: '#6B7280', marginTop: 4, letterSpacing: 0.3 },
    taglineAccent: { color: '#FFA726', fontWeight: '800' },

    lottieSection: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    lottie: {
        width:  W * 0.82,
        height: W * 0.82 * 0.96,
    },

    textSection: {
        alignItems: 'center',
        paddingHorizontal: 32,
        marginBottom: 20,
    },
    headline: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1C2E4A',
        textAlign: 'center',
        lineHeight: 30,
        marginBottom: 8,
    },
    sub: {
        fontSize: 12,
        color: '#9AA3B0',
        textAlign: 'center',
        letterSpacing: 0.2,
    },

    ctaSection:       { paddingHorizontal: 24, paddingBottom: 12, gap: 10 },
    ctaPrimary:       { backgroundColor: '#FFA726', paddingVertical: 15, borderRadius: 14, alignItems: 'center', elevation: 4, shadowColor: '#FFA726', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    ctaPrimaryText:   { color: '#fff', fontSize: 15, fontWeight: '700' },
    ctaSecondary:     { alignItems: 'center', paddingVertical: 8 },
    ctaSecondaryText: { color: '#4DB6E8', fontSize: 13, fontWeight: '600' },
});
