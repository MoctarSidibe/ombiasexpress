import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Image,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { productAPI } from '../../services/api.service';

const CATEGORIES = [
    { key: 'restaurant',  label: 'Restaurant',   icon: 'restaurant' },
    { key: 'grocery',     label: 'Épicerie',      icon: 'basket' },
    { key: 'fashion',     label: 'Mode',          icon: 'shirt' },
    { key: 'beauty',      label: 'Beauté',        icon: 'sparkles' },
    { key: 'electronics', label: 'Électronique',  icon: 'phone-portrait' },
    { key: 'home',        label: 'Maison',        icon: 'home' },
    { key: 'sports',      label: 'Sport',         icon: 'fitness' },
    { key: 'services',    label: 'Services',      icon: 'construct' },
    { key: 'other',       label: 'Autre',         icon: 'grid' },
];

const UNITS = ['unité', 'kg', 'g', 'litre', 'cl', 'portion', 'lot', 'pièce'];

const CreateProductScreen = ({ route, navigation }) => {
    const editing = route.params?.product;

    const [photos,      setPhotos]      = useState(editing?.photos || []);
    const [name,        setName]        = useState(editing?.name || '');
    const [description, setDescription] = useState(editing?.description || '');
    const [category,    setCategory]    = useState(editing?.category || 'other');
    const [price,       setPrice]       = useState(editing?.price ? String(editing.price) : '');
    const [stock,       setStock]       = useState(editing?.stock === -1 || editing?.stock === undefined ? '' : String(editing.stock));
    const [unit,        setUnit]        = useState(editing?.unit || 'unité');
    const [uploading,   setUploading]   = useState(false);
    const [saving,      setSaving]      = useState(false);

    const pickPhoto = async () => {
        if (photos.length >= 6) {
            Alert.alert('Maximum 6 photos');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
        });
        if (result.canceled) return;
        const asset = result.assets[0];
        setUploading(true);
        try {
            const form = new FormData();
            form.append('photo', {
                uri:  asset.uri,
                name: 'photo.jpg',
                type: 'image/jpeg',
            });
            const res = await productAPI.uploadPhoto(form);
            setPhotos(prev => [...prev, res.data.url]);
        } catch {
            Alert.alert('Erreur', 'Impossible d\'uploader la photo.');
        }
        setUploading(false);
    };

    const removePhoto = (idx) => setPhotos(prev => prev.filter((_, i) => i !== idx));

    const handleSave = async () => {
        if (!name.trim()) return Alert.alert('Nom requis');
        if (!price || isNaN(Number(price))) return Alert.alert('Prix invalide');

        setSaving(true);
        try {
            const payload = {
                name: name.trim(),
                description: description.trim() || null,
                category,
                price: Number(price),
                photos,
                stock: stock.trim() ? Number(stock) : -1,
                unit,
            };
            if (editing) {
                await productAPI.update(editing.id, payload);
            } else {
                await productAPI.create(payload);
            }
            navigation.goBack();
        } catch (e) {
            Alert.alert('Erreur', e.response?.data?.error || 'Impossible de sauvegarder.');
        }
        setSaving(false);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#1C2E4A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{editing ? 'Modifier le produit' : 'Nouveau produit'}</Text>
                <View style={{ width: 38 }} />
            </View>

            <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* Photos */}
                <Text style={styles.fieldLabel}>Photos (max 6)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
                    {photos.map((uri, idx) => (
                        <View key={idx} style={styles.photoWrap}>
                            <Image source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
                            <TouchableOpacity style={styles.removePhoto} onPress={() => removePhoto(idx)}>
                                <Ionicons name="close-circle" size={20} color="#E53935" />
                            </TouchableOpacity>
                        </View>
                    ))}
                    {photos.length < 6 && (
                        <TouchableOpacity style={styles.addPhoto} onPress={pickPhoto} disabled={uploading}>
                            {uploading ? <ActivityIndicator color="#1565C0" /> : (
                                <>
                                    <Ionicons name="camera" size={24} color="#1565C0" />
                                    <Text style={styles.addPhotoText}>Ajouter</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </ScrollView>

                {/* Name */}
                <Text style={styles.fieldLabel}>Nom du produit *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ex: Poulet braisé, T-shirt Nike..."
                    value={name}
                    onChangeText={setName}
                    placeholderTextColor="#B0B8C1"
                />

                {/* Description */}
                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Décrivez votre produit..."
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    placeholderTextColor="#B0B8C1"
                    textAlignVertical="top"
                />

                {/* Category */}
                <Text style={styles.fieldLabel}>Catégorie</Text>
                <View style={styles.chipGrid}>
                    {CATEGORIES.map(c => (
                        <TouchableOpacity
                            key={c.key}
                            style={[styles.chip, category === c.key && styles.chipActive]}
                            onPress={() => setCategory(c.key)}
                        >
                            <Ionicons name={c.icon} size={13} color={category === c.key ? '#fff' : '#546E7A'} style={{ marginRight: 4 }} />
                            <Text style={[styles.chipText, category === c.key && { color: '#fff' }]}>{c.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Price */}
                <Text style={styles.fieldLabel}>Prix (XAF) *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ex: 2500"
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="numeric"
                    placeholderTextColor="#B0B8C1"
                />

                {/* Unit */}
                <Text style={styles.fieldLabel}>Unité</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                    {UNITS.map(u => (
                        <TouchableOpacity
                            key={u}
                            style={[styles.chip, unit === u && styles.chipActive]}
                            onPress={() => setUnit(u)}
                        >
                            <Text style={[styles.chipText, unit === u && { color: '#fff' }]}>{u}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Stock */}
                <Text style={styles.fieldLabel}>Stock (laisser vide = illimité)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ex: 50"
                    value={stock}
                    onChangeText={setStock}
                    keyboardType="numeric"
                    placeholderTextColor="#B0B8C1"
                />

                {/* Save */}
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                    {saving ? <ActivityIndicator color="#fff" /> : (
                        <>
                            <Ionicons name={editing ? 'checkmark' : 'add'} size={20} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.saveBtnText}>{editing ? 'Mettre à jour' : 'Publier le produit'}</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView></KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container:   { flex: 1, backgroundColor: '#F2F4F8' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
    },
    backBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 17, fontWeight: '800', color: '#1C2E4A' },
    scroll: { paddingHorizontal: 16, paddingBottom: 40 },

    fieldLabel: {
        fontSize: 12, fontWeight: '700', color: '#4A5568',
        textTransform: 'uppercase', letterSpacing: 0.3,
        marginTop: 16, marginBottom: 8,
    },
    input: {
        backgroundColor: '#fff', borderRadius: 12,
        borderWidth: 1.5, borderColor: '#EAECF0',
        paddingHorizontal: 14, paddingVertical: 12,
        fontSize: 14, color: '#1C2E4A',
    },
    textArea: { minHeight: 80, textAlignVertical: 'top' },

    photoRow: { gap: 10, paddingBottom: 4 },
    photoWrap: { position: 'relative' },
    photoThumb: { width: 80, height: 80, borderRadius: 10 },
    removePhoto: { position: 'absolute', top: -6, right: -6 },
    addPhoto: {
        width: 80, height: 80, borderRadius: 10,
        borderWidth: 1.5, borderColor: '#DCEEFF', borderStyle: 'dashed',
        backgroundColor: '#F5F9FF', alignItems: 'center', justifyContent: 'center',
    },
    addPhotoText: { fontSize: 10, color: '#1565C0', fontWeight: '700', marginTop: 2 },

    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 7,
        borderRadius: 20, borderWidth: 1.5, borderColor: '#EAECF0', backgroundColor: '#fff',
    },
    chipActive: { backgroundColor: '#1565C0', borderColor: '#1565C0' },
    chipText: { fontSize: 11, fontWeight: '700', color: '#546E7A' },

    saveBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#1565C0', borderRadius: 14,
        paddingVertical: 16, marginTop: 28,
    },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});

export default CreateProductScreen;
