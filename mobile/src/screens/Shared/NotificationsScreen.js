import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../../context/LanguageContext';

const STORAGE_KEY = 'ombia_notifications';

// ── Type meta ─────────────────────────────────────────────────────────────────

const TYPE_META = {
    ride:    { icon: 'car-sport',    color: '#1565C0', bg: '#E3F2FD' },
    rental:  { icon: 'key',          color: '#FB8C00', bg: '#FFF3E0' },
    order:   { icon: 'bag-handle',   color: '#8E24AA', bg: '#F3E5F5' },
    wallet:  { icon: 'wallet',       color: '#43A047', bg: '#E8F5E9' },
    kyc:     { icon: 'shield-checkmark', color: '#00838F', bg: '#E0F7FA' },
    promo:   { icon: 'gift',         color: '#E53935', bg: '#FFEBEE' },
    system:  { icon: 'information-circle', color: '#546E7A', bg: '#ECEFF1' },
};

const DEFAULT_META = TYPE_META.system;

// ── Notification item ─────────────────────────────────────────────────────────

const NotifItem = ({ item, onMarkRead }) => {
    const meta = TYPE_META[item.type] || DEFAULT_META;
    return (
        <TouchableOpacity
            style={[styles.item, !item.read && styles.itemUnread]}
            onPress={() => onMarkRead(item.id)}
            activeOpacity={0.8}
        >
            <View style={[styles.itemIcon, { backgroundColor: meta.bg }]}>
                <Ionicons name={meta.icon} size={20} color={meta.color} />
            </View>
            <View style={styles.itemBody}>
                <Text style={[styles.itemTitle, !item.read && styles.itemTitleBold]} numberOfLines={2}>
                    {item.title}
                </Text>
                {item.body ? (
                    <Text style={styles.itemBody2} numberOfLines={2}>{item.body}</Text>
                ) : null}
                <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
            </View>
            {!item.read && <View style={[styles.unreadDot, { backgroundColor: meta.color }]} />}
        </TouchableOpacity>
    );
};

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'à l\'instant';
    if (diffMin < 60) return `il y a ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `il y a ${diffH}h`;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

// ── Screen ────────────────────────────────────────────────────────────────────

const NotificationsScreen = ({ navigation }) => {
    const { t } = useLanguage();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEY);
            const stored = raw ? JSON.parse(raw) : [];
            // Sort: newest first
            stored.sort((a, b) => new Date(b.date) - new Date(a.date));
            setNotifications(stored);
        } catch {}
        setLoading(false);
    }, []);

    useFocusEffect(
        React.useCallback(() => { load(); }, [load])
    );

    const markRead = async (id) => {
        const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
        setNotifications(updated);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
    };

    const markAllRead = async () => {
        const updated = notifications.map(n => ({ ...n, read: true }));
        setNotifications(updated);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
    };

    const clearAll = async () => {
        setNotifications([]);
        await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#1C2E4A" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
                    {unreadCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{unreadCount}</Text>
                        </View>
                    )}
                </View>
                {notifications.length > 0 ? (
                    <TouchableOpacity onPress={unreadCount > 0 ? markAllRead : clearAll} style={styles.headerAction}>
                        <Ionicons name={unreadCount > 0 ? 'checkmark-done' : 'trash-outline'} size={18} color="#1565C0" />
                    </TouchableOpacity>
                ) : <View style={{ width: 38 }} />}
            </View>

            {/* Mark all read hint */}
            {unreadCount > 0 && (
                <TouchableOpacity style={styles.markAllRow} onPress={markAllRead}>
                    <Ionicons name="checkmark-done-outline" size={14} color="#1565C0" />
                    <Text style={styles.markAllText}>{t('notifications.markRead')}</Text>
                </TouchableOpacity>
            )}

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#1565C0" />
                </View>
            ) : notifications.length === 0 ? (
                <View style={styles.empty}>
                    <View style={styles.emptyIcon}>
                        <Ionicons name="notifications-off-outline" size={48} color="#D0D8E0" />
                    </View>
                    <Text style={styles.emptyTitle}>{t('notifications.empty')}</Text>
                    <Text style={styles.emptyDesc}>{t('notifications.emptyDesc')}</Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={i => i.id}
                    renderItem={({ item }) => <NotifItem item={item} onMarkRead={markRead} />}
                    contentContainerStyle={styles.list}
                />
            )}
        </SafeAreaView>
    );
};

// ── Static helper: save a notification from anywhere in the app ───────────────

export const saveNotification = async ({ title, body, type = 'system' }) => {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const stored = raw ? JSON.parse(raw) : [];
        stored.unshift({
            id:    Date.now().toString(),
            title,
            body,
            type,
            date:  new Date().toISOString(),
            read:  false,
        });
        // Keep max 50 notifications
        if (stored.length > 50) stored.splice(50);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {}
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F4F8' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
    },
    backBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    },
    headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { fontSize: 17, fontWeight: '800', color: '#1C2E4A' },
    badge: {
        backgroundColor: '#E53935', borderRadius: 10,
        paddingHorizontal: 7, paddingVertical: 2,
    },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
    headerAction: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center',
    },

    markAllRow: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 20, paddingVertical: 8,
        borderBottomWidth: 1, borderBottomColor: '#EAECF0', backgroundColor: '#fff',
    },
    markAllText: { fontSize: 12, color: '#1565C0', fontWeight: '600' },

    list: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 32 },
    item: {
        flexDirection: 'row', alignItems: 'flex-start',
        backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8,
        borderWidth: 1, borderColor: '#EAECF0',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    itemUnread: { borderColor: '#DCEEFF', backgroundColor: '#F8FBFF' },
    itemIcon: {
        width: 42, height: 42, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0,
    },
    itemBody:      { flex: 1 },
    itemTitle:     { fontSize: 13, color: '#1C2E4A', lineHeight: 18 },
    itemTitleBold: { fontWeight: '700' },
    itemBody2:     { fontSize: 12, color: '#9AA3B0', marginTop: 3, lineHeight: 17 },
    itemDate:      { fontSize: 10, color: '#B0B8C1', marginTop: 5 },
    unreadDot:     { width: 8, height: 8, borderRadius: 4, marginLeft: 8, marginTop: 4, flexShrink: 0 },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
    emptyIcon: {
        width: 88, height: 88, borderRadius: 44,
        backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: '#B0B8C1', marginBottom: 8 },
    emptyDesc:  { fontSize: 13, color: '#C8D0D8', textAlign: 'center', lineHeight: 20 },
});

export default NotificationsScreen;
