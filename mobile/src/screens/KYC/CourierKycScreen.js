import { API_BASE } from '../../services/api.service';
import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Alert,
    Image,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api.service';
import { useAuth } from '../../context/AuthContext';

const { width: W } = Dimensions.get('window');
const BROWN  = '#5D4037';
const NAVY   = '#1C2E4A';
const ORANGE = '#FFA726';

const STEPS = [
    { key: 'intro',    title: 'Bienvenue',       icon: 'bicycle' },
    { key: 'personal', title: 'Informations',     icon: 'person' },
    { key: 'docs',     title: 'Pièce d\'identité', icon: 'card' },
    { key: 'selfie',   title: 'Selfie',           icon: 'camera' },
    { key: 'review',   title: 'Récapitulatif',    icon: 'checkmark-circle' },
];

const TRANSPORTS = [
    { key: 'scooter', label: 'Scooter / Moto', icon: 'speedometer-outline' },
    { key: 'velo',    label: 'Vélo',           icon: 'bicycle-outline' },
    { key: 'voiture', label: 'Voiture',         icon: 'car-outline' },
    { key: 'a_pied',  label: 'À pied',          icon: 'walk-outline' },
];

export default function CourierKycScreen({ navigation }) {
    const { user } = useAuth();
    const [step,     setStep]     = useState(0);
    const [saving,   setSaving]   = useState(false);
    const slideAnim = useRef(new Animated.Value(0)).current;

    const [form, setForm] = useState({
        full_name:          user?.name  || '',
        date_of_birth:      '',
        phone:              user?.phone || '',
        address:            '',
        city:               '',
        national_id_number: '',
        transport_type:     'scooter',
    });
    const [docs,      setDocs]      = useState({ id_front: null, id_back: null, selfie: null });
    const [uploading, setUploading] = useState({});

    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const goTo = (next) => {
        Animated.timing(slideAnim, { toValue: -W, duration: 180, useNativeDriver: true }).start(() => {
            setStep(next);
            slideAnim.setValue(W);
            Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        });
    };

    const pickImage = async (docKey) => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            Alert.alert('Permission requise', 'Autorisez l\'accès à la galerie pour uploader vos documents.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.75,
            allowsEditing: true,
        });
        if (result.canceled) return;

        const asset = result.assets[0];
        setUploading(u => ({ ...u, [docKey]: true }));
        try {
            const formData = new FormData();
            formData.append('file', { uri: asset.uri, type: 'image/jpeg', name: `${docKey}.jpg` });
            const res = await api.post('/verifications/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setDocs(d => ({ ...d, [docKey]: res.data.url }));
        } catch (e) {
            Alert.alert('Erreur', 'Impossible d\'uploader le document. Réessayez.');
        } finally {
            setUploading(u => ({ ...u, [docKey]: false }));
        }
    };

    const handleSubmit = async () => {
        setSaving(true);
        try {
            await api.post('/verifications/courier', {
                ...form,
                docs,
                submit: true,
            });
            Alert.alert(
                'Dossier soumis !',
                'Votre dossier a été transmis à notre équipe. Vous recevrez une réponse sous 24–48h.',
                [{ text: 'OK', onPress: () => navigation.replace('CourierHome') }]
            );
        } catch (e) {
            Alert.alert('Erreur', e.response?.data?.error || 'Impossible de soumettre le dossier');
        } finally {
            setSaving(false);
        }
    };

    const DocUpload = ({ docKey, label }) => {
        const isUploading = uploading[docKey];
        const uri = docs[docKey];
        return (
            <TouchableOpacity style={styles.docBox} onPress={() => pickImage(docKey)} activeOpacity={0.7}>
                {isUploading ? (
                    <ActivityIndicator color={BROWN} />
                ) : uri ? (
                    <>
                        <Image
                            source={{ uri: uri.startsWith('http') ? uri : API_BASE + uri }}
                            style={styles.docImage}
                        />
                        <View style={styles.docOverlay}>
                            <Ionicons name="checkmark-circle" size={28} color="#fff" />
                        </View>
                    </>
                ) : (
                    <>
                        <Ionicons name="camera-outline" size={28} color="#aaa" />
                        <Text style={styles.docLabel}>{label}</Text>
                    </>
                )}
            </TouchableOpacity>
        );
    };

    const renderStep = () => {
        switch (STEPS[step].key) {

            case 'intro':
                return (
                    <View style={styles.stepContent}>
                        <View style={styles.heroIcon}>
                            <Ionicons name="bicycle" size={56} color={BROWN} />
                        </View>
                        <Text style={styles.heroTitle}>Devenir Coursier Ombia</Text>
                        <Text style={styles.heroSub}>
                            Livrez des colis et des commandes en express dans votre ville et gagnez jusqu'à{' '}
                            <Text style={{ fontWeight: '800', color: BROWN }}>80% du tarif</Text> de chaque livraison.
                        </Text>

                        <View style={styles.stepsList}>
                            {[
                                { icon: 'person-outline',       text: 'Informations personnelles + CNI' },
                                { icon: 'camera-outline',       text: 'Selfie de vérification' },
                                { icon: 'shield-checkmark-outline', text: 'Validation par notre équipe (24–48h)' },
                                { icon: 'bicycle-outline',      text: 'Commencez à livrer !' },
                            ].map((s, i) => (
                                <View key={i} style={styles.stepsRow}>
                                    <View style={styles.stepNum}>
                                        <Text style={styles.stepNumText}>{i + 1}</Text>
                                    </View>
                                    <Ionicons name={s.icon} size={18} color={BROWN} style={{ marginHorizontal: 8 }} />
                                    <Text style={styles.stepText}>{s.text}</Text>
                                </View>
                            ))}
                        </View>

                        <TouchableOpacity style={styles.nextBtn} onPress={() => goTo(1)}>
                            <Text style={styles.nextBtnText}>Commencer</Text>
                            <Ionicons name="arrow-forward" size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>
                );

            case 'personal':
                return (
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <View style={styles.stepContent}>
                            <Text style={styles.stepTitle}>Informations personnelles</Text>

                            {[
                                { key: 'full_name',          label: 'Nom complet *',       placeholder: 'Jean Dupont' },
                                { key: 'date_of_birth',      label: 'Date de naissance',   placeholder: 'YYYY-MM-DD' },
                                { key: 'phone',              label: 'Téléphone *',          placeholder: '+241 00 00 00 00' },
                                { key: 'address',            label: 'Adresse',             placeholder: 'Quartier, rue…' },
                                { key: 'city',               label: 'Ville *',             placeholder: 'Libreville' },
                                { key: 'national_id_number', label: 'N° pièce d\'identité', placeholder: 'CNI ou passeport' },
                            ].map(f => (
                                <View key={f.key} style={styles.fieldWrap}>
                                    <Text style={styles.fieldLabel}>{f.label}</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={form[f.key]}
                                        onChangeText={v => setField(f.key, v)}
                                        placeholder={f.placeholder}
                                        placeholderTextColor="#C0C8D0"
                                    />
                                </View>
                            ))}

                            <Text style={styles.fieldLabel}>Moyen de transport</Text>
                            <View style={styles.chips}>
                                {TRANSPORTS.map(t => (
                                    <TouchableOpacity
                                        key={t.key}
                                        style={[styles.chip, form.transport_type === t.key && styles.chipActive]}
                                        onPress={() => setField('transport_type', t.key)}
                                    >
                                        <Ionicons name={t.icon} size={16} color={form.transport_type === t.key ? '#fff' : '#555'} />
                                        <Text style={[styles.chipText, form.transport_type === t.key && styles.chipTextActive]}>{t.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TouchableOpacity
                                style={[styles.nextBtn, (!form.full_name || !form.phone || !form.city) && { opacity: 0.4 }]}
                                onPress={() => goTo(2)}
                                disabled={!form.full_name || !form.phone || !form.city}
                            >
                                <Text style={styles.nextBtnText}>Continuer</Text>
                                <Ionicons name="arrow-forward" size={18} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                );

            case 'docs':
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Pièce d'identité</Text>
                        <Text style={styles.stepSub}>Uploadez les photos de votre CNI ou passeport (recto et verso).</Text>
                        <View style={styles.docRow}>
                            <DocUpload docKey="id_front" label="Recto" />
                            <DocUpload docKey="id_back"  label="Verso" />
                        </View>
                        <TouchableOpacity
                            style={[styles.nextBtn, (!docs.id_front || !docs.id_back) && { opacity: 0.4 }]}
                            onPress={() => goTo(3)}
                            disabled={!docs.id_front || !docs.id_back}
                        >
                            <Text style={styles.nextBtnText}>Continuer</Text>
                            <Ionicons name="arrow-forward" size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>
                );

            case 'selfie':
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Selfie de vérification</Text>
                        <Text style={styles.stepSub}>
                            Prenez une photo de vous tenant votre pièce d'identité. Assurez-vous que votre visage et le document soient bien visibles.
                        </Text>
                        <View style={{ alignItems: 'center', marginVertical: 20 }}>
                            <DocUpload docKey="selfie" label="Photo selfie + CNI" />
                        </View>
                        <TouchableOpacity
                            style={[styles.nextBtn, !docs.selfie && { opacity: 0.4 }]}
                            onPress={() => goTo(4)}
                            disabled={!docs.selfie}
                        >
                            <Text style={styles.nextBtnText}>Continuer</Text>
                            <Ionicons name="arrow-forward" size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>
                );

            case 'review':
                return (
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.stepContent}>
                            <Text style={styles.stepTitle}>Récapitulatif</Text>
                            {[
                                ['Nom',            form.full_name],
                                ['Téléphone',      form.phone],
                                ['Ville',          form.city],
                                ['N° pièce',       form.national_id_number || '—'],
                                ['Transport',      TRANSPORTS.find(t => t.key === form.transport_type)?.label || '—'],
                            ].map(([k, v]) => (
                                <View key={k} style={styles.reviewRow}>
                                    <Text style={styles.reviewKey}>{k}</Text>
                                    <Text style={styles.reviewVal}>{v}</Text>
                                </View>
                            ))}
                            <View style={styles.reviewRow}>
                                <Text style={styles.reviewKey}>Documents</Text>
                                <View style={styles.docsStatus}>
                                    <Ionicons name={docs.id_front ? 'checkmark-circle' : 'close-circle'} size={16} color={docs.id_front ? '#2E7D32' : '#C62828'} />
                                    <Text style={styles.docsStatusText}>CNI recto</Text>
                                    <Ionicons name={docs.id_back ? 'checkmark-circle' : 'close-circle'} size={16} color={docs.id_back ? '#2E7D32' : '#C62828'} />
                                    <Text style={styles.docsStatusText}>CNI verso</Text>
                                    <Ionicons name={docs.selfie ? 'checkmark-circle' : 'close-circle'} size={16} color={docs.selfie ? '#2E7D32' : '#C62828'} />
                                    <Text style={styles.docsStatusText}>Selfie</Text>
                                </View>
                            </View>

                            <View style={styles.infoBox}>
                                <Ionicons name="time-outline" size={16} color={ORANGE} />
                                <Text style={styles.infoBoxText}>
                                    Notre équipe examinera votre dossier sous <Text style={{ fontWeight: '700' }}>24–48 heures</Text>. Vous serez notifié dès la décision.
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={[styles.submitBtn, saving && { opacity: 0.6 }]}
                                onPress={handleSubmit}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                                        <Text style={styles.nextBtnText}>Soumettre le dossier</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                );

            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => step > 0 ? goTo(step - 1) : navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={NAVY} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{STEPS[step].title}</Text>
                <Text style={styles.headerStep}>{step + 1}/{STEPS.length}</Text>
            </View>

            {/* Step progress */}
            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
            </View>

            {/* Step dots */}
            <View style={styles.stepDots}>
                {STEPS.map((s, i) => (
                    <View key={i} style={[styles.stepDot, i <= step && styles.stepDotActive]} />
                ))}
            </View>

            {/* Content */}
            <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20} style={{ flex: 1 }}>
                <Animated.View style={[{ flex: 1 }, { transform: [{ translateX: slideAnim }] }]}>
                    {renderStep()}
                </Animated.View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container:   { flex: 1, backgroundColor: '#F8F9FB' },
    header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '800', color: NAVY },
    headerStep:  { fontSize: 13, color: '#aaa', fontWeight: '600' },
    progressBar: { height: 3, backgroundColor: '#E0E0E0' },
    progressFill:{ height: 3, backgroundColor: BROWN },
    stepDots:    { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 8 },
    stepDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0E0E0' },
    stepDotActive:{ backgroundColor: BROWN },

    stepContent: { padding: 20, paddingBottom: 40 },
    heroIcon:    { width: 88, height: 88, borderRadius: 24, backgroundColor: '#EFEBE9', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 },
    heroTitle:   { fontSize: 22, fontWeight: '800', color: NAVY, textAlign: 'center', marginBottom: 8 },
    heroSub:     { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 20, marginBottom: 24 },

    stepsList:   { width: '100%', marginBottom: 28 },
    stepsRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    stepNum:     { width: 26, height: 26, borderRadius: 13, backgroundColor: BROWN, alignItems: 'center', justifyContent: 'center' },
    stepNumText: { color: '#fff', fontSize: 12, fontWeight: '800' },
    stepText:    { flex: 1, fontSize: 13, color: '#444' },

    stepTitle: { fontSize: 18, fontWeight: '800', color: NAVY, marginBottom: 6 },
    stepSub:   { fontSize: 13, color: '#888', lineHeight: 18, marginBottom: 20 },

    fieldWrap: { marginBottom: 14 },
    fieldLabel:{ fontSize: 11, fontWeight: '700', color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
    input:     { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E8EAF0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: NAVY },

    chips:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    chip:         { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E8EAF0' },
    chipActive:   { backgroundColor: BROWN, borderColor: BROWN },
    chipText:     { fontSize: 13, fontWeight: '600', color: '#555' },
    chipTextActive:{ color: '#fff' },

    docRow:    { flexDirection: 'row', gap: 12, marginBottom: 24 },
    docBox:    { flex: 1, height: 110, borderRadius: 12, borderWidth: 1.5, borderColor: '#E8EAF0', borderStyle: 'dashed', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    docImage:  { width: '100%', height: '100%', resizeMode: 'cover' },
    docOverlay:{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(93,64,55,0.5)', alignItems: 'center', justifyContent: 'center' },
    docLabel:  { fontSize: 11, color: '#aaa', marginTop: 6, fontWeight: '600' },

    reviewRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    reviewKey:     { fontSize: 13, color: '#888', fontWeight: '600' },
    reviewVal:     { fontSize: 13, color: NAVY, fontWeight: '700', maxWidth: '60%', textAlign: 'right' },
    docsStatus:    { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' },
    docsStatusText:{ fontSize: 11, color: '#555' },

    infoBox:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFF8E1', borderRadius: 12, padding: 12, marginTop: 16, marginBottom: 24 },
    infoBoxText: { flex: 1, fontSize: 13, color: '#6D4C00', lineHeight: 18 },

    nextBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: BROWN, paddingVertical: 16, borderRadius: 14, marginTop: 8, shadowColor: BROWN, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 5 },
    nextBtnText:{ color: '#fff', fontSize: 16, fontWeight: '700' },
    submitBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2E7D32', paddingVertical: 16, borderRadius: 14, shadowColor: '#2E7D32', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 5 },
});
