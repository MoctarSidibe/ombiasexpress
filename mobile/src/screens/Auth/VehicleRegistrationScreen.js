import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { vehicleAPI } from '../../services/api.service';

const VEHICLE_TYPES = [
    { key: 'economy',  label: 'Économique' },
    { key: 'comfort',  label: 'Confort'    },
    { key: 'premium',  label: 'Premium'    },
    { key: 'xl',       label: 'XL'         },
];

const VehicleRegistrationScreen = ({ navigation }) => {
    const { user } = useAuth();
    const isFleetOwner = user?.role === 'fleet_owner';

    const [make,         setMake]         = useState('');
    const [model,        setModel]        = useState('');
    const [year,         setYear]         = useState('');
    const [color,        setColor]        = useState('');
    const [licensePlate, setLicensePlate] = useState('');
    const [vehicleType,  setVehicleType]  = useState('economy');
    const [driveSelf,    setDriveSelf]    = useState(false);
    const [licenseNum,   setLicenseNum]   = useState('');
    const [loading,      setLoading]      = useState(false);

    const homeScreen = isFleetOwner ? 'FleetOwnerHome' : 'DriverHome';

    const handleSkip = () => navigation.replace(homeScreen);

    const handleSubmit = async () => {
        if (!make.trim() || !model.trim() || !year.trim() || !color.trim() || !licensePlate.trim()) {
            Alert.alert('Champs manquants', 'Veuillez remplir tous les champs du véhicule');
            return;
        }
        if (isFleetOwner && driveSelf && !licenseNum.trim()) {
            Alert.alert('Champs manquants', 'Veuillez entrer votre numéro de permis');
            return;
        }
        const yearNum = parseInt(year, 10);
        if (isNaN(yearNum) || yearNum < 2000 || yearNum > new Date().getFullYear() + 1) {
            Alert.alert('Année invalide', 'Veuillez entrer une année valide (2000 ou plus)');
            return;
        }

        setLoading(true);
        try {
            await vehicleAPI.create({
                make:         make.trim(),
                model:        model.trim(),
                year:         yearNum,
                color:        color.trim(),
                license_plate: licensePlate.trim().toUpperCase(),
                vehicle_type: vehicleType,
                seats:        4,
                is_fleet_car: isFleetOwner,
                owner_drives: isFleetOwner ? driveSelf : false,
            });
            Alert.alert(
                'Véhicule enregistré',
                'Votre véhicule a été soumis pour vérification. Vous serez notifié une fois approuvé.',
                [{ text: 'Continuer', onPress: () => navigation.replace(homeScreen) }]
            );
        } catch (err) {
            const message = err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Enregistrement échoué';
            Alert.alert('Erreur', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20} style={{ flex: 1 }}>
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.content}>

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.iconWrap}>
                            <Ionicons name={isFleetOwner ? 'shield-checkmark' : 'car-sport'} size={34} color="#FFA726" />
                        </View>
                        <Text style={styles.title}>
                            {isFleetOwner ? 'Enregistrer mon véhicule' : 'Mon véhicule'}
                        </Text>
                        <Text style={styles.subtitle}>
                            {isFleetOwner
                                ? 'Ajoutez votre véhicule à la flotte Ombia Express'
                                : 'Ajoutez votre véhicule pour commencer à conduire'}
                        </Text>
                    </View>

                    {/* Fleet owner: drive-self toggle */}
                    {isFleetOwner && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Mode de délégation</Text>
                            <TouchableOpacity
                                style={[styles.modeCard, !driveSelf && styles.modeCardActive]}
                                onPress={() => setDriveSelf(false)}
                            >
                                <View style={styles.modeRow}>
                                    <Ionicons
                                        name="people-outline"
                                        size={22}
                                        color={!driveSelf ? '#FFA726' : '#999'}
                                    />
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={[styles.modeTitle, !driveSelf && styles.modeTitleActive]}>
                                            Ombia assigne un chauffeur
                                        </Text>
                                        <Text style={styles.modeSub}>
                                            Ombia affecte un chauffeur qualifié à votre véhicule
                                        </Text>
                                    </View>
                                    {!driveSelf && (
                                        <Ionicons name="checkmark-circle" size={20} color="#FFA726" />
                                    )}
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modeCard, driveSelf && styles.modeCardActive]}
                                onPress={() => setDriveSelf(true)}
                            >
                                <View style={styles.modeRow}>
                                    <Ionicons
                                        name="car-sport-outline"
                                        size={22}
                                        color={driveSelf ? '#4DB6E8' : '#999'}
                                    />
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={[styles.modeTitle, driveSelf && styles.modeTitleBlue]}>
                                            Je conduis moi-même
                                        </Text>
                                        <Text style={styles.modeSub}>
                                            Vous êtes le chauffeur de votre propre véhicule de flotte
                                        </Text>
                                    </View>
                                    {driveSelf && (
                                        <Ionicons name="checkmark-circle" size={20} color="#4DB6E8" />
                                    )}
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* License field for self-driving fleet owner */}
                    {isFleetOwner && driveSelf && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Permis de conduire</Text>
                            <View style={[styles.inputContainer, styles.inputBlue]}>
                                <Ionicons name="card-outline" size={20} color="#4DB6E8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Numéro de permis de conduire"
                                    placeholderTextColor="#bbb"
                                    value={licenseNum}
                                    onChangeText={setLicenseNum}
                                    autoCapitalize="characters"
                                />
                            </View>
                        </View>
                    )}

                    {/* Vehicle details */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Informations du véhicule</Text>

                        <View style={styles.row}>
                            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                                <Ionicons name="business-outline" size={18} color="#bbb" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Marque (ex: Toyota)"
                                    placeholderTextColor="#bbb"
                                    value={make}
                                    onChangeText={setMake}
                                />
                            </View>
                            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                                <Ionicons name="car-outline" size={18} color="#bbb" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Modèle (ex: Corolla)"
                                    placeholderTextColor="#bbb"
                                    value={model}
                                    onChangeText={setModel}
                                />
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                                <Ionicons name="calendar-outline" size={18} color="#bbb" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Année"
                                    placeholderTextColor="#bbb"
                                    value={year}
                                    onChangeText={setYear}
                                    keyboardType="numeric"
                                    maxLength={4}
                                />
                            </View>
                            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                                <Ionicons name="color-palette-outline" size={18} color="#bbb" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Couleur"
                                    placeholderTextColor="#bbb"
                                    value={color}
                                    onChangeText={setColor}
                                />
                            </View>
                        </View>

                        <View style={[styles.inputContainer, styles.inputAccent]}>
                            <Ionicons name="id-card-outline" size={20} color="#FFA726" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Plaque d'immatriculation"
                                placeholderTextColor="#bbb"
                                value={licensePlate}
                                onChangeText={setLicensePlate}
                                autoCapitalize="characters"
                            />
                        </View>

                        {/* Vehicle type */}
                        <Text style={styles.fieldLabel}>Catégorie du véhicule</Text>
                        <View style={styles.typeGrid}>
                            {VEHICLE_TYPES.map(t => (
                                <TouchableOpacity
                                    key={t.key}
                                    style={[styles.typeBtn, vehicleType === t.key && styles.typeBtnActive]}
                                    onPress={() => setVehicleType(t.key)}
                                >
                                    <Text style={[styles.typeText, vehicleType === t.key && styles.typeTextActive]}>
                                        {t.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Submit */}
                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.buttonText}>Enregistrer mon véhicule</Text>
                        }
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                        <Text style={styles.skipText}>Passer pour l'instant</Text>
                    </TouchableOpacity>

                </View>
            </ScrollView></KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    content:   { padding: 22, paddingBottom: 40 },

    header: {
        alignItems: 'center',
        marginBottom: 28,
        paddingTop: 8,
    },
    iconWrap: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: '#FFF8EE',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 14,
        shadowColor: '#FFA726', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15, shadowRadius: 10, elevation: 3,
    },
    title: {
        fontSize: 24, fontWeight: '800', color: '#1C2E4A',
        marginBottom: 6, textAlign: 'center',
    },
    subtitle: {
        fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20,
    },

    section: { marginBottom: 22 },
    sectionTitle: {
        fontSize: 13, fontWeight: '700', color: '#1C2E4A',
        textTransform: 'uppercase', letterSpacing: 0.6,
        marginBottom: 12, opacity: 0.6,
        borderLeftWidth: 3, borderLeftColor: '#FFA726', paddingLeft: 8,
    },

    /* delegation mode cards */
    modeCard: {
        borderWidth: 1.5, borderColor: '#efefef', borderRadius: 14,
        padding: 14, marginBottom: 10, backgroundColor: '#fafafa',
    },
    modeCardActive: {
        borderColor: 'rgba(255,167,38,0.4)', backgroundColor: '#FFF8EE',
    },
    modeRow: { flexDirection: 'row', alignItems: 'center' },
    modeTitle: { fontSize: 14, fontWeight: '700', color: '#999', marginBottom: 3 },
    modeTitleActive: { color: '#FFA726' },
    modeTitleBlue:   { color: '#4DB6E8' },
    modeSub: { fontSize: 12, color: '#bbb', lineHeight: 17 },

    /* inputs */
    row: { flexDirection: 'row', marginBottom: 0 },
    inputContainer: {
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1.5, borderColor: '#efefef',
        borderRadius: 14, marginBottom: 12,
        paddingHorizontal: 14, backgroundColor: '#fafafa',
    },
    inputAccent: {
        borderColor: 'rgba(255,167,38,0.35)', backgroundColor: '#FFF8EE',
    },
    inputBlue: {
        borderColor: 'rgba(77,182,232,0.3)', backgroundColor: '#F0F8FF',
    },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, height: 50, fontSize: 15, color: '#1a1a1a' },

    fieldLabel: {
        fontSize: 13, fontWeight: '600', color: '#666',
        marginBottom: 10, marginTop: 4,
    },
    typeGrid: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    },
    typeBtn: {
        paddingVertical: 9, paddingHorizontal: 18,
        borderRadius: 20, borderWidth: 1.5, borderColor: '#ddd',
        backgroundColor: '#fafafa',
    },
    typeBtnActive: { backgroundColor: '#FFA726', borderColor: '#FFA726' },
    typeText:       { fontSize: 13, fontWeight: '600', color: '#888' },
    typeTextActive: { color: '#fff' },

    button: {
        backgroundColor: '#FFA726',
        paddingVertical: 16, borderRadius: 14,
        alignItems: 'center', marginTop: 8,
        shadowColor: '#FFA726', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35, shadowRadius: 12, elevation: 5,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.4 },

    skipButton: { paddingVertical: 18, alignItems: 'center' },
    skipText:   { color: '#bbb', fontSize: 15, fontWeight: '500' },
});

export default VehicleRegistrationScreen;
