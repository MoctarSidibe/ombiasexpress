import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, ActivityIndicator, Alert, Image, Animated, Dimensions,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api.service';

const { width: W } = Dimensions.get('window');

const STEPS = [
    { key: 'intro',   title: 'Bienvenue',       icon: 'car' },
    { key: 'details', title: 'Votre véhicule',  icon: 'construct' },
    { key: 'docs',    title: 'Documents',       icon: 'document-text' },
    { key: 'photos',  title: 'Photos du véhicule', icon: 'camera' },
    { key: 'review',  title: 'Récapitulatif',   icon: 'checkmark-circle' },
];

const ACCENT = '#1C2E4A';
const TEAL  = '#0288D1';

const FUEL_TYPES = [
    { key: 'gasoline', label: 'Essence' },
    { key: 'diesel',   label: 'Diesel' },
    { key: 'electric', label: 'Électrique' },
    { key: 'hybrid',   label: 'Hybride' },
];
const TRANSMISSIONS = [
    { key: 'manual',    label: 'Manuelle' },
    { key: 'automatic', label: 'Automatique' },
];

export default function CarKycScreen({ navigation }) {
    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const slideAnim = useRef(new Animated.Value(0)).current;

    const [form, setForm] = useState({
        make: '', model: '', year: '', color: '',
        plate_number: '', seats: '5', fuel_type: 'gasoline',
        transmission: 'manual', mileage: '', price_per_day: '', description: '',
    });
    const [docs, setDocs] = useState({ carte_grise_front: null, carte_grise_back: null, insurance: null });
    const [photos, setPhotos] = useState({ front: null, back: null, left: null, right: null, interior: null });
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

    const pickImage = async (collection, key) => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            Alert.alert('Permission requise', 'Autorisez l\'accès à la galerie.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.75,
            allowsEditing: true,
            aspect: collection === 'photos' ? [16, 9] : [4, 3],
        });
        if (result.canceled) return;

        const asset = result.assets[0];
        const uploadKey = `${collection}_${key}`;
        setUploading(u => ({ ...u, [uploadKey]: true }));
        try {
            const formData = new FormData();
            formData.append('file', { uri: asset.uri, type: 'image/jpeg', name: `${key}.jpg` });
            const res = await api.post('/verifications/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (collection === 'docs') {
                setDocs(d => ({ ...d, [key]: { uri: asset.uri, url: res.data.url } }));
            } else {
                setPhotos(p => ({ ...p, [key]: { uri: asset.uri, url: res.data.url } }));
            }
        } catch (e) {
            Alert.alert('Erreur', e.response?.data?.error || 'Upload échoué');
        } finally {
            setUploading(u => ({ ...u, [uploadKey]: false }));
        }
    };

    const saveProgress = async (submit = false) => {
        setSaving(true);
        try {
            const docsPayload = {}, photosPayload = {};
            Object.entries(docs).forEach(([k, v]) => { if (v?.url) docsPayload[k] = v.url; });
            Object.entries(photos).forEach(([k, v]) => { if (v?.url) photosPayload[k] = v.url; });
            await api.post('/verifications/car', {
                ...form,
                year:         form.year         ? parseInt(form.year)         : null,
                mileage:      form.mileage       ? parseInt(form.mileage)      : null,
                price_per_day:form.price_per_day ? parseFloat(form.price_per_day) : null,
                docs:   docsPayload,
                photos: photosPayload,
                submit,
            });
        } catch (e) {
            Alert.alert('Erreur', e.response?.data?.error || 'Impossible de sauvegarder');
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async () => {
        if (!docs.carte_grise_front?.url || !docs.insurance?.url) {
            Alert.alert('Documents manquants', 'Carte grise (recto) et assurance sont obligatoires.');
            return;
        }
        const photoCount = Object.values(photos).filter(p => p?.url).length;
        if (photoCount < 3) {
            Alert.alert('Photos insuffisantes', 'Ajoutez au moins 3 photos de votre véhicule.');
            return;
        }
        await saveProgress(true);
        navigation.replace('KycStatus', { type: 'car' });
    };

    const DocBox = ({ label, collection, docKey, icon = 'document-outline' }) => {
        const doc = collection === 'docs' ? docs[docKey] : photos[docKey];
        const uploadKey = `${collection}_${docKey}`;
        const isUploading = uploading[uploadKey];
        return (
            <TouchableOpacity
                style={[styles.docBox, doc && styles.docBoxDone]}
                onPress={() => pickImage(collection, docKey)}
                disabled={isUploading}
            >
                {isUploading ? (
                    <ActivityIndicator color={TEAL} />
                ) : doc ? (
                    <>
                        <Image source={{ uri: doc.uri }} style={styles.docThumb} />
                        <View style={styles.docCheck}><Ionicons name="checkmark-circle" size={20} color="#2E7D32" /></View>
                    </>
                ) : (
                    <>
                        <Ionicons name={icon} size={24} color="#ccc" />
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
                    <View style={styles.introWrap}>
                        <View style={styles.introIcon}>
                            <Ionicons name="car" size={52} color={TEAL} />
                        </View>
                        <Text style={styles.introTitle}>Mettez votre voiture en location</Text>
                        <Text style={styles.introSub}>
                            Pour assurer la qualité de notre flotte, chaque véhicule passe par une vérification rapide avant d'être listé sur la plateforme.
                        </Text>
                        <View style={styles.checklist}>
                            {[
                                { icon: 'construct-outline',     text: 'Informations complètes du véhicule' },
                                { icon: 'document-text-outline', text: 'Carte grise + assurance valide' },
                                { icon: 'camera-outline',        text: '3 à 5 photos du véhicule' },
                                { icon: 'checkmark-circle-outline', text: 'Validation admin sous 24–48h' },
                            ].map(({ icon, text }) => (
                                <View key={text} style={styles.checkRow}>
                                    <View style={styles.checkIcon}><Ionicons name={icon} size={18} color={TEAL} /></View>
                                    <Text style={styles.checkText}>{text}</Text>
                                </View>
                            ))}
                        </View>
                        <View style={styles.infoBox}>
                            <Ionicons name="cash-outline" size={16} color="#2E7D32" />
                            <Text style={[styles.infoText, { color: '#2E7D32' }]}>Vous définissez votre prix/jour. Ombia perçoit une commission de 20% sur chaque réservation.</Text>
                        </View>
                    </View>
                );

            case 'details':
                return (
                    <View>
                        <Text style={styles.stepTitle}>Informations du véhicule</Text>
                        <Text style={styles.stepSub}>Ces données apparaîtront sur la fiche de votre véhicule.</Text>

                        <View style={styles.twoCol}>
                            {[
                                { key: 'make',  label: 'Marque',  placeholder: 'Toyota',  flex: 1 },
                                { key: 'model', label: 'Modèle',  placeholder: 'Corolla', flex: 1 },
                            ].map(f => (
                                <View key={f.key} style={[styles.inputWrap, { flex: f.flex }]}>
                                    <Text style={styles.inputLabel}>{f.label}</Text>
                                    <TextInput style={styles.input} placeholder={f.placeholder} placeholderTextColor="#ccc" value={form[f.key]} onChangeText={v => setField(f.key, v)} />
                                </View>
                            ))}
                        </View>
                        <View style={styles.twoCol}>
                            {[
                                { key: 'year',  label: 'Année',  placeholder: '2020', keyboardType: 'number-pad' },
                                { key: 'color', label: 'Couleur', placeholder: 'Blanc' },
                            ].map(f => (
                                <View key={f.key} style={[styles.inputWrap, { flex: 1 }]}>
                                    <Text style={styles.inputLabel}>{f.label}</Text>
                                    <TextInput style={styles.input} placeholder={f.placeholder} placeholderTextColor="#ccc" value={form[f.key]} onChangeText={v => setField(f.key, v)} keyboardType={f.keyboardType || 'default'} />
                                </View>
                            ))}
                        </View>
                        <View style={styles.twoCol}>
                            <View style={[styles.inputWrap, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>Immatriculation</Text>
                                <TextInput style={styles.input} placeholder="LT 123 AB" placeholderTextColor="#ccc" value={form.plate_number} onChangeText={v => setField('plate_number', v)} autoCapitalize="characters" />
                            </View>
                            <View style={[styles.inputWrap, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>Nombre de sièges</Text>
                                <TextInput style={styles.input} placeholder="5" placeholderTextColor="#ccc" value={form.seats} onChangeText={v => setField('seats', v)} keyboardType="number-pad" />
                            </View>
                        </View>
                        <View style={styles.twoCol}>
                            <View style={[styles.inputWrap, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>Kilométrage</Text>
                                <TextInput style={styles.input} placeholder="45000" placeholderTextColor="#ccc" value={form.mileage} onChangeText={v => setField('mileage', v)} keyboardType="number-pad" />
                            </View>
                            <View style={[styles.inputWrap, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>Prix / jour (XAF)</Text>
                                <TextInput style={styles.input} placeholder="15000" placeholderTextColor="#ccc" value={form.price_per_day} onChangeText={v => setField('price_per_day', v)} keyboardType="number-pad" />
                            </View>
                        </View>

                        <Text style={styles.inputLabel}>Carburant</Text>
                        <View style={styles.chipRow}>
                            {FUEL_TYPES.map(f => (
                                <TouchableOpacity
                                    key={f.key}
                                    style={[styles.chip, form.fuel_type === f.key && styles.chipActive]}
                                    onPress={() => setField('fuel_type', f.key)}
                                >
                                    <Text style={[styles.chipText, form.fuel_type === f.key && styles.chipTextActive]}>{f.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.inputLabel, { marginTop: 12 }]}>Transmission</Text>
                        <View style={styles.chipRow}>
                            {TRANSMISSIONS.map(t => (
                                <TouchableOpacity
                                    key={t.key}
                                    style={[styles.chip, form.transmission === t.key && styles.chipActive]}
                                    onPress={() => setField('transmission', t.key)}
                                >
                                    <Text style={[styles.chipText, form.transmission === t.key && styles.chipTextActive]}>{t.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={[styles.inputWrap, { marginTop: 14 }]}>
                            <Text style={styles.inputLabel}>Description (optionnel)</Text>
                            <TextInput
                                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                                placeholder="Climatisé, bon état, idéal pour voyages..."
                                placeholderTextColor="#ccc"
                                value={form.description}
                                onChangeText={v => setField('description', v)}
                                multiline
                            />
                        </View>
                    </View>
                );

            case 'docs':
                return (
                    <View>
                        <Text style={styles.stepTitle}>Documents du véhicule</Text>
                        <Text style={styles.stepSub}>Uploadez les documents officiels. Seuls les documents en cours de validité sont acceptés.</Text>

                        <Text style={styles.groupLabel}>Carte grise <Text style={{ color: '#C62828' }}>*</Text></Text>
                        <View style={styles.docGrid}>
                            <DocBox label="Recto" collection="docs" docKey="carte_grise_front" icon="document-outline" />
                            <DocBox label="Verso" collection="docs" docKey="carte_grise_back"  icon="document-outline" />
                        </View>

                        <Text style={styles.groupLabel}>Assurance <Text style={{ color: '#C62828' }}>*</Text></Text>
                        <View style={styles.docGrid}>
                            <DocBox label="Attestation" collection="docs" docKey="insurance"       icon="shield-checkmark-outline" />
                            <DocBox label="Visite technique (si dispo)" collection="docs" docKey="inspection_cert" icon="clipboard-outline" />
                        </View>
                        <View style={styles.infoBox}>
                            <Ionicons name="information-circle-outline" size={16} color="#0288D1" />
                            <Text style={styles.infoText}>La visite technique sera obligatoire dès 2025. Optionnelle pour le moment.</Text>
                        </View>
                    </View>
                );

            case 'photos':
                return (
                    <View>
                        <Text style={styles.stepTitle}>Photos du véhicule</Text>
                        <Text style={styles.stepSub}>Prenez des photos claires en pleine lumière. Minimum 3 photos requises.</Text>

                        <View style={styles.photoGrid}>
                            {[
                                { key: 'front',    label: 'Avant' },
                                { key: 'back',     label: 'Arrière' },
                                { key: 'left',     label: 'Côté gauche' },
                                { key: 'right',    label: 'Côté droit' },
                                { key: 'interior', label: 'Intérieur' },
                            ].map(p => (
                                <DocBox key={p.key} label={p.label} collection="photos" docKey={p.key} icon="camera-outline" />
                            ))}
                        </View>

                        <Text style={styles.photoCount}>
                            {Object.values(photos).filter(p => p?.url).length} / 5 photos uploadées
                        </Text>
                    </View>
                );

            case 'review':
                return (
                    <View>
                        <Text style={styles.stepTitle}>Récapitulatif</Text>
                        <Text style={styles.stepSub}>Vérifiez les informations avant de soumettre.</Text>

                        <View style={styles.summaryCard}>
                            <Text style={styles.summarySection}>Véhicule</Text>
                            {[
                                ['Marque / Modèle', `${form.make} ${form.model}`],
                                ['Année',           form.year],
                                ['Couleur',         form.color],
                                ['Immatriculation', form.plate_number],
                                ['Sièges',          form.seats],
                                ['Carburant',       FUEL_TYPES.find(f => f.key === form.fuel_type)?.label],
                                ['Transmission',    TRANSMISSIONS.find(t => t.key === form.transmission)?.label],
                                ['Kilométrage',     form.mileage ? `${parseInt(form.mileage).toLocaleString('fr-FR')} km` : '—'],
                                ['Prix / jour',     form.price_per_day ? `${parseInt(form.price_per_day).toLocaleString('fr-FR')} XAF` : '—'],
                            ].map(([l, v]) => v ? (
                                <View key={l} style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>{l}</Text>
                                    <Text style={styles.summaryValue}>{v}</Text>
                                </View>
                            ) : null)}
                        </View>

                        <View style={styles.summaryCard}>
                            <Text style={styles.summarySection}>Documents</Text>
                            {[
                                ['Carte grise recto', docs.carte_grise_front],
                                ['Carte grise verso', docs.carte_grise_back],
                                ['Assurance',         docs.insurance],
                                ['Visite technique',  docs.inspection_cert],
                            ].map(([l, d]) => (
                                <View key={l} style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>{l}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Ionicons name={d ? 'checkmark-circle' : 'close-circle'} size={16} color={d ? '#2E7D32' : '#C62828'} />
                                        <Text style={{ fontSize: 12, color: d ? '#2E7D32' : '#C62828', fontWeight: '600' }}>
                                            {d ? 'Uploadé' : 'Manquant'}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>

                        <View style={styles.summaryCard}>
                            <Text style={styles.summarySection}>Photos</Text>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Photos uploadées</Text>
                                <Text style={[styles.summaryValue, { color: Object.values(photos).filter(p => p?.url).length >= 3 ? '#2E7D32' : '#C62828' }]}>
                                    {Object.values(photos).filter(p => p?.url).length} / 5
                                </Text>
                            </View>
                        </View>
                    </View>
                );

            default: return null;
        }
    };

    const canNext = () => {
        switch (STEPS[step].key) {
            case 'details':
                return form.make.trim() && form.model.trim() && form.year.trim() && form.plate_number.trim() && form.price_per_day.trim();
            case 'docs':
                return docs.carte_grise_front?.url && docs.insurance?.url;
            case 'photos':
                return Object.values(photos).filter(p => p?.url).length >= 3;
            default:
                return true;
        }
    };

    const isLast = step === STEPS.length - 1;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => step === 0 ? navigation.goBack() : goTo(step - 1)} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={ACCENT} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>{STEPS[step].title}</Text>
                    <Text style={styles.headerSub}>Étape {step + 1} sur {STEPS.length}</Text>
                </View>
                {saving && <ActivityIndicator size="small" color={TEAL} style={{ marginRight: 8 }} />}
            </View>

            {/* Progress */}
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

            <View style={styles.footer}>
                {isLast ? (
                    <TouchableOpacity style={[styles.nextBtn, { backgroundColor: TEAL }, saving && { opacity: 0.6 }]} onPress={handleSubmit} disabled={saving}>
                        {saving
                            ? <ActivityIndicator color="#fff" />
                            : <><Ionicons name="send" size={18} color="#fff" style={{ marginRight: 8 }} /><Text style={styles.nextBtnText}>Soumettre le dossier</Text></>
                        }
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.nextBtn, { backgroundColor: TEAL }, !canNext() && styles.nextBtnDisabled]}
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
    progressDotActive: { borderColor: TEAL, backgroundColor: '#EEF8FF' },
    progressDotDone:   { borderColor: '#2E7D32', backgroundColor: '#2E7D32' },
    progressNum:      { fontSize: 10, fontWeight: '700', color: '#aaa' },
    progressNumActive: { color: TEAL },
    progressLine: { flex: 1, height: 2, backgroundColor: '#eee', marginHorizontal: 2 },
    progressLineDone: { backgroundColor: '#2E7D32' },
    scroll:        { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 40 },
    introWrap:  { alignItems: 'center', paddingTop: 10 },
    introIcon:  { width: 100, height: 100, borderRadius: 50, backgroundColor: '#EEF8FF', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    introTitle: { fontSize: 22, fontWeight: '800', color: ACCENT, textAlign: 'center', marginBottom: 10 },
    introSub:   { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 24, paddingHorizontal: 10 },
    checklist:  { width: '100%', marginBottom: 20 },
    checkRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    checkIcon:  { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF8FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    checkText:  { flex: 1, fontSize: 14, color: '#333', lineHeight: 20 },
    infoBox:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#EEF8FF', borderRadius: 10, padding: 12, marginTop: 16 },
    infoText:   { flex: 1, fontSize: 12, color: '#0288D1', lineHeight: 18 },
    stepTitle:  { fontSize: 18, fontWeight: '800', color: ACCENT, marginBottom: 6 },
    stepSub:    { fontSize: 13, color: '#888', lineHeight: 18, marginBottom: 20 },
    twoCol:     { flexDirection: 'row', gap: 10 },
    inputWrap:  { marginBottom: 14 },
    inputLabel: { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 6 },
    input:      { borderWidth: 1.5, borderColor: '#E8EAF0', borderRadius: 10, padding: 12, fontSize: 14, color: '#1a1a1a', backgroundColor: '#FAFAFA' },
    chipRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    chip:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#E8EAF0', backgroundColor: '#FAFAFA' },
    chipActive: { borderColor: TEAL, backgroundColor: '#EEF8FF' },
    chipText:   { fontSize: 13, color: '#666', fontWeight: '500' },
    chipTextActive: { color: TEAL, fontWeight: '700' },
    groupLabel: { fontSize: 13, fontWeight: '700', color: '#333', marginBottom: 8, marginTop: 4 },
    docGrid:    { flexDirection: 'row', gap: 12, marginBottom: 16 },
    photoGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
    docBox:     { flex: 1, aspectRatio: 1.4, borderWidth: 2, borderColor: '#E8EAF0', borderRadius: 12, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA', overflow: 'hidden' },
    docBoxDone: { borderColor: '#2E7D32', borderStyle: 'solid', backgroundColor: '#F1F8F1' },
    docThumb:   { width: '100%', height: '100%', borderRadius: 10 },
    docCheck:   { position: 'absolute', top: 6, right: 6, backgroundColor: '#fff', borderRadius: 11 },
    docLabel:   { fontSize: 11, color: '#aaa', marginTop: 6, textAlign: 'center' },
    photoCount: { fontSize: 12, color: '#888', textAlign: 'center', marginTop: 4 },
    summaryCard:    { backgroundColor: '#FAFAFA', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#F0F0F0' },
    summarySection: { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
    summaryRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    summaryLabel:   { fontSize: 12, color: '#888' },
    summaryValue:   { fontSize: 12, fontWeight: '600', color: ACCENT, maxWidth: '60%', textAlign: 'right' },
    footer:         { padding: 16, paddingBottom: 24, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
    nextBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14 },
    nextBtnDisabled:{ opacity: 0.4 },
    nextBtnText:    { color: '#fff', fontSize: 16, fontWeight: '700' },
});
