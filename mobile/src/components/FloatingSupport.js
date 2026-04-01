import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated, Easing } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { supportAPI } from '../services/api.service';

const TAB_BAR_HEIGHT = 62;
const MARGIN_ABOVE   = 16;

export default function FloatingSupport() {
    const [unread, setUnread] = useState(0);
    const navigation = useNavigation();
    const insets     = useSafeAreaInsets();

    // Animations
    const floatAnim  = useRef(new Animated.Value(0)).current;   // gentle up/down float
    const scaleAnim  = useRef(new Animated.Value(1)).current;   // pulse on new message
    const opacityAnim = useRef(new Animated.Value(0.72)).current; // resting opacity
    const glowAnim   = useRef(new Animated.Value(0)).current;   // ring glow when unread
    const prevUnread = useRef(0);

    // Continuous floating loop
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, {
                    toValue: -6,
                    duration: 2200,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(floatAnim, {
                    toValue: 0,
                    duration: 2200,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    // Glow pulse loop when there are unread messages
    useEffect(() => {
        if (unread > 0) {
            const glow = Animated.loop(
                Animated.sequence([
                    Animated.timing(glowAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(glowAnim, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                ])
            );
            glow.start();
            return () => glow.stop();
        } else {
            glowAnim.setValue(0);
        }
    }, [unread]);

    const fetchUnread = async () => {
        try {
            const { data } = await supportAPI.getUnread();
            const count = data.unread || 0;
            if (count > prevUnread.current) {
                // Bounce in + fade fully visible on new message
                Animated.parallel([
                    Animated.sequence([
                        Animated.timing(scaleAnim, { toValue: 1.3,  duration: 180, useNativeDriver: true }),
                        Animated.timing(scaleAnim, { toValue: 0.92, duration: 120, useNativeDriver: true }),
                        Animated.timing(scaleAnim, { toValue: 1.08, duration: 90,  useNativeDriver: true }),
                        Animated.timing(scaleAnim, { toValue: 1,    duration: 90,  useNativeDriver: true }),
                    ]),
                    Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
                ]).start();
            }
            prevUnread.current = count;
            setUnread(count);
        } catch {
            // silently ignore
        }
    };

    useEffect(() => {
        fetchUnread();
        const interval = setInterval(fetchUnread, 45_000);
        return () => clearInterval(interval);
    }, []);

    const onPress = () => {
        // Quick tap shrink then navigate
        Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 0.88, duration: 80, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1,    duration: 80, useNativeDriver: true }),
        ]).start(() => navigation.navigate('Support'));
    };

    const onPressIn = () => {
        Animated.timing(opacityAnim, { toValue: 1, duration: 80, useNativeDriver: true }).start();
    };
    const onPressOut = () => {
        if (unread === 0) {
            Animated.timing(opacityAnim, { toValue: 0.72, duration: 300, useNativeDriver: true }).start();
        }
    };

    const bottomOffset = TAB_BAR_HEIGHT + insets.bottom + MARGIN_ABOVE;

    // Glow ring scale: 1.0 → 1.5
    const ringScale = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] });
    const ringOpacity = glowAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.35, 0] });

    return (
        <Animated.View
            style={[
                styles.wrap,
                {
                    bottom: bottomOffset,
                    opacity: opacityAnim,
                    transform: [
                        { translateY: floatAnim },
                        { scale: scaleAnim },
                    ],
                },
            ]}
        >
            {/* Glow ring (only when unread) */}
            {unread > 0 && (
                <Animated.View
                    style={[
                        styles.glowRing,
                        { transform: [{ scale: ringScale }], opacity: ringOpacity },
                    ]}
                    pointerEvents="none"
                />
            )}

            <TouchableOpacity
                style={[styles.btn, unread > 0 && styles.btnUnread]}
                onPress={onPress}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                activeOpacity={1}
            >
                <FontAwesome5 name="headset" size={16} color="#fff" />
                {unread > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        position: 'absolute',
        right: 16,
        zIndex: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    glowRing: {
        position: 'absolute',
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#1565C0',
    },
    btn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#1A6ECC',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#1565C0',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
        elevation: 10,
    },
    btnUnread: {
        backgroundColor: '#1565C0',
    },
    badge: {
        position: 'absolute',
        top: -3,
        right: -3,
        backgroundColor: '#EF4444',
        borderRadius: 9,
        minWidth: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 3,
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    badgeText: {
        color: '#fff',
        fontSize: 8,
        fontWeight: '800',
    },
});
