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
    Switch,
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
const NAVY   = '#1C2E4A';
const ORANGE = '#FFA726';

const STEPS = [
    { key: 'intro',       title: 'Flotte Ombia',       icon: 'shield-checkmark' },
    { key: 'owner',       title: 'Vos informations',   icon: 'person' },
    { key: 'id_docs',     title: 'Pièce d\'identité',  icon: 'card' },
    { key: 'vehicle',     title: 'Votre véhicule',     icon: 'car-sport' },
    { key: 'vehicle_docs', title: 'Documents & Photos', icon: 'document-text' },
    { key: 'agreement',   title: 'Convention',         icon: 'checkbox' },
];

const FUEL_TYPES    = ['essence', 'diesel', 'hybride', 'electrique'];
const TRANSMISSIONS = ['manuelle', 'automatique'];

// ── Doc picker ────────────────────────────────────────────────────────────────

function DocPicker({ label, value, onPick, uploading, required }) {
    return (
        <TouchableOpacity style={styles.docBtn} onPress={onPick} activeOpacity={0.8}>
            {uploading ? (
                <ActivityIndicator size="small" color={ORANGE} />
            ) : value ? (
                <Image source={{ uri: value.uri }} style={styles.docThumb} resizeMode="cover" />
            ) : (
                <View style={styles.docPlaceholder}>
                    <Ionicons name="cloud-upload-outline" size={20} color="#ccc" />
                </View>
            )}
            <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.docLabel}>{label}{required ? ' *' : ''}</Text>
                <Text style={[styles.docStatus, value && { color: '#2E7D32' }]}>
                    {value ? '✓ Uploadé' : 'Appuyez pour sélectionner'}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#ccc" />
        </TouchableOpacity>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function FleetKycScreen({ navigation }) {
    const { user }  = useAuth();
    const [step,    setStep]    = useState(0);
    const [saving,  setSaving]  = useState(false);
    const slideAnim = useRef(new Animated.Value(0)).current;

    const [owner, setOwner] = useState({
        full_name:          user?.name  || '',
        phone:              user?.phone || '',
        address:            '',
        city:               '',
        national_id_number: '',
    });

    const [idDocs, setIdDocs] = useState({ id_front: null, id_back: null });

    const [vehicle, setVehicle] = useState({
        make: '', model: '', year: '', color: '',
        plate_number: '', seats: '', fuel_type: 'essence',
        transmission: 'manuelle', mileage: '',
    });

    const [vehicleDocs, setVehicleDocs] = useState({
        carte_grise_front: null, carte_grise_back: null,
        insurance: null, inspection_cert: null,
    });

    const [vehiclePhotos, setVehiclePhotos] = useState({
        front: null, back: null, left: null, right: null, interior: null,
    });

    const [agreementAccepted, setAgreementAccepted] = useState(false);
    const [uploading, setUploading] = useState({});

    const setOwnerField   = (k, v) => setOwner(o => ({ ...o, [k]: v }));
    const setVehicleField = (k, v) => setVehicle(o => ({ ...o, [k]: v }));

    const goTo = (next) => {
        Animated.timing(slideAnim, { toValue: -W, duration: 180, useNativeDriver: true }).start(() => {
            setStep(next);
            slideAnim.setValue(W);
            Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        });
    };

    const pickImage = async (collection, key) => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission requise', 'Autorisez l\'accès à la galerie.'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.75, allowsEditing: true,
        });
        if (result.canceled) return;
        const asset = result.assets[0];
        const uploadKey = `${collection}_${key}`;
        setUploading(u => ({ ...u, [uploadKey]: true }));
        try {
            const formData = new FormData();
            formData.append('file', { uri: asset.uri, name: `${key}.jpg`, type: 'image/jpeg' });
            const res = await api.post('/verifications/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (collection === 'id')      setIdDocs(d => ({ ...d, [key]: { uri: asset.uri, url: res.data.url } }));
            if (collection === 'docs')    setVehicleDocs(d => ({ ...d, [key]: { uri: asset.uri, url: res.data.url } }));
            if (collection === 'photos')  setVehiclePhotos(d => ({ ...d, [key]: { uri: asset.uri, url: res.data.url } }));
        } catch (e) {
            Alert.alert('Erreur upload', e.response?.data?.error || 'Échec de l\'upload.');
        } finally {
            setUploading(u => ({ ...u, [uploadKey]: false }));
        }
    };

    const handleSubmit = async () => {
        if (!idDocs.id_front || !idDocs.id_back) {
            Alert.alert('Documents manquants', 'Les deux faces de votre pièce d\'identité sont requises.'); return;
        }
        if (!vehicleDocs.carte_grise_front || !vehicleDocs.carte_grise_back || !vehicleDocs.insurance) {
            Alert.alert('Documents manquants', 'Carte grise (recto/verso) et assurance sont requis.'); return;
        }
        const photoCount = Object.values(vehiclePhotos).filter(Boolean).length;
        if (photoCount < 3) {
            Alert.alert('Photos insuffisantes', 'Ajoutez au moins 3 photos de votre véhicule.'); return;
        }
        if (!agreementAccepted) {
            Alert.alert('Convention', 'Vous devez accepter la convention de délégation Ombia.'); return;
        }
        setSaving(true);
        try {
            await api.post('/verifications/fleet', {
                ...owner,
                year: parseInt(vehicle.year) || null,
                seats: parseInt(vehicle.seats) || null,
                mileage: parseInt(vehicle.mileage) || null,
                make: vehicle.make, model: vehicle.model, color: vehicle.color,
                plate_number: vehicle.plate_number,
                fuel_type: vehicle.fuel_type, transmission: vehicle.transmission,
                id_docs:        Object.fromEntries(Object.entries(idDocs).filter(([, v]) => v).map(([k, v]) => [k, v.url])),
                vehicle_docs:   Object.fromEntries(Object.entries(vehicleDocs).filter(([, v]) => v).map(([k, v]) => [k, v.url])),
                vehicle_photos: Object.fromEntries(Object.entries(vehiclePhotos).filter(([, v]) => v).map(([k, v]) => [k, v.url])),
                agreement_accepted: agreementAccepted,
                submit: true,
            });
            Alert.alert(
                'Dossier soumis !',
                'Notre équipe va examiner votre demande sous 24–48h. Vous serez notifié(e) dès validation.',
                [{ text: 'OK', onPress: () => navigation.replace('KycStatus', { type: 'fleet' }) }]
            );
        } catch (e) {
            Alert.alert('Erreur', e.response?.data?.error || 'Impossible de soumettre.');
        } finally { setSaving(false); }
    };

    // ── Step renderers ────────────────────────────────────────────────────────

    const renderIntro = () => (
        <View style={styles.introWrap}>
            <View style={styles.introIconWrap}>
                <Ionicons name="shield-checkmark" size={52} color={ORANGE} />
            </View>
            <Text style={styles.introTitle}>Rejoindre la Flotte Ombia</Text>
            <Text style={styles.introSub}>
                Déléguez votre véhicule à Ombia Express. Nos chauffeurs certifiés l'utilisent pour des courses, et vous percevez votre part sur chaque trajet.
            </Text>
            <View style={styles.benefitsList}>
                {[
                    { icon: 'cash-outline',     text: 'Revenus passifs sans conduire vous-même' },
                    { icon: 'shield-outline',   text: 'Votre véhicule assuré et suivi en temps réel' },
                    { icon: 'person-outline',   text: 'Chauffeurs sélectionnés et formés par Ombia' },
                    { icon: 'trending-up',      text: 'Tableau de bord des revenus et courses' },
                ].map((b, i) => (
                    <View key={i} style={styles.benefitRow}>
                        <View style={styles.benefitIcon}>
                            <Ionicons name={b.icon} size={16} color={ORANGE} />
                        </View>
                        <Text style={styles.benefitText}>{b.text}</Text>
                    </View>
                ))}
            </View>
            <View style={styles.splitBadge}>
                <Text style={styles.splitText}>Partage des revenus · Ombia 30% — Vous 70%</Text>
            </View>
        </View>
    );

    const renderOwner = () => (
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.sectionLabel}>Vos informations personnelles</Text>
            {[
                { label: 'Nom complet *', key: 'full_name', placeholder: 'Jean Dupont' },
                { label: 'Téléphone *',   key: 'phone',     placeholder: '+237 6XX XXX XXX', keyboardType: 'phone-pad' },
                { label: 'Adresse *',     key: 'address',   placeholder: 'Rue, quartier' },
                { label: 'Ville *',       key: 'city',      placeholder: 'Yaoundé' },
                { label: 'N° CNI / Passeport *', key: 'national_id_number', placeholder: 'Ex : 123456789' },
            ].map(f => (
                <View key={f.key}>
                    <Text style={styles.fieldLabel}>{f.label}</Text>
                    <TextInput
                        style={styles.input}
                        value={owner[f.key]}
                        onChangeText={v => setOwnerField(f.key, v)}
                        placeholder={f.placeholder}
                        placeholderTextColor="#bbb"
                        keyboardType={f.keyboardType || 'default'}
                    />
                </View>
            ))}
        </ScrollView>
    );

    const renderIdDocs = () => (
        <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>Pièce d'identité</Text>
            <Text style={styles.sectionHint}>CNI recto/verso ou pages principales du passeport. Photos nettes, bien éclairées.</Text>
            <DocPicker label="CNI / Passeport — Recto" value={idDocs.id_front}  onPick={() => pickImage('id', 'id_front')}  uploading={uploading.id_id_front}  required />
            <DocPicker label="CNI / Passeport — Verso"  value={idDocs.id_back}   onPick={() => pickImage('id', 'id_back')}   uploading={uploading.id_id_back}   required />
        </ScrollView>
    );

    const renderVehicle = () => (
        <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>Informations du véhicule</Text>
            {[
                { label: 'Marque *',        key: 'make',         placeholder: 'Toyota, Hyundai…' },
                { label: 'Modèle *',        key: 'model',        placeholder: 'Corolla, Elantra…' },
                { label: 'Année *',         key: 'year',         placeholder: '2019', keyboardType: 'numeric' },
                { label: 'Couleur *',       key: 'color',        placeholder: 'Blanc, Gris…' },
                { label: 'Immatriculation *', key: 'plate_number', placeholder: 'LT 1234 A' },
                { label: 'Nombre de sièges *', key: 'seats',      placeholder: '5', keyboardType: 'numeric' },
                { label: 'Kilométrage',     key: 'mileage',      placeholder: '45000', keyboardType: 'numeric' },
            ].map(f => (
                <View key={f.key}>
                    <Text style={styles.fieldLabel}>{f.label}</Text>
                    <TextInput
                        style={styles.input}
                        value={String(vehicle[f.key])}
                        onChangeText={v => setVehicleField(f.key, v)}
                        placeholder={f.placeholder}
                        placeholderTextColor="#bbb"
                        keyboardType={f.keyboardType || 'default'}
                    />
                </View>
            ))}
            <Text style={styles.fieldLabel}>Carburant *</Text>
            <View style={styles.chipRow}>
                {FUEL_TYPES.map(t => (
                    <TouchableOpacity key={t} style={[styles.chip, vehicle.fuel_type === t && styles.chipActive]} onPress={() => setVehicleField('fuel_type', t)}>
                        <Text style={[styles.chipText, vehicle.fuel_type === t && styles.chipTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <Text style={styles.fieldLabel}>Transmission *</Text>
            <View style={styles.chipRow}>
                {TRANSMISSIONS.map(t => (
                    <TouchableOpacity key={t} style={[styles.chip, vehicle.transmission === t && styles.chipActive]} onPress={() => setVehicleField('transmission', t)}>
                        <Text style={[styles.chipText, vehicle.transmission === t && styles.chipTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );

    const renderVehicleDocs = () => (
        <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>Documents officiels</Text>
            <Text style={styles.sectionHint}>Carte grise, assurance et visite technique. Minimum 3 photos du véhicule.</Text>
            <DocPicker label="Carte grise — Recto *"  value={vehicleDocs.carte_grise_front} onPick={() => pickImage('docs', 'carte_grise_front')} uploading={uploading.docs_carte_grise_front} required />
            <DocPicker label="Carte grise — Verso *"  value={vehicleDocs.carte_grise_back}  onPick={() => pickImage('docs', 'carte_grise_back')}  uploading={uploading.docs_carte_grise_back}  required />
            <DocPicker label="Assurance *"            value={vehicleDocs.insurance}          onPick={() => pickImage('docs', 'insurance')}          uploading={uploading.docs_insurance}          required />
            <DocPicker label="Visite technique"       value={vehicleDocs.inspection_cert}    onPick={() => pickImage('docs', 'inspection_cert')}    uploading={uploading.docs_inspection_cert} />

            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Photos du véhicule (min. 3)</Text>
            {[
                { key: 'front',    label: 'Face avant' },
                { key: 'back',     label: 'Face arrière' },
                { key: 'left',     label: 'Côté gauche' },
                { key: 'right',    label: 'Côté droit' },
                { key: 'interior', label: 'Intérieur / habitacle' },
            ].map(p => (
                <DocPicker key={p.key} label={p.label} value={vehiclePhotos[p.key]} onPick={() => pickImage('photos', p.key)} uploading={uploading[`photos_${p.key}`]} />
            ))}
            <Text style={styles.photoCount}>
                {Object.values(vehiclePhotos).filter(Boolean).length}/5 photos ajoutées
                {Object.values(vehiclePhotos).filter(Boolean).length < 3 && ' — minimum 3 requises'}
            </Text>
        </ScrollView>
    );

    const renderAgreement = () => (
        <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>Convention de délégation Ombia</Text>
            <View style={styles.agreementCard}>
                {[
                    ['Partage des revenus', 'Vous percevez 70% du revenu net de chaque course effectuée avec votre véhicule.'],
                    ['Entretien', 'Vous restez responsable de l\'entretien courant et des révisions périodiques.'],
                    ['Assurance', 'Votre véhicule doit être assuré tous risques. Ombia souscrit une assurance complémentaire couvrant les courses.'],
                    ['Disponibilité', 'Vous définissez les créneaux de disponibilité de votre véhicule depuis votre tableau de bord.'],
                    ['Retraits', 'Vous pouvez retirer votre véhicule de la flotte à tout moment avec un préavis de 7 jours.'],
                    ['Chauffeurs', 'Seuls les chauffeurs certifiés Ombia sont autorisés à utiliser votre véhicule.'],
                ].map(([title, text]) => (
                    <View key={title} style={styles.clauseRow}>
                        <Ionicons name="checkmark-circle" size={16} color={ORANGE} style={{ marginTop: 2, flexShrink: 0 }} />
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.clauseTitle}>{title}</Text>
                            <Text style={styles.clauseText}>{text}</Text>
                        </View>
                    </View>
                ))}
            </View>
            <TouchableOpacity
                style={styles.agreementToggle}
                onPress={() => setAgreementAccepted(v => !v)}
                activeOpacity={0.8}
            >
                <View style={[styles.checkbox, agreementAccepted && styles.checkboxActive]}>
                    {agreementAccepted && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={styles.agreementToggleText}>
                    J'ai lu et j'accepte la convention de délégation Ombia Express
                </Text>
            </TouchableOpacity>
        </ScrollView>
    );

    const RENDERERS = [renderIntro, renderOwner, renderIdDocs, renderVehicle, renderVehicleDocs, renderAgreement];

    const canProceed = () => {
        if (step === 1) return owner.full_name.trim() && owner.phone.trim() && owner.address.trim() && owner.city.trim() && owner.national_id_number.trim();
        if (step === 2) return idDocs.id_front && idDocs.id_back;
        if (step === 3) return vehicle.make.trim() && vehicle.model.trim() && vehicle.year && vehicle.plate_number.trim() && vehicle.seats;
        return true;
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

            {/* Progress */}
            <View style={styles.progressRow}>
                {STEPS.map((_, i) => (
                    <View key={i} style={[styles.dot, i <= step && { backgroundColor: ORANGE, width: i === step ? 20 : 8 }]} />
                ))}
            </View>

            <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20} style={{ flex: 1 }}>
                <Animated.View style={[styles.stepContent, { transform: [{ translateX: slideAnim }] }]}>
                    {RENDERERS[step]?.()}
                </Animated.View>
            </KeyboardAvoidingView>

            {/* Footer */}
            <View style={styles.footer}>
                {step === STEPS.length - 1 ? (
                    <TouchableOpacity
                        style={[styles.nextBtn, saving && { opacity: 0.6 }]}
                        onPress={handleSubmit}
                        disabled={saving || !agreementAccepted}
                    >
                        {saving
                            ? <ActivityIndicator color="#fff" />
                            : <><Ionicons name="paper-plane" size={18} color="#fff" style={{ marginRight: 8 }} /><Text style={styles.nextBtnText}>Soumettre ma demande</Text></>
                        }
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.nextBtn, !canProceed() && styles.nextBtnDisabled]}
                        onPress={() => goTo(step + 1)}
                        disabled={!canProceed()}
                    >
                        <Text style={styles.nextBtnText}>{step === 0 ? 'Commencer' : 'Continuer'}</Text>
                        <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container:   { flex: 1, backgroundColor: '#fff' },
    header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn:     { marginRight: 12 },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: NAVY },
    headerStep:  { fontSize: 12, color: '#aaa', fontWeight: '600' },
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, marginBottom: 12 },
    dot:         { height: 8, width: 8, borderRadius: 4, backgroundColor: '#E0E0E0' },
    stepContent: { flex: 1, paddingHorizontal: 16 },
    footer:      { paddingHorizontal: 16, paddingBottom: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0' },

    nextBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: ORANGE, paddingVertical: 15, borderRadius: 14, shadowColor: ORANGE, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
    nextBtnDisabled: { opacity: 0.4 },
    nextBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },

    introWrap:     { alignItems: 'center', paddingTop: 8 },
    introIconWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#FFF8EE', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    introTitle:    { fontSize: 22, fontWeight: '800', color: NAVY, textAlign: 'center', marginBottom: 10 },
    introSub:      { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 21, marginBottom: 20, paddingHorizontal: 8 },
    benefitsList:  { width: '100%', marginBottom: 16 },
    benefitRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    benefitIcon:   { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFF8EE', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    benefitText:   { flex: 1, fontSize: 13, color: '#444', fontWeight: '500' },
    splitBadge:    { backgroundColor: '#FFF8EE', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1.5, borderColor: '#FFCC80' },
    splitText:     { fontSize: 12, fontWeight: '700', color: '#E65100', textAlign: 'center' },

    sectionLabel: { fontSize: 15, fontWeight: '700', color: NAVY, marginBottom: 4 },
    sectionHint:  { fontSize: 12, color: '#aaa', marginBottom: 12, lineHeight: 17 },
    fieldLabel:   { fontSize: 12, fontWeight: '700', color: '#666', marginBottom: 6, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.4 },
    input:        { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: '#333', backgroundColor: '#FAFAFA' },
    chipRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
    chip:         { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#FAFAFA' },
    chipActive:   { borderColor: ORANGE, backgroundColor: '#FFF8EE' },
    chipText:     { fontSize: 12, color: '#666', fontWeight: '600' },
    chipTextActive: { color: ORANGE },

    docBtn:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAFAFA', borderRadius: 12, borderWidth: 1.5, borderColor: '#E0E0E0', padding: 12, marginBottom: 8 },
    docThumb:     { width: 44, height: 44, borderRadius: 8 },
    docPlaceholder: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center' },
    docLabel:     { fontSize: 13, fontWeight: '600', color: NAVY, marginBottom: 3 },
    docStatus:    { fontSize: 11, color: '#aaa' },
    photoCount:   { fontSize: 12, color: '#aaa', textAlign: 'center', marginTop: 4, marginBottom: 8 },

    agreementCard:   { backgroundColor: '#FAFAFA', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F0F0F0' },
    clauseRow:       { flexDirection: 'row', marginBottom: 12 },
    clauseTitle:     { fontSize: 13, fontWeight: '700', color: NAVY, marginBottom: 2 },
    clauseText:      { fontSize: 12, color: '#666', lineHeight: 17 },
    agreementToggle: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF8EE', borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: '#FFCC80' },
    checkbox:        { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    checkboxActive:  { backgroundColor: ORANGE, borderColor: ORANGE },
    agreementToggleText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#E65100', lineHeight: 18 },
});
