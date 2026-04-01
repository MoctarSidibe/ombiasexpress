import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    ScrollView,
    Keyboard,
    Platform,
    Alert,
    ActivityIndicator,
    Image,
    Animated,
    Dimensions,
    Modal,
    FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { useAuth } from '../../context/AuthContext';
import { COUNTRIES } from '../../constants/countries';

const { width } = Dimensions.get('window');
const RING_BASE   = width * 0.32;
const LOTTIE_SIZE = width * 0.80;

// ── Pulse ring ────────────────────────────────────────────────────────────────
const PulseRing = ({ delay, color, thickness = 2 }) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(anim, { toValue: 1, duration: 2400, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0, duration: 0,    useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);
    const scale   = anim.interpolate({ inputRange: [0, 1], outputRange: [0.45, 2.5] });
    const opacity = anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.7, 0.35, 0] });
    return (
        <Animated.View style={{
            position: 'absolute',
            width: RING_BASE, height: RING_BASE,
            borderRadius: RING_BASE / 2,
            borderWidth: thickness, borderColor: color,
            opacity, transform: [{ scale }],
        }} />
    );
};

// ── Screen ────────────────────────────────────────────────────────────────────
const LoginScreen = ({ navigation }) => {
    const [country,         setCountry]        = useState(COUNTRIES[0]); // Gabon default
    const [localPhone,      setLocalPhone]     = useState('');
    const [password,        setPassword]       = useState('');
    const [loading,         setLoading]        = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [pickerOpen,      setPickerOpen]     = useState(false);
    const [searchQuery,     setSearchQuery]    = useState('');
    const { login } = useAuth();

    useEffect(() => {
        const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => { show.remove(); hide.remove(); };
    }, []);

    // Strip leading zeros and combine: 077724499 → 24177724499
    const buildFullPhone = () => country.dial + localPhone.replace(/^0+/, '');

    const handleLogin = async () => {
        if (!localPhone || !password) {
            Alert.alert('Erreur', 'Veuillez remplir tous les champs');
            return;
        }
        setLoading(true);
        const result = await login(buildFullPhone(), password);
        setLoading(false);
        if (!result.success) Alert.alert('Échec de connexion', result.error);
    };

    const filteredCountries = COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.dial.includes(searchQuery)
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* ── Country picker modal ── */}
            <Modal visible={pickerOpen} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Choisir un pays</Text>
                            <TouchableOpacity onPress={() => { setPickerOpen(false); setSearchQuery(''); }}>
                                <Ionicons name="close" size={22} color="#1C2E4A" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.searchRow}>
                            <Ionicons name="search-outline" size={16} color="#aaa" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Rechercher un pays..."
                                placeholderTextColor="#bbb"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoCapitalize="none"
                            />
                        </View>
                        <FlatList
                            data={filteredCountries}
                            keyExtractor={item => item.code}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.countryRow, item.code === country.code && styles.countryRowActive]}
                                    onPress={() => { setCountry(item); setPickerOpen(false); setSearchQuery(''); }}
                                >
                                    <Text style={styles.countryFlag}>{item.flag}</Text>
                                    <Text style={styles.countryName}>{item.name}</Text>
                                    <Text style={styles.countryDial}>+{item.dial}</Text>
                                    {item.code === country.code && (
                                        <Ionicons name="checkmark" size={16} color="#FFA726" />
                                    )}
                                </TouchableOpacity>
                            )}
                            keyboardShouldPersistTaps="handled"
                        />
                    </View>
                </View>
            </Modal>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── Top section ── */}
                    {!keyboardVisible && (
                        <View style={styles.topSection}>
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
                                <Text style={styles.taglineDot}>{'  ·  '}</Text>
                                {'Anytime'}
                                <Text style={styles.taglineDot}>{'  ·  '}</Text>
                                {'Anywhere'}
                            </Text>
                            <LottieView
                                source={require('../../../assets/delivery.json')}
                                autoPlay
                                loop
                                style={styles.lottie}
                            />
                        </View>
                    )}

                    {keyboardVisible && <View style={{ height: 28 }} />}

                    {/* ── Form ── */}
                    <View style={styles.form}>

                        {/* Phone input with country picker */}
                        <View style={[styles.inputContainer, styles.inputBlue]}>
                            <TouchableOpacity style={styles.dialPicker} onPress={() => setPickerOpen(true)}>
                                <Text style={styles.dialFlag}>{country.flag}</Text>
                                <Text style={styles.dialCode}>+{country.dial}</Text>
                                <Ionicons name="chevron-down" size={12} color="#9AA3B0" />
                            </TouchableOpacity>
                            <View style={styles.dialDivider} />
                            <TextInput
                                style={styles.input}
                                placeholder={country.placeholder}
                                placeholderTextColor="#bbb"
                                value={localPhone}
                                onChangeText={setLocalPhone}
                                keyboardType="phone-pad"
                                returnKeyType="next"
                            />
                        </View>

                        <View style={[styles.inputContainer, styles.inputBlue]}>
                            <Ionicons name="lock-closed-outline" size={20} color="#4DB6E8" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Mot de passe"
                                placeholderTextColor="#bbb"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                autoCapitalize="none"
                                returnKeyType="done"
                                onSubmitEditing={handleLogin}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={styles.buttonText}>Se connecter</Text>
                            }
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.linkButton}
                            onPress={() => navigation.navigate('Register')}
                        >
                            <Text style={styles.linkText}>
                                Pas encore de compte ?{' '}
                                <Text style={styles.linkTextBold}>S'inscrire →</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container:     { flex: 1, backgroundColor: '#fff' },
    keyboardView:  { flex: 1 },
    scrollContent: {
        flexGrow: 1,
        alignItems: 'center',
        paddingTop: 18,
        paddingBottom: 28,
    },

    topSection: {
        alignItems: 'center',
        width: '100%',
        marginBottom: 6,
    },
    logoWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        width: width * 0.82,
        height: RING_BASE * 1.1,
    },
    logo: {
        width: width * 0.78,
        height: width * 0.78 * 0.48,
    },
    tagline: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1C2E4A',
        marginTop: 4,
        marginBottom: 2,
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    taglineAccent: { color: '#FFA726', fontWeight: '900', fontSize: 16 },
    taglineDot:    { color: '#4DB6E8', fontWeight: '700' },
    lottie: {
        width: LOTTIE_SIZE,
        height: LOTTIE_SIZE * 0.96,
        alignSelf: 'center',
        marginTop: 0,
    },

    // Form
    form: {
        width: '100%',
        paddingHorizontal: 28,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#efefef',
        borderRadius: 14,
        marginBottom: 14,
        paddingHorizontal: 16,
        backgroundColor: '#fafafa',
    },
    inputBlue:  { borderColor: 'rgba(77,182,232,0.25)' },
    inputIcon:  { marginRight: 12 },
    input: {
        flex: 1,
        height: 52,
        fontSize: 16,
        color: '#1a1a1a',
    },

    // Dial picker inside input row
    dialPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingRight: 8,
    },
    dialFlag: { fontSize: 20 },
    dialCode:  { fontSize: 14, fontWeight: '700', color: '#1C2E4A' },
    dialDivider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(77,182,232,0.3)',
        marginHorizontal: 10,
    },

    button: {
        backgroundColor: '#FFA726',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 6,
        shadowColor: '#FFA726',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 6,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.4,
    },
    linkButton: {
        marginTop: 22,
        alignItems: 'center',
    },
    linkText:     { color: '#aaa', fontSize: 14 },
    linkTextBold: { color: '#4DB6E8', fontWeight: '700' },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '75%',
        paddingBottom: 32,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        paddingBottom: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: '#E5E7EB',
    },
    modalTitle: { fontSize: 17, fontWeight: '800', color: '#1C2E4A' },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        margin: 16,
        marginBottom: 8,
        paddingHorizontal: 12,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        height: 40,
        fontSize: 14,
        color: '#1a1a1a',
    },
    countryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        gap: 12,
    },
    countryRowActive: { backgroundColor: '#FFF8EE' },
    countryFlag: { fontSize: 24 },
    countryName: { flex: 1, fontSize: 14, color: '#1C2E4A', fontWeight: '500' },
    countryDial: { fontSize: 13, color: '#9AA3B0', fontWeight: '600' },
});

export default LoginScreen;
