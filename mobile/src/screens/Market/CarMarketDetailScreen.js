import { API_BASE } from '../../services/api.service';
import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Image, Dimensions, ActivityIndicator, Linking, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api.service';

const { width: W } = Dimensions.get('window');
const fullUrl  = url => (!url ? null : url.startsWith('http') ? url : `${API_BASE}${url}`);
const fmt      = n => Number(n || 0).toLocaleString('fr-FR');

// ── Seller avatar ─────────────────────────────────────────────────────────────
const getInitials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
const getAvatarColor = (name = '') => {
    const COLORS = ['#7B1FA2', '#1565C0', '#2E7D32', '#E65100', '#00838F', '#AD1457'];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return COLORS[Math.abs(h) % COLORS.length];
};
const SellerAvatar = ({ photoUrl, name = '', size = 48 }) => {
    const uri = fullUrl(photoUrl);
    if (uri) {
        return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
    }
    return (
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: getAvatarColor(name), alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: size * 0.36, fontWeight: '700' }}>{getInitials(name) || '?'}</Text>
        </View>
    );
};

const FUEL_LABEL  = { essence: 'Essence', diesel: 'Diesel', hybride: 'Hybride', electrique: 'Électrique' };
const TRANS_LABEL = { manuelle: 'Manuelle', automatique: 'Automatique' };

