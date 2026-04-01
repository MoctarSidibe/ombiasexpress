import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS } from '../../constants/colors';
import { rideAPI, deliveryAPI, rentalAPI } from '../../services/api.service';

const ORANGE = '#FFA726';
const NAVY   = '#1C2E4A';

// ── Mood / label per star ─────────────────────────────────────────────────────

const MOODS = [
    { emoji: '😡', label: 'Mauvais',   value: 1 },
    { emoji: '😕', label: 'Passable',  value: 2 },
    { emoji: '😐', label: 'Correct',   value: 3 },
    { emoji: '😊', label: 'Bien',      value: 4 },
    { emoji: '🤩', label: 'Excellent', value: 5 },
];

// ── Category tags per service type ────────────────────────────────────────────

const RIDE_CATS = [
    { key: 'ponctualite', icon: 'time-outline',       label: 'Ponctualité' },
    { key: 'conduite',    icon: 'car-outline',         label: 'Conduite' },
    { key: 'proprete',    icon: 'sparkles-outline',    label: 'Propreté' },
    { key: 'courtoisie',  icon: 'chatbubble-outline',  label: 'Courtoisie' },
];

const DELIVERY_CATS = [
    { key: 'rapidite',    icon: 'flash-outline',       label: 'Rapidité' },
    { key: 'soin',        icon: 'heart-outline',       label: 'Soin du colis' },
    { key: 'courtoisie',  icon: 'chatbubble-outline',  label: 'Courtoisie' },
    { key: 'ponctualite', icon: 'time-outline',        label: 'Ponctualité' },
];

const RENTAL_CATS = [
    { key: 'etat_vehicule', icon: 'car-outline',          label: 'État du véhicule' },
    { key: 'proprete',      icon: 'sparkles-outline',     label: 'Propreté' },
    { key: 'disponibilite', icon: 'checkmark-circle-outline', label: 'Disponibilité' },
    { key: 'courtoisie',    icon: 'chatbubble-outline',   label: 'Courtoisie' },
];

const CATS_MAP = {
    ride:     RIDE_CATS,
    delivery: DELIVERY_CATS,
    rental:   RENTAL_CATS,
};

