import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, ActivityIndicator, Alert, Image,
    Animated, Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api.service';
import { useAuth } from '../../context/AuthContext';

const { width: W } = Dimensions.get('window');

const STEPS = [
    { key: 'intro',     title: 'Bienvenue',           icon: 'shield-checkmark' },
    { key: 'personal',  title: 'Informations',         icon: 'person' },
    { key: 'id_docs',   title: 'Pièce d\'identité',   icon: 'card' },
    { key: 'license',   title: 'Permis de conduire',   icon: 'document-text' },
    { key: 'selfie',    title: 'Selfie',               icon: 'camera' },
    { key: 'appt',      title: 'Rendez-vous',          icon: 'calendar' },
    { key: 'review',    title: 'Récapitulatif',        icon: 'checkmark-circle' },
];

const OFFICES = [
    'Agence Yaoundé Centre',
    'Agence Douala Akwa',
    'Agence Bafoussam',
    'Agence Garoua',
];

const ACCENT = '#1C2E4A';
const ORANGE = '#FFA726';

export default function DriverKycScreen({ navigation }) {
    const { user } = useAuth();
    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const slideAnim = useRef(new Animated.Value(0)).current;

    // Form state
    const [form, setForm] = useState({
        full_name:          user?.name  || '',
        date_of_birth:      '',
        phone:              user?.phone || '',
        address:            '',
        city:               '',
        national_id_number: '',
        license_number:     '',
    });
    const [docs, setDocs] = useState({
        id_front: null, id_back: null,
        license_front: null, license_back: null,
        selfie: null,
    });
    const [appt, setAppt] = useState({ date: '', office: OFFICES[0] });
    const [uploading, setUploading] = useState({});

    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const goTo = (next) => {
        Animated.sequence([
            Animated.timing(slideAnim, { toValue: -W, duration: 180, useNativeDriver: true }),
        ]).start(() => {
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
            aspect: [4, 3],
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
            setDocs(d => ({ ...d, [docKey]: { uri: asset.uri, url: res.data.url } }));
        } catch (e) {
            Alert.alert('Erreur upload', e.response?.data?.error || 'Impossible d\'uploader l\'image');
        } finally {
            setUploading(u => ({ ...u, [docKey]: false }));
        }
    };

    // Convert DD/MM/YYYY to YYYY-MM-DD for the API
    const formatDateForApi = (str) => {
        if (!str) return null;
        const parts = str.split('/');
        if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
        return str; // already in another format, pass as-is
    };

    const saveProgress = async (submit = false) => {
        setSaving(true);
        try {
            const docsPayload = {};
            Object.entries(docs).forEach(([k, v]) => { if (v?.url) docsPayload[k] = v.url; });
            await api.post('/verifications/driver', {
                ...form,
                date_of_birth:     formatDateForApi(form.date_of_birth),
                docs: docsPayload,
                appointment_date:  appt.date    || null,
                office_location:   appt.office  || null,
                submit,
            });
        } catch (e) {
            Alert.alert('Erreur', e.response?.data?.error || 'Impossible de sauvegarder');
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async () => {
        // Validate required docs
        const required = ['id_front', 'id_back', 'license_front', 'license_back', 'selfie'];
        const missing = required.filter(k => !docs[k]?.url);
        if (missing.length > 0) {
            Alert.alert('Documents manquants', 'Veuillez uploader tous les documents requis.');
            return;
        }
        await saveProgress(true);
        navigation.replace('KycStatus', { type: 'driver' });
    };

    const renderProgress = () => (
        <View style={styles.progressWrap}>
            {STEPS.map((s, i) => (
                <View key={s.key} style={styles.progressItem}>
                    <View style={[styles.progressDot, i <= step && styles.progressDotActive, i < step && styles.progressDotDone]}>
                        {i < step
                            ? <Ionicons name="checkmark" size={10} color="#fff" />
                            : <Text style={[styles.progressNum, i <= step && styles.progressNumActive]}>{i + 1}</Text>
                        }
                    </View>
                    {i < STEPS.length - 1 && (
                        <View style={[styles.progressLine, i < step && styles.progressLineDone]} />
                    )}
                </View>
            ))}
        </View>
    );

    const DocBox = ({ label, docKey, icon = 'image-outline' }) => {
        const doc = docs[docKey];
        const isUploading = uploading[docKey];
        return (
            <TouchableOpacity style={[styles.docBox, doc && styles.docBoxDone]} onPress={() => pickImage(docKey)} disabled={isUploading}>
                {isUploading ? (
                    <ActivityIndicator color={ORANGE} />
                ) : doc ? (
                    <>
                        <Image source={{ uri: doc.uri }} style={styles.docThumb} />
                        <View style={styles.docCheck}>
                            <Ionicons name="checkmark-circle" size={22} color="#2E7D32" />
                        </View>
                    </>
                ) : (
                    <>
                        <Ionicons name={icon} size={28} color="#ccc" />
                        <Text style={styles.docLabel}>{label}</Text>
                        <Text style={styles.docTap}>Appuyer pour uploader</Text>
                    </>
                )}
            </TouchableOpacity>
        );
    };

    const renderStep = () => {
        switch (STEPS[step].key) {

            case 'intro':
                return (
                    <View style={styles.introWrap}>
                        <View style={styles.introIcon}>
                            <Ionicons name="car-sport" size={52} color={ACCENT} />
                        </View>
                        <Text style={styles.introTitle}>Devenez Chauffeur Ombia</Text>
                        <Text style={styles.introSub}>
                            Pour garantir la sécurité de tous, nous vérifions l'identité et les documents de chaque chauffeur.
                        </Text>
                        <View style={styles.checklist}>
                            {[
                                { icon: 'card-outline',          text: 'Pièce d\'identité nationale (recto/verso)' },
                                { icon: 'document-text-outline', text: 'Permis de conduire valide (recto/verso)' },
                                { icon: 'camera-outline',        text: 'Selfie tenant votre pièce d\'identité' },
                                { icon: 'business-outline',      text: 'Rendez-vous physique en agence' },
                            ].map(({ icon, text }) => (
                                <View key={text} style={styles.checkRow}>
                                    <View style={styles.checkIcon}><Ionicons name={icon} size={18} color={ORANGE} /></View>
                                    <Text style={styles.checkText}>{text}</Text>
                                </View>
                            ))}
                        </View>
                        <View style={styles.infoBox}>
                            <Ionicons name="time-outline" size={16} color="#0288D1" />
                            <Text style={styles.infoText}>Durée estimée : 5–10 min · Délai de vérification : 24–48h</Text>
                        </View>
                    </View>
                );

            case 'personal':
                return (
                    <View>
                        <Text style={styles.stepTitle}>Vos informations personnelles</Text>
                        <Text style={styles.stepSub}>Ces informations doivent correspondre à vos documents officiels.</Text>
                        {[
                            { key: 'full_name',          label: 'Nom complet', placeholder: 'Prénom et Nom', keyboardType: 'default' },
                            { key: 'date_of_birth',      label: 'Date de naissance', placeholder: 'JJ/MM/AAAA', keyboardType: 'default' },
                            { key: 'phone',              label: 'Téléphone', placeholder: '+237 6XX XXX XXX', keyboardType: 'phone-pad' },
                            { key: 'address',            label: 'Adresse', placeholder: 'Rue, Quartier', keyboardType: 'default' },
                            { key: 'city',               label: 'Ville', placeholder: 'Libreville', keyboardType: 'default' },
                            { key: 'national_id_number', label: 'N° CNI / Passeport', placeholder: '123456789', keyboardType: 'default' },
                            { key: 'license_number',     label: 'N° Permis de conduire', placeholder: 'XX-XXX-XXXX', keyboardType: 'default' },
                        ].map(f => (
                            <View key={f.key} style={styles.inputWrap}>
                                <Text style={styles.inputLabel}>{f.label}</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder={f.placeholder}
                                    placeholderTextColor="#ccc"
                                    value={form[f.key]}
                                    onChangeText={v => setField(f.key, v)}
                                    keyboardType={f.keyboardType}
                                />
                            </View>
                        ))}
                    </View>
                );

            case 'id_docs':
                return (
                    <View>
                        <Text style={styles.stepTitle}>Pièce d'identité</Text>
                        <Text style={styles.stepSub}>Photographiez les deux faces de votre CNI ou passeport. Assurez-vous que le document est bien lisible.</Text>
                        <View style={styles.docGrid}>
                            <DocBox label="Recto (face)" docKey="id_front" icon="card-outline" />
                            <DocBox label="Verso (dos)"  docKey="id_back"  icon="card-outline" />
                        </View>
                    </View>
                );

            case 'license':
                return (
                    <View>
                        <Text style={styles.stepTitle}>Permis de conduire</Text>
                        <Text style={styles.stepSub}>Photographiez les deux faces de votre permis de conduire.</Text>
                        <View style={styles.docGrid}>
                            <DocBox label="Recto (face)" docKey="license_front" icon="document-text-outline" />
                            <DocBox label="Verso (dos)"  docKey="license_back"  icon="document-text-outline" />
                        </View>
                        <View style={styles.infoBox}>
                            <Ionicons name="information-circle-outline" size={16} color="#0288D1" />
                            <Text style={styles.infoText}>Permis de catégorie B minimum requis. Votre permis doit être en cours de validité.</Text>
                        </View>
                    </View>
                );

            case 'selfie':
                return (
                    <View>
                        <Text style={styles.stepTitle}>Selfie avec votre pièce d'identité</Text>
                        <Text style={styles.stepSub}>Prenez une photo de vous en tenant votre CNI bien visible devant votre visage.</Text>
                        <View style={{ alignItems: 'center', marginVertical: 20 }}>
                            <TouchableOpacity style={styles.selfieBox} onPress={() => pickImage('selfie')} disabled={uploading['selfie']}>
                                {uploading['selfie'] ? (
                                    <ActivityIndicator color={ORANGE} size="large" />
                                ) : docs.selfie ? (
                                    <>
                                        <Image source={{ uri: docs.selfie.uri }} style={styles.selfieImage} />
                                        <View style={styles.selfieCheck}>
                                            <Ionicons name="checkmark-circle" size={30} color="#2E7D32" />
                                        </View>
                                    </>
                                ) : (
                                    <>
                                        <Ionicons name="camera" size={44} color="#ccc" />
                                        <Text style={styles.docLabel}>Appuyer pour uploader</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                        <View style={styles.infoBox}>
                            <Ionicons name="alert-circle-outline" size={16} color="#E65100" />
                            <Text style={[styles.infoText, { color: '#E65100' }]}>Le visage doit être clairement visible et le document lisible.</Text>
                        </View>
                    </View>
                );

            case 'appt':
                return (
                    <View>
                        <Text style={styles.stepTitle}>Rendez-vous en agence</Text>
                        <Text style={styles.stepSub}>
                            Une présence physique en agence est requise pour finaliser votre inscription. Choisissez l'agence la plus proche.
                        </Text>
                        <View style={styles.inputWrap}>
                            <Text style={styles.inputLabel}>Date souhaitée</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="JJ/MM/AAAA"
                                placeholderTextColor="#ccc"
                                value={appt.date}
                                onChangeText={v => setAppt(a => ({ ...a, date: v }))}
                            />
                        </View>
                        <Text style={styles.inputLabel}>Agence</Text>
                        <View style={styles.officeList}>
                            {OFFICES.map(o => (
                                <TouchableOpacity
                                    key={o}
                                    style={[styles.officeBtn, appt.office === o && styles.officeBtnActive]}
                                    onPress={() => setAppt(a => ({ ...a, office: o }))}
                                >
                                    <Ionicons
                                        name={appt.office === o ? 'location' : 'location-outline'}
                                        size={18}
                                        color={appt.office === o ? ORANGE : '#888'}
                                    />
                                    <Text style={[styles.officeBtnText, appt.office === o && styles.officeBtnTextActive]}>{o}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={styles.infoBox}>
                            <Ionicons name="information-circle-outline" size={16} color="#0288D1" />
                            <Text style={styles.infoText}>Notre équipe vous contactera pour confirmer le rendez-vous.</Text>
                        </View>
                    </View>
                );

            case 'review':
                return (
                    <View>
                        <Text style={styles.stepTitle}>Récapitulatif</Text>
                        <Text style={styles.stepSub}>Vérifiez vos informations avant de soumettre votre dossier.</Text>

                        <View style={styles.summaryCard}>
                            <Text style={styles.summarySection}>Informations personnelles</Text>
                            {[
                                ['Nom', form.full_name],
                                ['Naissance', form.date_of_birth],
                                ['Téléphone', form.phone],
                                ['Adresse', form.address + (form.city ? ', ' + form.city : '')],
                                ['N° CNI', form.national_id_number],
                                ['N° Permis', form.license_number],
                            ].map(([label, value]) => value ? (
                                <View key={label} style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>{label}</Text>
                                    <Text style={styles.summaryValue}>{value}</Text>
                                </View>
                            ) : null)}
                        </View>

                        <View style={styles.summaryCard}>
                            <Text style={styles.summarySection}>Documents uploadés</Text>
                            {[
                                ['CNI Recto', docs.id_front],
                                ['CNI Verso', docs.id_back],
                                ['Permis Recto', docs.license_front],
                                ['Permis Verso', docs.license_back],
                                ['Selfie', docs.selfie],
                            ].map(([label, doc]) => (
                                <View key={label} style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>{label}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Ionicons
                                            name={doc ? 'checkmark-circle' : 'close-circle'}
                                            size={16}
                                            color={doc ? '#2E7D32' : '#C62828'}
                                        />
                                        <Text style={{ fontSize: 12, color: doc ? '#2E7D32' : '#C62828', fontWeight: '600' }}>
                                            {doc ? 'Uploadé' : 'Manquant'}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>

                        <View style={styles.summaryCard}>
                            <Text style={styles.summarySection}>Rendez-vous</Text>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Date</Text>
                                <Text style={styles.summaryValue}>{appt.date || 'Non précisée'}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Agence</Text>
                                <Text style={styles.summaryValue}>{appt.office}</Text>
                            </View>
                        </View>
                    </View>
                );

            default: return null;
        }
    };

    const canNext = () => {
        switch (STEPS[step].key) {
            case 'personal':
                return form.full_name.trim() && form.date_of_birth.trim() && form.phone.trim() && form.national_id_number.trim();
            case 'id_docs':
                return docs.id_front && docs.id_back;
            case 'license':
                return docs.license_front && docs.license_back;
            case 'selfie':
                return !!docs.selfie;
            default:
                return true;
        }
    };

    const isLast = step === STEPS.length - 1;

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => step === 0 ? navigation.goBack() : goTo(step - 1)} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={ACCENT} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>{STEPS[step].title}</Text>
                    <Text style={styles.headerSub}>Étape {step + 1} sur {STEPS.length}</Text>
                </View>
                {saving && <ActivityIndicator size="small" color={ORANGE} style={{ marginRight: 8 }} />}
            </View>

            {renderProgress()}

            <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20} style={{ flex: 1 }}>
                <Animated.ScrollView
                    style={[styles.scroll, { transform: [{ translateX: slideAnim }] }]}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {renderStep()}
                </Animated.ScrollView>
            </KeyboardAvoidingView>

            {/* Footer buttons */}
            <View style={styles.footer}>
                {isLast ? (
                    <TouchableOpacity
                        style={[styles.nextBtn, saving && { opacity: 0.6 }]}
                        onPress={handleSubmit}
                        disabled={saving}
                    >
                        {saving
                            ? <ActivityIndicator color="#fff" />
                            : <>
                                <Ionicons name="send" size={18} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.nextBtnText}>Soumettre le dossier</Text>
                              </>
                        }
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.nextBtn, !canNext() && styles.nextBtnDisabled]}
                        onPress={() => { saveProgress(false); goTo(step + 1); }}
                        disabled={!canNext()}
                    >
                        <Text style={styles.nextBtnText}>Continuer</Text>
                        <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container:    { flex: 1, backgroundColor: '#fff' },
    header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    backBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    headerTitle:  { fontSize: 16, fontWeight: '700', color: ACCENT },
    headerSub:    { fontSize: 11, color: '#aaa', marginTop: 1 },

    progressWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    progressItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    progressDot:  { width: 24, height: 24, borderRadius: 12, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#eee' },
    progressDotActive: { borderColor: ORANGE, backgroundColor: '#FFF8EE' },
    progressDotDone:   { borderColor: '#2E7D32', backgroundColor: '#2E7D32' },
    progressNum:      { fontSize: 10, fontWeight: '700', color: '#aaa' },
    progressNumActive: { color: ORANGE },
    progressLine: { flex: 1, height: 2, backgroundColor: '#eee', marginHorizontal: 2 },
    progressLineDone: { backgroundColor: '#2E7D32' },

    scroll:        { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 40 },

    // Intro
    introWrap:  { alignItems: 'center', paddingTop: 10 },
    introIcon:  { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F0F4FF', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    introTitle: { fontSize: 22, fontWeight: '800', color: ACCENT, textAlign: 'center', marginBottom: 10 },
    introSub:   { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 24, paddingHorizontal: 10 },
    checklist:  { width: '100%', marginBottom: 20 },
    checkRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    checkIcon:  { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF8EE', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    checkText:  { flex: 1, fontSize: 14, color: '#333', lineHeight: 20 },

    infoBox:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#EEF8FF', borderRadius: 10, padding: 12, marginTop: 16 },
    infoText:   { flex: 1, fontSize: 12, color: '#0288D1', lineHeight: 18 },

    // Form
    stepTitle:   { fontSize: 18, fontWeight: '800', color: ACCENT, marginBottom: 6 },
    stepSub:     { fontSize: 13, color: '#888', lineHeight: 18, marginBottom: 20 },
    inputWrap:   { marginBottom: 14 },
    inputLabel:  { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 6 },
    input:       { borderWidth: 1.5, borderColor: '#E8EAF0', borderRadius: 10, padding: 12, fontSize: 14, color: '#1a1a1a', backgroundColor: '#FAFAFA' },

    // Doc boxes
    docGrid:    { flexDirection: 'row', gap: 12, marginBottom: 16 },
    docBox:     { flex: 1, aspectRatio: 1.4, borderWidth: 2, borderColor: '#E8EAF0', borderRadius: 12, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA', overflow: 'hidden' },
    docBoxDone: { borderColor: '#2E7D32', borderStyle: 'solid', backgroundColor: '#F1F8F1' },
    docThumb:   { width: '100%', height: '100%', borderRadius: 10 },
    docCheck:   { position: 'absolute', top: 6, right: 6, backgroundColor: '#fff', borderRadius: 11 },
    docLabel:   { fontSize: 12, color: '#aaa', marginTop: 6, textAlign: 'center' },
    docTap:     { fontSize: 10, color: '#ccc', marginTop: 2 },

    // Selfie
    selfieBox:   { width: 180, height: 180, borderRadius: 90, borderWidth: 2.5, borderColor: '#E8EAF0', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA', overflow: 'hidden' },
    selfieImage: { width: '100%', height: '100%' },
    selfieCheck: { position: 'absolute', bottom: 8, right: 8, backgroundColor: '#fff', borderRadius: 15 },

    // Appointment
    officeList:        { marginTop: 8, marginBottom: 16 },
    officeBtn:         { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#E8EAF0', marginBottom: 8, backgroundColor: '#FAFAFA' },
    officeBtnActive:   { borderColor: ORANGE, backgroundColor: '#FFF8EE' },
    officeBtnText:     { fontSize: 14, color: '#555', fontWeight: '500' },
    officeBtnTextActive: { color: ACCENT, fontWeight: '700' },

    // Summary
    summaryCard:    { backgroundColor: '#FAFAFA', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#F0F0F0' },
    summarySection: { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
    summaryRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    summaryLabel:   { fontSize: 12, color: '#888' },
    summaryValue:   { fontSize: 12, fontWeight: '600', color: ACCENT, maxWidth: '60%', textAlign: 'right' },

    // Footer
    footer:          { padding: 16, paddingBottom: 24, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
    nextBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: ACCENT, paddingVertical: 16, borderRadius: 14 },
    nextBtnDisabled: { opacity: 0.4 },
    nextBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
});
