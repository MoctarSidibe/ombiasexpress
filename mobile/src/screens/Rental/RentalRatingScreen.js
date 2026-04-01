import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../constants/colors';
import { rentalAPI } from '../../services/api.service';

const ORANGE = '#FFA726';
const NAVY   = '#1C2E4A';
const GREEN  = '#2E7D32';

const MOODS = [
    { emoji: '😡', label: 'Mauvais',   value: 1 },
    { emoji: '😕', label: 'Passable',  value: 2 },
    { emoji: '😐', label: 'Correct',   value: 3 },
    { emoji: '😊', label: 'Bien',      value: 4 },
    { emoji: '🤩', label: 'Excellent', value: 5 },
];

const CATEGORIES = [
    { key: 'etat_vehicule', icon: 'car-outline',              label: 'État du véhicule' },
    { key: 'proprete',      icon: 'sparkles-outline',         label: 'Propreté' },
    { key: 'disponibilite', icon: 'checkmark-circle-outline', label: 'Disponibilité' },
    { key: 'courtoisie',    icon: 'chatbubble-outline',       label: 'Courtoisie' },
];

export default function RentalRatingScreen({ route, navigation }) {
    const { booking } = route.params || {};
    const car = booking?.rentalCar;

    const [rating,  setRating]  = useState(0);
    const [tags,    setTags]    = useState([]);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);

    const mood = MOODS.find(m => m.value === rating);

    const toggleTag = (key) =>
        setTags(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

    const handleSubmit = async () => {
        if (rating === 0) {
            Alert.alert('Évaluation requise', 'Veuillez choisir une note avant de continuer.');
            return;
        }
        setLoading(true);
        try {
            await rentalAPI.rateBooking(booking.id, {
                rating,
                comment: comment.trim() || undefined,
                categories: tags.length > 0 ? tags : undefined,
            });
            Alert.alert('Merci !', 'Votre avis a bien été enregistré.', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (e) {
            Alert.alert('Erreur', e.response?.data?.error || 'Impossible d\'envoyer l\'évaluation.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={NAVY} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Évaluer la location</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

                {/* Car card */}
                {car && (
                    <View style={styles.carCard}>
                        <View style={styles.carIconWrap}>
                            <Ionicons name="car" size={28} color={GREEN} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.carName}>{car.make} {car.model} {car.year}</Text>
                            <Text style={styles.carSub}>{car.color}</Text>
                        </View>
                    </View>
                )}

                {/* Emoji moods */}
                <Text style={styles.sectionLabel}>Votre ressenti</Text>
                <View style={styles.moodsRow}>
                    {MOODS.map(m => (
                        <TouchableOpacity
                            key={m.value}
                            style={[styles.moodBtn, rating === m.value && styles.moodBtnActive]}
                            onPress={() => setRating(m.value)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.moodEmoji}>{m.emoji}</Text>
                            <Text style={[styles.moodLabel, rating === m.value && styles.moodLabelActive]}>
                                {m.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Stars */}
                <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map(star => (
                        <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.8}>
                            <Ionicons
                                name={star <= rating ? 'star' : 'star-outline'}
                                size={40}
                                color={star <= rating ? '#FFD700' : COLORS.gray300}
                            />
                        </TouchableOpacity>
                    ))}
                </View>
                {mood && (
                    <Text style={styles.moodSelectedLabel}>{mood.label}</Text>
                )}

                {/* Category tags */}
                <Text style={styles.sectionLabel}>Points remarqués</Text>
                <View style={styles.tagsRow}>
                    {CATEGORIES.map(cat => {
                        const selected = tags.includes(cat.key);
                        return (
                            <TouchableOpacity
                                key={cat.key}
                                style={[styles.tagBtn, selected && styles.tagBtnActive]}
                                onPress={() => toggleTag(cat.key)}
                                activeOpacity={0.8}
                            >
                                <Ionicons name={cat.icon} size={14} color={selected ? '#fff' : COLORS.textSecondary} />
                                <Text style={[styles.tagText, selected && styles.tagTextActive]}>{cat.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Comment */}
                <TextInput
                    style={styles.commentInput}
                    placeholder="Un commentaire ? (optionnel)"
                    placeholderTextColor={COLORS.textSecondary}
                    multiline
                    numberOfLines={3}
                    value={comment}
                    onChangeText={setComment}
                    textAlignVertical="top"
                    maxLength={500}
                />

                {/* Submit */}
                <TouchableOpacity
                    style={[styles.submitBtn, (rating === 0 || loading) && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={rating === 0 || loading}
                >
                    {loading
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.submitBtnText}>Envoyer mon avis</Text>
                    }
                </TouchableOpacity>

                <TouchableOpacity style={styles.skipBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.skipText}>Passer</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },

    header: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    backBtn:     { padding: 4 },
    headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: NAVY },

    content: { padding: SPACING.lg },

    carCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#F0FFF4', borderRadius: 14, padding: 14,
        borderWidth: 1, borderColor: '#A5D6A7', marginBottom: SPACING.lg,
    },
    carIconWrap: {
        width: 48, height: 48, borderRadius: 12,
        backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center',
    },
    carName: { fontSize: 15, fontWeight: '700', color: NAVY, marginBottom: 2 },
    carSub:  { fontSize: 12, color: COLORS.textSecondary },

    sectionLabel: {
        fontSize: 11, fontWeight: '700', color: '#aaa',
        letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 10,
    },

    moodsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.md },
    moodBtn: {
        flex: 1, alignItems: 'center', paddingVertical: 10,
        borderRadius: BORDER_RADIUS.lg, marginHorizontal: 3,
        backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border,
    },
    moodBtnActive:  { borderColor: GREEN, backgroundColor: '#F0FFF4' },
    moodEmoji:      { fontSize: 26, marginBottom: 4 },
    moodLabel:      { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600' },
    moodLabelActive: { color: GREEN },

    starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 6 },
    moodSelectedLabel: {
        textAlign: 'center', fontSize: FONT_SIZES.md, fontWeight: '700',
        color: GREEN, marginBottom: SPACING.lg,
    },

    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.lg },
    tagBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingVertical: 7, paddingHorizontal: 12,
        borderRadius: BORDER_RADIUS.full, borderWidth: 1.5,
        borderColor: COLORS.border, backgroundColor: COLORS.surface,
    },
    tagBtnActive:  { backgroundColor: GREEN, borderColor: GREEN },
    tagText:       { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textSecondary },
    tagTextActive: { color: '#fff' },

    commentInput: {
        borderWidth: 1, borderColor: COLORS.border,
        borderRadius: BORDER_RADIUS.lg, padding: SPACING.md,
        fontSize: FONT_SIZES.md, color: COLORS.textPrimary,
        minHeight: 88, marginBottom: SPACING.xl,
        backgroundColor: COLORS.surface,
    },

    submitBtn: {
        backgroundColor: GREEN, padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg, alignItems: 'center',
        ...SHADOWS.md,
    },
    submitBtnDisabled: { opacity: 0.4 },
    submitBtnText: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: '#fff' },

    skipBtn: { alignItems: 'center', marginTop: SPACING.md, padding: SPACING.sm },
    skipText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, fontWeight: '600' },
});
