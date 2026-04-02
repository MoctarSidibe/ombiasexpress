import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
    Image,
    Animated,
    Dimensions,
    Modal,
    FlatList,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COUNTRIES } from '../../constants/countries';

const { width, height } = Dimensions.get('window');

// ── Compact pulse ring ────────────────────────────────────────────────────────
const PulseRing = ({ delay, color, size }) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(anim, { toValue: 1, duration: 2200, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);
    const scale   = anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2.2] });
    const opacity = anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.6, 0.25, 0] });
    return (
        <Animated.View style={{
            position: 'absolute',
            width: size, height: size,
            borderRadius: size / 2,
            borderWidth: 1.5, borderColor: color,
            opacity, transform: [{ scale }],
        }} />
    );
};

const LoginScreen = ({ navigation }) => {
    const [loginMode,   setLoginMode]  = useState('phone');
    const [country,     setCountry]    = useState(COUNTRIES[0]);
    const [localPhone,  setLocalPhone] = useState('');
    const [email,       setEmail]      = useState('');
    const [password,    setPassword]   = useState('');
    const [loading,     setLoading]    = useState(false);
    const [pickerOpen,  setPickerOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showPass,    setShowPass]   = useState(false);
    const { login } = useAuth();

    const tabAnim = useRef(new Animated.Value(0)).current;
    const RING_SIZE = width * 0.18;

    const switchMode = (mode) => {
        setLoginMode(mode);
        Animated.spring(tabAnim, {
            toValue: mode === 'phone' ? 0 : 1,
            useNativeDriver: false,
            tension: 80, friction: 12,
        }).start();
    };

    const buildFullPhone = () => country.dial + localPhone.replace(/^0+/, '');

    const handleLogin = async () => {
        const identifier = loginMode === 'phone' ? localPhone : email;
        if (!identifier || !password) {
            Alert.alert('Erreur', 'Veuillez remplir tous les champs');
            return;
        }
        setLoading(true);
        const credentials = loginMode === 'phone'
            ? { phone: buildFullPhone(), password }
            : { email: email.trim().toLowerCase(), password };
        const result = await login(credentials);
        setLoading(false);
        if (!result.success) Alert.alert('Échec de connexion', result.error);
    };

    const filteredCountries = COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.dial.includes(searchQuery)
    );

    const tabLeft = tabAnim.interpolate({ inputRange: [0, 1], outputRange: ['3%', '51%'] });

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Country picker modal */}
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
                                    {item.code === country.code && <Ionicons name="checkmark" size={16} color="#FFA726" />}
                                </TouchableOpacity>
                            )}
                            keyboardShouldPersistTaps="handled"
                        />
                    </View>
                </View>
            </Modal>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.kav}
            >
                <View style={styles.container}>

                    {/* ── Brand header ── */}
                    <View style={styles.header}>
                        <View style={styles.logoWrap}>
                            <PulseRing delay={0}    color="#FFA726" size={RING_SIZE} />
                            <PulseRing delay={900}  color="#4DB6E8" size={RING_SIZE} />
                            <Image
                                source={require('../../../assets/logo.png')}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        </View>
                        <View style={styles.brandText}>
                            <Text style={styles.brandName}>Ombia Express</Text>
                            <Text style={styles.brandTagline}>Move Freely · Anytime · Anywhere</Text>
                        </View>
                    </View>

                    {/* ── Form card ── */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Connexion</Text>

                        {/* Toggle tab */}
                        <View style={styles.tabContainer}>
                            <Animated.View style={[styles.tabIndicator, { left: tabLeft }]} />
                            <TouchableOpacity style={styles.tabButton} onPress={() => switchMode('phone')} activeOpacity={0.8}>
                                <Ionicons name="call-outline" size={15} color={loginMode === 'phone' ? '#FFA726' : '#9AA3B0'} />
                                <Text style={[styles.tabLabel, loginMode === 'phone' && styles.tabLabelActive]}>Téléphone</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.tabButton} onPress={() => switchMode('email')} activeOpacity={0.8}>
                                <Ionicons name="mail-outline" size={15} color={loginMode === 'email' ? '#FFA726' : '#9AA3B0'} />
                                <Text style={[styles.tabLabel, loginMode === 'email' && styles.tabLabelActive]}>Email</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Identifier input */}
                        {loginMode === 'phone' ? (
                            <View style={styles.inputRow}>
                                <TouchableOpacity style={styles.dialPicker} onPress={() => setPickerOpen(true)}>
                                    <Text style={styles.dialFlag}>{country.flag}</Text>
                                    <Text style={styles.dialCode}>+{country.dial}</Text>
                                    <Ionicons name="chevron-down" size={11} color="#9AA3B0" />
                                </TouchableOpacity>
                                <View style={styles.dialDivider} />
                                <TextInput
                                    style={styles.input}
                                    placeholder={country.placeholder || 'Numéro de téléphone'}
                                    placeholderTextColor="#C4C9D4"
                                    value={localPhone}
                                    onChangeText={setLocalPhone}
                                    keyboardType="phone-pad"
                                    returnKeyType="next"
                                />
                            </View>
                        ) : (
                            <View style={styles.inputRow}>
                                <Ionicons name="mail-outline" size={18} color="#4DB6E8" style={{ marginRight: 10 }} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Adresse email"
                                    placeholderTextColor="#C4C9D4"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    returnKeyType="next"
                                />
                            </View>
                        )}

                        {/* Password */}
                        <View style={styles.inputRow}>
                            <Ionicons name="lock-closed-outline" size={18} color="#4DB6E8" style={{ marginRight: 10 }} />
                            <TextInput
                                style={styles.input}
                                placeholder="Mot de passe"
                                placeholderTextColor="#C4C9D4"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPass}
                                autoCapitalize="none"
                                returnKeyType="done"
                                onSubmitEditing={handleLogin}
                            />
                            <TouchableOpacity onPress={() => setShowPass(v => !v)}>
                                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color="#C4C9D4" />
                            </TouchableOpacity>
                        </View>

                        {/* Login button */}
                        <TouchableOpacity
                            style={[styles.btn, loading && styles.btnDisabled]}
                            onPress={handleLogin}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={styles.btnText}>Se connecter</Text>
                            }
                        </TouchableOpacity>

                        {/* Register link */}
                        <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('Register')}>
                            <Text style={styles.linkText}>
                                Pas encore de compte ?{'  '}
                                <Text style={styles.linkBold}>Créer un compte →</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe:      { flex: 1, backgroundColor: '#F4F6FB' },
    kav:       { flex: 1 },
    container: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 22,
        paddingVertical: 12,
    },

    // ── Header ──
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 28,
        paddingLeft: 4,
    },
    logoWrap: {
        width: width * 0.18,
        height: width * 0.18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    logo: {
        width: width * 0.17,
        height: width * 0.17 * 0.65,
    },
    brandText: { flex: 1 },
    brandName: {
        fontSize: 22,
        fontWeight: '900',
        color: '#1C2E4A',
        letterSpacing: 0.3,
    },
    brandTagline: {
        fontSize: 11,
        color: '#9AA3B0',
        fontWeight: '500',
        marginTop: 2,
    },

    // ── Card ──
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#1C2E4A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 8,
    },
    cardTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1C2E4A',
        marginBottom: 18,
    },

    // ── Tabs ──
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 3,
        marginBottom: 16,
        position: 'relative',
        overflow: 'hidden',
    },
    tabIndicator: {
        position: 'absolute',
        top: 3, bottom: 3,
        width: '46%',
        backgroundColor: '#fff',
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 3,
        elevation: 2,
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: 9,
        zIndex: 1,
    },
    tabLabel:       { fontSize: 13, fontWeight: '600', color: '#9AA3B0' },
    tabLabelActive: { color: '#1C2E4A' },

    // ── Inputs ──
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FC',
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#EAECF2',
        paddingHorizontal: 14,
        marginBottom: 12,
        minHeight: 52,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#1a1a1a',
        height: 50,
    },
    dialPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingRight: 6,
    },
    dialFlag: { fontSize: 18 },
    dialCode:  { fontSize: 13, fontWeight: '700', color: '#1C2E4A' },
    dialDivider: {
        width: 1, height: 22,
        backgroundColor: 'rgba(77,182,232,0.3)',
        marginHorizontal: 10,
    },

    // ── Button ──
    btn: {
        backgroundColor: '#FFA726',
        paddingVertical: 15,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 6,
        shadowColor: '#FFA726',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 6,
    },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },

    // ── Link ──
    linkBtn: { marginTop: 18, alignItems: 'center' },
    linkText: { color: '#9AA3B0', fontSize: 13 },
    linkBold: { color: '#4DB6E8', fontWeight: '700' },

    // ── Modal ──
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    modalSheet:   { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%', paddingBottom: 32 },
    modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: '#E5E7EB' },
    modalTitle:   { fontSize: 17, fontWeight: '800', color: '#1C2E4A' },
    searchRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, margin: 16, marginBottom: 8, paddingHorizontal: 12, gap: 8 },
    searchInput:  { flex: 1, height: 40, fontSize: 14, color: '#1a1a1a' },
    countryRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
    countryRowActive: { backgroundColor: '#FFF8EE' },
    countryFlag:  { fontSize: 22 },
    countryName:  { flex: 1, fontSize: 14, color: '#1C2E4A', fontWeight: '500' },
    countryDial:  { fontSize: 13, color: '#9AA3B0', fontWeight: '600' },
});

export default LoginScreen;
