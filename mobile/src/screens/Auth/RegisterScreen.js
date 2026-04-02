import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
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
import { useAuth } from '../../context/AuthContext';
import { COUNTRIES } from '../../constants/countries';

const { width: screenWidth } = Dimensions.get('window');
const MINI_W    = screenWidth * 0.48;
const MINI_H    = MINI_W * 0.48;
const MINI_RING = MINI_W * 0.44;

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
    const [country,         setCountry]         = useState(COUNTRIES[0]); // Gabon default
    const [localPhone,      setLocalPhone]      = useState('');
    const [password,        setPassword]        = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading,         setLoading]         = useState(false);
    const [accepted,        setAccepted]        = useState(false);
    const [pickerOpen,      setPickerOpen]      = useState(false);
    const [searchQuery,     setSearchQuery]     = useState('');
    const { register } = useAuth();

    // Strip leading zeros: 077724499 → 24177724499
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
            Alert.alert('Conditions requises', "Veuillez accepter les Conditions d'utilisation et la Politique de confidentialité pour continuer.");
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
                style={{ flex: 1 }}
            >
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.content}>

                    {/* Header */}
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#1C2E4A" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Créer un compte</Text>
                    <View style={styles.subtitleRow}>
                        <Text style={styles.subtitle}>Rejoignez Ombia Express</Text>
                        <View style={styles.miniLogoSection}>
                            <View style={styles.miniRingsWrap}>
                                <MiniPulseRing delay={0}   color="#FFA726" thickness={1.5} />
                                <MiniPulseRing delay={700} color="#4DB6E8" thickness={1.5} />
                            </View>
                            <Image
                                source={require('../../../assets/logo.png')}
                                style={styles.miniLogo}
                                resizeMode="contain"
                            />
                        </View>
                    </View>

                    {/* Form */}
                    <Text style={styles.sectionLabel}>Informations personnelles :</Text>
                    <View style={styles.form}>

                        {/* Name */}
                        <View style={styles.inputContainer}>
                            <Ionicons name="person-outline" size={20} color="#bbb" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Nom complet"
                                placeholderTextColor="#bbb"
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                            />
                        </View>

                        {/* Email (optional) */}
                        <View style={styles.inputContainer}>
                            <Ionicons name="mail-outline" size={20} color="#4DB6E8" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Email (optionnel)"
                                placeholderTextColor="#bbb"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>

                        {/* Phone with country picker */}
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
                            />
                        </View>

                        {/* Preview of full number */}
                        {localPhone.length > 0 && (
                            <Text style={styles.phonePreview}>
                                Numéro complet : +{buildFullPhone()}
                            </Text>
                        )}

                        {/* Password */}
                        <View style={styles.inputContainer}>
                            <Ionicons name="lock-closed-outline" size={20} color="#bbb" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Mot de passe"
                                placeholderTextColor="#bbb"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                autoCapitalize="none"
                            />
                        </View>

                        {/* Confirm password */}
                        <View style={[styles.inputContainer, styles.inputBlue]}>
                            <Ionicons name="shield-checkmark-outline" size={20} color="#4DB6E8" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Confirmer le mot de passe"
                                placeholderTextColor="#bbb"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                                autoCapitalize="none"
                            />
                        </View>

                        {/* Legal consent */}
                        <TouchableOpacity
                            style={styles.consentRow}
                            onPress={() => setAccepted(v => !v)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
                                {accepted && <Ionicons name="checkmark" size={13} color="#fff" />}
                            </View>
                            <Text style={styles.consentText}>
                                {'J\'ai lu et j\'accepte les '}
                                <Text
                                    style={styles.consentLink}
                                    onPress={() => navigation.navigate('Terms')}
                                >
                                    Conditions d'utilisation
                                </Text>
                                {' et la '}
                                <Text
                                    style={styles.consentLink}
                                    onPress={() => navigation.navigate('PrivacyPolicy')}
                                >
                                    Politique de confidentialité
                                </Text>
                                {' d\'Ombia Express.'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, (!accepted || loading) && styles.buttonDisabled]}
                            onPress={handleRegister}
                            disabled={loading || !accepted}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Créer mon compte</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.linkButton}
                            onPress={() => navigation.navigate('Login')}
                        >
                            <Text style={styles.linkText}>
                                {'Déjà un compte ? '}
                                <Text style={styles.linkTextBold}>Se connecter</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    content:   { padding: 22, paddingTop: 12 },
    backButton:{ marginBottom: 18 },

    title: {
        fontSize: 30,
        fontWeight: '800',
        color: '#1C2E4A',
        marginBottom: 4,
    },
    subtitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 28,
    },
    subtitle: {
        fontSize: 15,
        color: '#aaa',
    },
    miniLogoSection: {
        alignItems: 'center',
        justifyContent: 'center',
        width: MINI_W,
        height: MINI_H,
        marginLeft: 6,
    },
    miniRingsWrap: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        width: MINI_RING,
        height: MINI_RING,
    },
    miniLogo: {
        width: MINI_W,
        height: MINI_H,
    },

    sectionLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1C2E4A',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 12,
        marginTop: 4,
        opacity: 0.6,
        borderLeftWidth: 3,
        borderLeftColor: '#4DB6E8',
        paddingLeft: 8,
    },

    form: { width: '100%' },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#efefef',
        borderRadius: 14,
        marginBottom: 12,
        paddingHorizontal: 16,
        backgroundColor: '#fafafa',
    },
    inputBlue: {
        borderColor: 'rgba(77,182,232,0.25)',
    },
    inputIcon: { marginRight: 12 },
    input: {
        flex: 1,
        height: 50,
        fontSize: 16,
        color: '#1a1a1a',
    },

    // Dial picker
    dialPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingRight: 6,
    },
    dialFlag: { fontSize: 20 },
    dialCode:  { fontSize: 14, fontWeight: '700', color: '#1C2E4A' },
    dialDivider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(77,182,232,0.3)',
        marginHorizontal: 10,
    },

    phonePreview: {
        fontSize: 11,
        color: '#4DB6E8',
        marginTop: -6,
        marginBottom: 10,
        marginLeft: 4,
        fontWeight: '600',
    },

    button: {
        backgroundColor: '#FFA726',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 8,
        shadowColor: '#FFA726',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 5,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.4,
    },
    linkButton: {
        marginTop: 20,
        marginBottom: 32,
        alignItems: 'center',
    },
    linkText:     { color: '#aaa', fontSize: 14 },
    linkTextBold: { color: '#4DB6E8', fontWeight: '700' },

    // Legal consent
    consentRow: {
        flexDirection:  'row',
        alignItems:     'flex-start',
        gap:            10,
        marginTop:      16,
        marginBottom:   10,
        backgroundColor: '#F8FAFC',
        borderRadius:   12,
        borderWidth:    1,
        borderColor:    '#E5E7EB',
        padding:        12,
    },
    checkbox: {
        width:          20,
        height:         20,
        borderRadius:   6,
        borderWidth:    2,
        borderColor:    '#D1D5DB',
        backgroundColor: '#fff',
        alignItems:     'center',
        justifyContent: 'center',
        marginTop:      1,
        flexShrink:     0,
    },
    checkboxChecked: {
        backgroundColor: '#FFA726',
        borderColor:     '#FFA726',
    },
    consentText: {
        flex:       1,
        fontSize:   12,
        color:      '#6B7280',
        lineHeight: 18,
    },
    consentLink: {
        color:      '#FFA726',
        fontWeight: '700',
        textDecorationLine: 'underline',
    },

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

export default RegisterScreen;