const SERVICE_META = {
    ride:     { title: 'Évaluez votre course',    subtitle: 'Comment s\'est passé votre trajet ?',     icon: 'car',      color: ORANGE },
    delivery: { title: 'Évaluez la livraison',    subtitle: 'Comment s\'est passée votre livraison ?', icon: 'cube',     color: '#1565C0' },
    rental:   { title: 'Évaluez la location',     subtitle: 'Comment s\'est passée votre location ?',  icon: 'key',      color: '#2E7D32' },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function RatingScreen({ route, navigation }) {
    // serviceType: 'ride' | 'delivery' | 'rental'
    // serviceId:   UUID of the ride / delivery / rental booking
    const { serviceType = 'ride', serviceId, rideId } = route.params || {};
    const id = serviceId || rideId; // backwards compatibility

    const [rating,  setRating]  = useState(0);
    const [tags,    setTags]    = useState([]);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);

    const meta  = SERVICE_META[serviceType] || SERVICE_META.ride;
    const cats  = CATS_MAP[serviceType]     || RIDE_CATS;
    const mood  = MOODS.find(m => m.value === rating);

    const toggleTag = (key) =>
        setTags(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

    const handleSubmit = async () => {
        if (rating < 1) {
            Alert.alert('Évaluation requise', 'Choisissez une note avant de continuer.');
            return;
        }
        setLoading(true);
        try {
            const payload = {
                rating,
                comment: comment.trim() || undefined,
                categories: tags.length > 0 ? tags : undefined,
            };
            if (serviceType === 'ride')     await rideAPI.rate(id, rating, payload.comment);
            if (serviceType === 'delivery') await deliveryAPI.rate(id, payload);
            if (serviceType === 'rental')   await rentalAPI.rateBooking(id, payload);

            Alert.alert('Merci !', 'Votre avis a bien été enregistré.', [
                { text: 'OK', onPress: () => navigation.navigate('HubTabs') },
            ]);
        } catch (e) {
            Alert.alert('Erreur', e.response?.data?.error || 'Impossible d\'envoyer l\'évaluation.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

                {/* Header icon */}
                <View style={styles.iconWrap}>
                    <View style={[styles.iconCircle, { backgroundColor: meta.color + '18' }]}>
                        <Ionicons name={meta.icon} size={34} color={meta.color} />
                    </View>
                </View>
                <Text style={styles.title}>{meta.title}</Text>
                <Text style={styles.subtitle}>{meta.subtitle}</Text>

                {/* Emoji moods */}
                <View style={styles.moodsRow}>
                    {MOODS.map(m => (
                        <TouchableOpacity
                            key={m.value}
                            style={[styles.moodBtn, rating === m.value && { borderColor: meta.color, backgroundColor: meta.color + '12' }]}
                            onPress={() => setRating(m.value)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.moodEmoji}>{m.emoji}</Text>
                            <Text style={[styles.moodLabel, rating === m.value && { color: meta.color }]}>{m.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Star row */}
                <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map(star => (
                        <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.8}>
                            <Ionicons
                                name={star <= rating ? 'star' : 'star-outline'}
                                size={38}
                                color={star <= rating ? '#FFD700' : COLORS.gray300}
                            />
                        </TouchableOpacity>
                    ))}
                </View>
                {mood && (
                    <Text style={[styles.moodSelectedLabel, { color: meta.color }]}>{mood.label}</Text>
                )}

                {/* Category tags */}
                <Text style={styles.sectionLabel}>Points remarqués</Text>
                <View style={styles.tagsRow}>
                    {cats.map(cat => {
                        const selected = tags.includes(cat.key);
                        return (
                            <TouchableOpacity
                                key={cat.key}
                                style={[styles.tagBtn, selected && { backgroundColor: meta.color, borderColor: meta.color }]}
                                onPress={() => toggleTag(cat.key)}
                                activeOpacity={0.8}
                            >
                                <Ionicons
                                    name={cat.icon}
                                    size={14}
                                    color={selected ? '#fff' : COLORS.textSecondary}
                                />
                                <Text style={[styles.tagText, selected && styles.tagTextActive]}>
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Comment */}
                <TextInput
                    style={styles.commentInput}
                    placeholder="Un commentaire ? (optionnel)"
                    placeholderTextColor={COLORS.textSecondary}
                    value={comment}
                    onChangeText={setComment}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                />

                {/* Submit */}
                <TouchableOpacity
                    style={[styles.submitBtn, (loading || rating < 1) && styles.submitBtnDisabled, { backgroundColor: meta.color }]}
                    onPress={handleSubmit}
                    disabled={loading || rating < 1}
                >
                    {loading
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.submitBtnText}>Envoyer mon avis</Text>
                    }
                </TouchableOpacity>

                <TouchableOpacity style={styles.skipBtn} onPress={() => navigation.navigate('HubTabs')}>
                    <Text style={styles.skipText}>Passer</Text>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content:   { padding: SPACING.lg, paddingTop: SPACING.xl },

    iconWrap:   { alignSelf: 'center', marginBottom: SPACING.md },
    iconCircle: {
        width: 76, height: 76, borderRadius: 38,
        justifyContent: 'center', alignItems: 'center',
        ...SHADOWS.md,
    },
    title: {
        fontSize: FONT_SIZES.xxl, fontWeight: '800', color: NAVY,
        textAlign: 'center', marginBottom: SPACING.xs,
    },
    subtitle: {
        fontSize: FONT_SIZES.md, color: COLORS.textSecondary,
        textAlign: 'center', marginBottom: SPACING.xl,
    },

    moodsRow: {
        flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.md,
    },
    moodBtn: {
        flex: 1, alignItems: 'center', paddingVertical: 10,
        borderRadius: BORDER_RADIUS.lg, marginHorizontal: 3,
        backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border,
    },
    moodEmoji:    { fontSize: 26, marginBottom: 4 },
    moodLabel:    { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600' },

    starsRow: {
        flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 6,
    },
    moodSelectedLabel: {
        textAlign: 'center', fontSize: FONT_SIZES.md, fontWeight: '700',
        marginBottom: SPACING.lg,
    },

    sectionLabel: {
        fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textSecondary,
        marginBottom: SPACING.sm, textTransform: 'uppercase', letterSpacing: 0.6,
    },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.lg },
    tagBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingVertical: 8, paddingHorizontal: 13,
        borderRadius: BORDER_RADIUS.full, borderWidth: 1.5,
        borderColor: COLORS.border, backgroundColor: COLORS.surface,
    },
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
        padding: SPACING.md, borderRadius: BORDER_RADIUS.lg,
        alignItems: 'center', ...SHADOWS.md,
    },
    submitBtnDisabled: { opacity: 0.4 },
    submitBtnText: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: '#fff' },

    skipBtn: { alignItems: 'center', marginTop: SPACING.md, padding: SPACING.sm },
    skipText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, fontWeight: '600' },
});
