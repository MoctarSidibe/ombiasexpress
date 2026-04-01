import { API_BASE } from '../../services/api.service';
import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api.service';

const fullUrl  = url => (!url ? null : url.startsWith('http') ? url : `${API_BASE}${url}`);

const FUELS = [
    { key: 'essence',     label: 'Essence' },
    { key: 'diesel',      label: 'Diesel' },
    { key: 'hybride',     label: 'Hybride' },
    { key: 'electrique',  label: 'Électrique' },
];
const TRANS = [
    { key: 'manuelle',    label: 'Manuelle' },
    { key: 'automatique', label: 'Automatique' },
];

const INPUT_YEAR = new Date().getFullYear();

export default function CreateCarListingScreen({ navigation, route }) {
    const existing = route.params?.listing;
    const isEdit   = !!existing;

    const [make,         setMake]         = useState(existing?.make || '');
    const [model,        setModel]        = useState(existing?.model || '');
    const [year,         setYear]         = useState(existing?.year ? String(existing.year) : '');
    const [color,        setColor]        = useState(existing?.color || '');
    const [mileage,      setMileage]      = useState(existing?.mileage ? String(existing.mileage) : '');
    const [fuel,         setFuel]         = useState(existing?.fuel_type || '');
    const [transmission, setTransmission] = useState(existing?.transmission || '');
    const [seats,        setSeats]        = useState(existing?.seats ? String(existing.seats) : '');
    const [price,        setPrice]        = useState(existing?.price ? String(existing.price) : '');
    const [city,         setCity]         = useState(existing?.city || '');
    const [description,  setDescription]  = useState(existing?.description || '');
    const [photos,       setPhotos]       = useState(
        (existing?.photos || []).map(url => ({ url: fullUrl(url), uploaded: url }))
    );
    const [saving,       setSaving]       = useState(false);
    const [uploading,    setUploading]    = useState(false);

    const canSave = make.trim() && model.trim() && year.trim() && price.trim();

    const pickPhoto = async () => {
        if (photos.length >= 6) return Alert.alert('Maximum 6 photos');
        const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: true,
        });
        if (res.canceled) return;
        const asset = res.assets[0];
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', { uri: asset.uri, type: 'image/jpeg', name: 'photo.jpg' });
            const up = await api.post('/car-listings/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setPhotos(prev => [...prev, { url: fullUrl(up.data.url), uploaded: up.data.url }]);
        } catch (e) {
            Alert.alert('Erreur upload', e.response?.data?.error || 'Impossible d\'envoyer la photo');
        }
        setUploading(false);
    };

    const removePhoto = (idx) => setPhotos(prev => prev.filter((_, i) => i !== idx));

    const handleSave = async () => {
        if (!canSave) return;
        setSaving(true);
        try {
            const payload = {
                make: make.trim(), model: model.trim(), year: parseInt(year),
                color: color.trim(), mileage: mileage ? parseInt(mileage) : undefined,
                fuel_type: fuel || undefined, transmission: transmission || undefined,
                seats: seats ? parseInt(seats) : undefined,
                price: parseFloat(price), city: city.trim(),
                description: description.trim(),
                photos: photos.map(p => p.uploaded),
            };
            if (isEdit) {
                // Re-submit for review if the listing was already approved
                await api.put(`/car-listings/${existing.id}`, payload);
            } else {
                await api.post('/car-listings', payload);
            }
            Alert.alert(
                isEdit ? 'Annonce modifiée' : 'Annonce soumise !',
                isEdit
                    ? 'Vos modifications ont été enregistrées. L\'annonce repassera en examen si elle était déjà approuvée.'
                    : 'Votre annonce a été soumise et sera examinée par notre équipe sous 24–48h.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (e) {
            Alert.alert('Erreur', e.response?.data?.error || 'Impossible de sauvegarder');
        }
        setSaving(false);
    };

    const Chip = ({ label, selected, onPress }) => (
        <TouchableOpacity
            style={[styles.chip, selected && styles.chipActive]}
            onPress={onPress}
        >
            <Text style={[styles.chipText, selected && styles.chipTextActive]}>{label}</Text>
        </TouchableOpacity>
    );

    const Field = ({ label, value, onChangeText, placeholder, keyboardType, multiline, lines }) => (
        <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TextInput
                style={[styles.input, multiline && { height: (lines || 4) * 22, textAlignVertical: 'top' }]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#C0C8D0"
                keyboardType={keyboardType || 'default'}
                multiline={!!multiline}
            />
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#1C2E4A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isEdit ? 'Modifier l\'annonce' : 'Nouvelle annonce'}</Text>
                <TouchableOpacity
                    style={[styles.saveBtn, !canSave && { opacity: 0.4 }]}
                    onPress={handleSave}
                    disabled={saving || !canSave}
                >
                    {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Publier</Text>}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20} style={{ flex: 1 }}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

                {/* Photos */}
                <Text style={styles.sectionLabel}>Photos du véhicule</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
                    {photos.map((p, i) => (
                        <View key={i} style={styles.photoWrap}>
                            <Image source={{ uri: p.url }} style={styles.photoThumb} />
                            <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(i)}>
                                <Ionicons name="close-circle" size={20} color="#C62828" />
                            </TouchableOpacity>
                        </View>
                    ))}
                    {photos.length < 6 && (
                        <TouchableOpacity style={styles.photoAdd} onPress={pickPhoto} disabled={uploading}>
                            {uploading ? <ActivityIndicator size="small" color="#7B1FA2" /> : <Ionicons name="camera" size={28} color="#7B1FA2" />}
                            <Text style={styles.photoAddText}>Ajouter</Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>

                {/* Vehicle info */}
                <Text style={styles.sectionLabel}>Informations véhicule</Text>
                <View style={styles.row2}>
                    <View style={[styles.fieldWrap, { flex: 1 }]}>
                        <Text style={styles.fieldLabel}>Marque *</Text>
                        <TextInput style={styles.input} value={make} onChangeText={setMake} placeholder="Toyota" placeholderTextColor="#C0C8D0" />
                    </View>
                    <View style={[styles.fieldWrap, { flex: 1 }]}>
                        <Text style={styles.fieldLabel}>Modèle *</Text>
                        <TextInput style={styles.input} value={model} onChangeText={setModel} placeholder="Corolla" placeholderTextColor="#C0C8D0" />
                    </View>
                </View>
                <View style={styles.row2}>
                    <View style={[styles.fieldWrap, { flex: 1 }]}>
                        <Text style={styles.fieldLabel}>Année *</Text>
                        <TextInput style={styles.input} value={year} onChangeText={setYear} placeholder={String(INPUT_YEAR)} keyboardType="numeric" placeholderTextColor="#C0C8D0" />
                    </View>
                    <View style={[styles.fieldWrap, { flex: 1 }]}>
                        <Text style={styles.fieldLabel}>Couleur</Text>
                        <TextInput style={styles.input} value={color} onChangeText={setColor} placeholder="Blanc" placeholderTextColor="#C0C8D0" />
                    </View>
                </View>
                <View style={styles.row2}>
                    <View style={[styles.fieldWrap, { flex: 1 }]}>
                        <Text style={styles.fieldLabel}>Kilométrage</Text>
                        <TextInput style={styles.input} value={mileage} onChangeText={setMileage} placeholder="45000" keyboardType="numeric" placeholderTextColor="#C0C8D0" />
                    </View>
                    <View style={[styles.fieldWrap, { flex: 1 }]}>
                        <Text style={styles.fieldLabel}>Sièges</Text>
                        <TextInput style={styles.input} value={seats} onChangeText={setSeats} placeholder="5" keyboardType="numeric" placeholderTextColor="#C0C8D0" />
                    </View>
                </View>

                <Text style={styles.sectionLabel}>Carburant</Text>
                <View style={styles.chips}>
                    {FUELS.map(f => <Chip key={f.key} label={f.label} selected={fuel === f.key} onPress={() => setFuel(f.key)} />)}
                </View>

                <Text style={styles.sectionLabel}>Transmission</Text>
                <View style={styles.chips}>
                    {TRANS.map(t => <Chip key={t.key} label={t.label} selected={transmission === t.key} onPress={() => setTransmission(t.key)} />)}
                </View>

                <Text style={styles.sectionLabel}>Prix & localisation</Text>
                <View style={styles.row2}>
                    <View style={[styles.fieldWrap, { flex: 1.4 }]}>
                        <Text style={styles.fieldLabel}>Prix de vente (XAF) *</Text>
                        <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="3500000" keyboardType="numeric" placeholderTextColor="#C0C8D0" />
                    </View>
                    <View style={[styles.fieldWrap, { flex: 1 }]}>
                        <Text style={styles.fieldLabel}>Ville</Text>
                        <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="Douala" placeholderTextColor="#C0C8D0" />
                    </View>
                </View>

                <Field label="Description (optionnel)" value={description} onChangeText={setDescription} placeholder="État du véhicule, équipements, historique…" multiline lines={4} />

                <TouchableOpacity
                    style={[styles.submitBtn, !canSave && { opacity: 0.4 }]}
                    onPress={handleSave}
                    disabled={saving || !canSave}
                >
                    {saving ? <ActivityIndicator color="#fff" /> : (
                        <>
                            <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                            <Text style={styles.submitBtnText}>{isEdit ? 'Sauvegarder' : 'Publier l\'annonce'}</Text>
                        </>
                    )}
                </TouchableOpacity>

            </ScrollView></KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FB' },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '700', color: '#1C2E4A' },
    saveBtn: { backgroundColor: '#7B1FA2', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

    scroll: { padding: 16, paddingBottom: 40 },

    sectionLabel: { fontSize: 11, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 6 },

    photoRow:   { marginBottom: 16, paddingVertical: 2 },
    photoWrap:  { position: 'relative', marginRight: 10 },
    photoThumb: { width: 90, height: 80, borderRadius: 10 },
    photoRemove:{ position: 'absolute', top: -6, right: -6 },
    photoAdd:   { width: 90, height: 80, borderRadius: 10, backgroundColor: '#F3E5F5', borderWidth: 1.5, borderColor: '#CE93D8', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
    photoAddText: { fontSize: 10, color: '#7B1FA2', fontWeight: '700' },

    row2:      { flexDirection: 'row', gap: 12 },
    fieldWrap: { marginBottom: 14 },
    fieldLabel:{ fontSize: 11, fontWeight: '700', color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
    input:     { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E8EAF0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1C2E4A' },

    chips:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    chip:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E8EAF0' },
    chipActive:{ backgroundColor: '#7B1FA2', borderColor: '#7B1FA2' },
    chipText: { fontSize: 13, fontWeight: '600', color: '#555' },
    chipTextActive: { color: '#fff' },

    submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#7B1FA2', paddingVertical: 16, borderRadius: 14, gap: 8, marginTop: 8, shadowColor: '#7B1FA2', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 5 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
