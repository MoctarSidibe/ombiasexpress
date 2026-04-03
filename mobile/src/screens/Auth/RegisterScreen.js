import React, { useState, useRef, useEffect } from 'react';
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

const { width } = Dimensions.get('window');

const MINI_RING = width * 0.13;

// ── Mini pulse ring ────────────────────────────────────────────────────────────
const MiniPulseRing = ({ delay, color, thickness = 1.5 }) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(anim, { toValue: 1, duration: 2200, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0, duration: 0,    useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);
    const scale   = anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2.2] });
    const opacity = anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.6, 0.3, 0] });
    return (
        <Animated.View style={{
            position: 'absolute',
            width: MINI_RING, height: MINI_RING,
            borderRadius: MINI_RING / 2,
            borderWidth: thickness, borderColor: color,
            opacity, transform: [{ scale }],
        }} />
    );
};

// ── Screen ─────────────────────────────────────────────────────────────────────
const RegisterScreen = ({ navigation }) => {
    const [name,            setName]            = useState('');
    const [email,           setEmail]           = useState('');
    const [country,         setCountry]         = useState(COUNTRIES[0]);
    const [localPhone,      setLocalPhone]      = useState('');
    const [password,        setPassword]        = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading,         setLoading]         = useState(false);
    const [accepted,        setAccepted]        = useState(false);
    const [pickerOpen,      setPickerOpen]      = useState(false);
    const [searchQuery,     setSearchQuery]     = useState('');
    const [showPass,        setShowPass]        = useState(false);
    const [showConfirm,     setShowConfirm]     = useState(false);
    const { register } = useAuth();

    const buildFullPhone = () => country.dial + localPhone.replace(/^0+/, '');

    const handleRegister = async () => {
        if (!name || !localPhone || !password) {
            Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Erreur', 'Le mot de passe doit comporter au moins 6 caractères');
            return;
        }
        if (!accepted) {
            Alert.alert('Conditions requises', "Veuillez accepter les Conditions d'utilisation pour continuer.");
            return;
        }
        setLoading(true);
        const result = await register({
            name: name.trim(),
            email: email.trim().toLowerCase() || undefined,
            phone: buildFullPhone(),
            password,
        });
        setLoading(false);
        if (!result.success) {
            Alert.alert("Échec de l'inscription", result.error);
        }
    };

    const filteredCountries = COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.dial.includes(searchQuery)
    );

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

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
                <View style={styles.screen}>

                    {/* ══ TOP HEADER ══ */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Ionicons name="arrow-back" size={22} color="#1C2E4A" />
                        </TouchableOpacity>

                        <View style={styles.headerCenter}>
                            <Text style={styles.title}>Créer un compte</Text>
                            <View style={styles.subtitleRow}>
                                <Text style={styles.subtitle}>Rejoignez{' '}
                                    <Text style={styles.subtitleBrand}>Ombia Express</Text>
                                </Text>
                                <View style={styles.miniLogoWrap}>
                                    <MiniPulseRing delay={0}   color="#FFA726" />
                                    <MiniPulseRing delay={700} color="#4DB6E8" />
                                    <Image
                                        source={require('../../../assets/logo.png')}
                                        style={styles.miniLogo}
                                        resizeMode="contain"
                                    />
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* ══ FORM ══ */}
                    <View style={styles.form}>

                        {/* Name */}
                        <View style={styles.inputRow}>
                            <Ionicons name="person-outline" size={18} color="#9AA3B0" style={styles.icon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Nom complet *"
                                placeholderTextColor="#C4C9D4"
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                                returnKeyType="next"
                            />
                        </View>

                        {/* Email optional */}
                        <View style={styles.inputRow}>
                            <Ionicons name="mail-outline" size={18} color="#4DB6E8" style={styles.icon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Email (optionnel)"
                                placeholderTextColor="#C4C9D4"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                returnKeyType="next"
                            />
                        </View>

                        {/* Phone */}
                        <View style={[styles.inputRow, styles.inputBlue]}>
                            <TouchableOpacity style={styles.dialPicker} onPress={() => setPickerOpen(true)}>
                                <Text style={styles.dialFlag}>{country.flag}</Text>
                                <Text style={styles.dialCode}>+{country.dial}</Text>
                                <Ionicons name="chevron-down" size={11} color="#9AA3B0" />
                            </TouchableOpacity>
                            <View style={styles.dialDivider} />
                            <TextInput
                                style={styles.input}
                                placeholder={country.placeholder || 'Numéro *'}
                                placeholderTextColor="#C4C9D4"
                                value={localPhone}
                                onChangeText={setLocalPhone}
                                keyboardType="phone-pad"
                                returnKeyType="next"
                            />
                        </View>

                        {/* Password row */}
                        <View style={styles.passwordRow}>
                            <View style={[styles.inputRow, styles.halfInput]}>
                                <Ionicons name="lock-closed-outline" size={16} color="#9AA3B0" style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Mot de passe *"
                                    placeholderTextColor="#C4C9D4"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPass}
                                    autoCapitalize="none"
                                    returnKeyType="next"
                                />
                                <TouchableOpacity onPress={() => setShowPass(v => !v)}>
                                    <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={16} color="#C4C9D4" />
                                </TouchableOpacity>
                            </View>
                            <View style={[styles.inputRow, styles.halfInput]}>
                                <Ionicons name="shield-checkmark-outline" size={16} color="#4DB6E8" style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirmer *"
                                    placeholderTextColor="#C4C9D4"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showConfirm}
                                    autoCapitalize="none"
                                    returnKeyType="done"
                                />
                                <TouchableOpacity onPress={() => setShowConfirm(v => !v)}>
                                    <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={16} color="#C4C9D4" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Consent */}
                        <TouchableOpacity
                            style={styles.consentRow}
                            onPress={() => setAccepted(v => !v)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
                                {accepted && <Ionicons name="checkmark" size={12} color="#fff" />}
                            </View>
                            <Text style={styles.consentText}>
                                {'J\'accepte les '}
                                <Text style={styles.consentLink} onPress={() => navigation.navigate('Terms')}>
                                    Conditions d'utilisation
                                </Text>
                                {' et la '}
                                <Text style={styles.consentLink} onPress={() => navigation.navigate('PrivacyPolicy')}>
                                    Politique de confidentialité
                                </Text>
                            </Text>
                        </TouchableOpacity>

                        {/* Register button */}
                        <TouchableOpacity
                            style={[styles.btn, (!accepted || loading) && styles.btnDisabled]}
                            onPress={handleRegister}
                            disabled={loading || !accepted}
                            activeOpacity={0.85}
                        >
                            {loading
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={styles.btnText}>Créer mon compte</Text>
                            }
                        </TouchableOpacity>

                        {/* Login link */}
                        <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.linkText}>
                                Déjà un compte ?{'  '}
                                <Text style={styles.linkBold}>Se connecter →</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#fff' },
    kav:  { flex: 1 },
    screen: { flex: 1 },

    // ── Header ──
    header: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F2F7',
    },
    backBtn: { marginBottom: 8 },
    headerCenter: {},
    title: {
        fontSize: 26,
        fontWeight: '900',
        color: '#1C2E4A',
        marginBottom: 4,
    },
    subtitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    subtitle: {
        fontSize: 17,
        color: '#6B7280',
        fontWeight: '500',
    },
    subtitleBrand: {
        fontSize: 17,
        fontWeight: '800',
        color: '#FFA726',
    },
    miniLogoWrap: {
        width: width * 0.22,
        height: width * 0.10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    miniLogo: {
        width: width * 0.22,
        height: width * 0.10,
    },

    // ── Form ──
    form: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 12,
        justifyContent: 'flex-start',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FC',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#EAECF2',
        paddingHorizontal: 12,
        marginBottom: 10,
        height: 48,
    },
    inputBlue: { borderColor: 'rgba(77,182,232,0.3)' },
    icon: { marginRight: 8 },
    input: {
        flex: 1,
        fontSize: 14,
        color: '#1a1a1a',
        height: 48,
    },
    dialPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingRight: 4,
    },
    dialFlag: { fontSize: 17 },
    dialCode:  { fontSize: 13, fontWeight: '700', color: '#1C2E4A' },
    dialDivider: {
        width: 1, height: 20,
        backgroundColor: 'rgba(77,182,232,0.3)',
        marginHorizontal: 8,
    },

    // Side-by-side password fields
    passwordRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 0,
    },
    halfInput: {
        flex: 1,
        marginBottom: 10,
    },

    // ── Consent ──
    consentRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 10,
        marginBottom: 12,
    },
    checkbox: {
        width: 18, height: 18,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 1, flexShrink: 0,
    },
    checkboxChecked: { backgroundColor: '#FFA726', borderColor: '#FFA726' },
    consentText: { flex: 1, fontSize: 11, color: '#6B7280', lineHeight: 16 },
    consentLink: { color: '#FFA726', fontWeight: '700', textDecorationLine: 'underline' },

    // ── Button ──
    btn: {
        backgroundColor: '#FFA726',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        shadowColor: '#FFA726',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 5,
    },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },

    linkBtn: { marginTop: 14, alignItems: 'center' },
    linkText: { color: '#9AA3B0', fontSize: 13 },
    linkBold: { color: '#4DB6E8', fontWeight: '700' },

    // ── Modal ──
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%', paddingBottom: 32 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: '#E5E7EB' },
    modalTitle: { fontSize: 17, fontWeight: '800', color: '#1C2E4A' },
    searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, margin: 16, marginBottom: 8, paddingHorizontal: 12, gap: 8 },
    searchInput: { flex: 1, height: 40, fontSize: 14, color: '#1a1a1a' },
    countryRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
    countryRowActive: { backgroundColor: '#FFF8EE' },
    countryFlag: { fontSize: 22 },
    countryName: { flex: 1, fontSize: 14, color: '#1C2E4A', fontWeight: '500' },
    countryDial: { fontSize: 13, color: '#9AA3B0', fontWeight: '600' },
});

export default RegisterScreen;