export default function CarMarketDetailScreen({ navigation, route }) {
    const insets  = useSafeAreaInsets();
    const initial = route.params?.listing;
    const [listing, setListing] = useState(initial);
    const [loading, setLoading] = useState(!initial);
    const [photoIdx, setPhotoIdx] = useState(0);

    useEffect(() => {
        if (!initial?.id) return;
        api.get(`/car-listings/${initial.id}`)
            .then(r => setListing(r.data.listing))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [initial?.id]);

    if (loading) {
        return <SafeAreaView style={styles.container}><ActivityIndicator size="large" color="#7B1FA2" style={{ marginTop: 60 }} /></SafeAreaView>;
    }
    if (!listing) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#aaa' }}>Annonce introuvable</Text>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>
                        <Text style={{ color: '#7B1FA2', fontWeight: '700' }}>Retour</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const photos = (listing.photos || []).map(fullUrl).filter(Boolean);

    const specs = [
        ['Année',         listing.year],
        ['Couleur',       listing.color],
        ['Kilométrage',   listing.mileage ? `${fmt(listing.mileage)} km` : null],
        ['Carburant',     FUEL_LABEL[listing.fuel_type] || listing.fuel_type],
        ['Transmission',  TRANS_LABEL[listing.transmission] || listing.transmission],
        ['Sièges',        listing.seats ? `${listing.seats} places` : null],
        ['Ville',         listing.city],
    ].filter(([, v]) => v);

    const handleContact = () => {
        const phone = listing.seller?.phone;
        if (phone) {
            Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Impossible d\'ouvrir le téléphone'));
        } else {
            Alert.alert('Contact indisponible', 'Les coordonnées du vendeur ne sont pas disponibles pour le moment.');
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            {/* Photo gallery */}
            <View style={styles.gallery}>
                {photos.length > 0 ? (
                    <ScrollView
                        horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={e => setPhotoIdx(Math.round(e.nativeEvent.contentOffset.x / W))}
                    >
                        {photos.map((uri, i) => (
                            <Image key={i} source={{ uri }} style={{ width: W, height: 260, resizeMode: 'cover' }} />
                        ))}
                    </ScrollView>
                ) : (
                    <View style={styles.galleryEmpty}>
                        <Ionicons name="car-outline" size={60} color="#ddd" />
                    </View>
                )}

                {/* Back button */}
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>

                {/* Photo counter */}
                {photos.length > 1 && (
                    <View style={styles.photoDots}>
                        {photos.map((_, i) => (
                            <View key={i} style={[styles.dot, i === photoIdx && styles.dotActive]} />
                        ))}
                    </View>
                )}
            </View>

            <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 80 }]} showsVerticalScrollIndicator={false}>
                {/* Title + price */}
                <View style={styles.titleRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.carTitle}>{listing.make} {listing.model}</Text>
                        <Text style={styles.carYear}>{listing.year}{listing.color ? ` · ${listing.color}` : ''}</Text>
                    </View>
                    <Text style={styles.price}>{fmt(listing.price)} XAF</Text>
                </View>

                {/* City + views */}
                <View style={styles.metaRow}>
                    {listing.city && (
                        <View style={styles.metaItem}>
                            <Ionicons name="location-outline" size={14} color="#7B1FA2" />
                            <Text style={styles.metaText}>{listing.city}</Text>
                        </View>
                    )}
                    <View style={styles.metaItem}>
                        <Ionicons name="eye-outline" size={14} color="#aaa" />
                        <Text style={styles.metaText}>{listing.view_count || 0} vues</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Ionicons name="calendar-outline" size={14} color="#aaa" />
                        <Text style={styles.metaText}>{new Date(listing.created_at).toLocaleDateString('fr-FR')}</Text>
                    </View>
                </View>

                {/* Specs grid */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Caractéristiques</Text>
                    <View style={styles.specsGrid}>
                        {specs.map(([l, v]) => (
                            <View key={l} style={styles.specItem}>
                                <Text style={styles.specLabel}>{l}</Text>
                                <Text style={styles.specValue}>{v}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Description */}
                {listing.description ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Description</Text>
                        <Text style={styles.description}>{listing.description}</Text>
                    </View>
                ) : null}

                {/* Seller info */}
                <View style={styles.sellerCard}>
                    <SellerAvatar photoUrl={listing.seller?.profile_photo} name={listing.seller?.name} size={48} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.sellerName}>{listing.seller?.name || 'Vendeur Ombia'}</Text>
                        <Text style={styles.sellerLabel}>Vendeur vérifié · Ombia</Text>
                        {listing.seller?.phone && (
                            <Text style={styles.sellerPhone}>{listing.seller.phone}</Text>
                        )}
                    </View>
                    <View style={styles.verifiedBadge}>
                        <Ionicons name="shield-checkmark" size={14} color="#7B1FA2" />
                        <Text style={styles.verifiedText}>Vérifié</Text>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom contact bar */}
            <View style={[styles.contactBar, { paddingBottom: insets.bottom + 8 }]}>
                <View>
                    <Text style={styles.contactPrice}>{fmt(listing.price)} XAF</Text>
                    <Text style={styles.contactNeg}>Prix négociable</Text>
                </View>
                <TouchableOpacity style={styles.contactBtn} onPress={handleContact}>
                    <Ionicons name="call" size={18} color="#fff" />
                    <Text style={styles.contactBtnText}>Contacter le vendeur</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FB' },

    gallery: { width: W, height: 260, backgroundColor: '#F0F0F0', position: 'relative' },
    galleryEmpty: { width: W, height: 260, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F5' },
    backBtn: { position: 'absolute', top: 16, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
    photoDots: { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
    dotActive: { backgroundColor: '#fff', width: 16 },

    scroll: { padding: 16 },

    titleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
    carTitle: { fontSize: 22, fontWeight: '800', color: '#1C2E4A' },
    carYear:  { fontSize: 13, color: '#aaa', marginTop: 2 },
    price:    { fontSize: 20, fontWeight: '900', color: '#7B1FA2', marginLeft: 12 },

    metaRow:  { flexDirection: 'row', gap: 14, marginBottom: 20, flexWrap: 'wrap' },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 12, color: '#888' },

    section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    sectionTitle: { fontSize: 12, fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },

    specsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    specItem:  { width: '46%', backgroundColor: '#F8F9FB', borderRadius: 10, padding: 10 },
    specLabel: { fontSize: 10, color: '#aaa', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.4 },
    specValue: { fontSize: 14, fontWeight: '700', color: '#1C2E4A' },

    description: { fontSize: 14, color: '#555', lineHeight: 22 },

    sellerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, gap: 12 },
    sellerName: { fontSize: 15, fontWeight: '700', color: '#1C2E4A' },
    sellerLabel: { fontSize: 11, color: '#aaa', marginTop: 2 },
    sellerPhone: { fontSize: 12, color: '#7B1FA2', fontWeight: '600', marginTop: 2 },
    verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F3E5F5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    verifiedText: { fontSize: 11, fontWeight: '700', color: '#7B1FA2' },

    contactBar: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F0F0F0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14 },
    contactPrice: { fontSize: 18, fontWeight: '900', color: '#1C2E4A' },
    contactNeg: { fontSize: 10, color: '#aaa', marginTop: 1 },
    contactBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#7B1FA2', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 14, shadowColor: '#7B1FA2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    contactBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
