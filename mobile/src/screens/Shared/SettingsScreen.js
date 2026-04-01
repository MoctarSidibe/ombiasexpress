import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Switch, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';

const APP_VERSION = '1.0.0';

// ── Row components ────────────────────────────────────────────────────────────

const SectionHeader = ({ label }) => (
    <Text style={styles.sectionHeader}>{label.toUpperCase()}</Text>
);

const Row = ({ icon, iconColor, iconBg, label, desc, right, onPress, noBorder }) => (
    <TouchableOpacity
        style={[styles.row, noBorder && styles.rowNoBorder]}
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
        disabled={!onPress}
    >
        <View style={[styles.rowIcon, { backgroundColor: iconBg || '#F5F5F5' }]}>
            <Ionicons name={icon} size={18} color={iconColor || '#546E7A'} />
        </View>
        <View style={styles.rowBody}>
            <Text style={styles.rowLabel}>{label}</Text>
            {desc ? <Text style={styles.rowDesc}>{desc}</Text> : null}
        </View>
        <View style={styles.rowRight}>{right}</View>
    </TouchableOpacity>
);

// ── Screen ────────────────────────────────────────────────────────────────────

const SettingsScreen = ({ navigation }) => {
    const { language, setLanguage, t } = useLanguage();
    const [notifEnabled, setNotifEnabled] = useState(true);

    const openLink = (url) => {
        Linking.openURL(url).catch(() => Alert.alert(t('common.error'), 'Impossible d\'ouvrir le lien.'));
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#1C2E4A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('settings.title')}</Text>
                <View style={{ width: 38 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

                {/* ── Language ── */}
                <SectionHeader label={t('settings.language.label')} />
                <View style={styles.card}>
                    {[
                        { code: 'fr', flag: '🇫🇷', label: t('settings.language.french') },
                        { code: 'en', flag: '🇬🇧', label: t('settings.language.english') },
                    ].map((lang, idx, arr) => (
                        <TouchableOpacity
                            key={lang.code}
                            style={[styles.langOption, idx === arr.length - 1 && styles.rowNoBorder]}
                            onPress={() => setLanguage(lang.code)}
                            activeOpacity={0.75}
                        >
                            <Text style={styles.langFlag}>{lang.flag}</Text>
                            <Text style={styles.langLabel}>{lang.label}</Text>
                            <View style={styles.langCheck}>
                                {language === lang.code && (
                                    <Ionicons name="checkmark-circle" size={22} color="#1565C0" />
                                )}
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Notifications ── */}
                <SectionHeader label={t('settings.notifications.label')} />
                <View style={styles.card}>
                    <Row
                        icon="notifications-outline"
                        iconColor="#8E24AA"
                        iconBg="#F3E5F5"
                        label={t('settings.notifications.label')}
                        desc={t('settings.notifications.desc')}
                        right={
                            <Switch
                                value={notifEnabled}
                                onValueChange={setNotifEnabled}
                                trackColor={{ false: '#E0E0E0', true: '#8E24AA40' }}
                                thumbColor={notifEnabled ? '#8E24AA' : '#9E9E9E'}
                            />
                        }
                        noBorder
                    />
                </View>

                {/* ── About ── */}
                <SectionHeader label={t('settings.about.label')} />
                <View style={styles.card}>
                    <Row
                        icon="information-circle-outline"
                        iconColor="#1565C0"
                        iconBg="#E3F2FD"
                        label={t('settings.about.version')}
                        right={<Text style={styles.versionText}>{APP_VERSION}</Text>}
                    />
                    <Row
                        icon="shield-checkmark-outline"
                        iconColor="#43A047"
                        iconBg="#E8F5E9"
                        label={t('settings.about.privacy')}
                        right={<Ionicons name="chevron-forward" size={16} color="#B0B8C1" />}
                        onPress={() => openLink('https://ombia.app/privacy')}
                    />
                    <Row
                        icon="document-text-outline"
                        iconColor="#FB8C00"
                        iconBg="#FFF3E0"
                        label={t('settings.about.terms')}
                        right={<Ionicons name="chevron-forward" size={16} color="#B0B8C1" />}
                        onPress={() => openLink('https://ombia.app/terms')}
                    />
                    <Row
                        icon="mail-outline"
                        iconColor="#E53935"
                        iconBg="#FFEBEE"
                        label={t('settings.about.contact')}
                        right={<Ionicons name="chevron-forward" size={16} color="#B0B8C1" />}
                        onPress={() => openLink('mailto:support@ombia.app')}
                        noBorder
                    />
                </View>

                {/* Ombia branding */}
                <View style={styles.brand}>
                    <Text style={styles.brandName}>Ombia Express</Text>
                    <Text style={styles.brandTagline}>
                        {language === 'fr'
                            ? 'La super-app du transport au Gabon'
                            : 'The super-app for transport in Gabon'}
                    </Text>
                    <Text style={styles.brandVersion}>v{APP_VERSION}</Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
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
    headerTitle: { fontSize: 17, fontWeight: '800', color: '#1C2E4A' },
    scroll: { paddingHorizontal: 16, paddingBottom: 40 },

    sectionHeader: {
        fontSize: 10, fontWeight: '800', color: '#9AA3B0',
        letterSpacing: 0.8, marginTop: 20, marginBottom: 8, marginLeft: 4,
    },
    card: {
        backgroundColor: '#fff', borderRadius: 14,
        borderWidth: 1, borderColor: '#EAECF0',
        overflow: 'hidden',
    },

    // Language options
    langOption: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
    },
    langFlag:  { fontSize: 22, marginRight: 14 },
    langLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1C2E4A' },
    langCheck: { width: 28, alignItems: 'flex-end' },

    // Generic row
    row: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
    },
    rowNoBorder: { borderBottomWidth: 0 },
    rowIcon: {
        width: 36, height: 36, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center', marginRight: 14,
    },
    rowBody:  { flex: 1 },
    rowLabel: { fontSize: 14, fontWeight: '600', color: '#1C2E4A' },
    rowDesc:  { fontSize: 11, color: '#9AA3B0', marginTop: 2, lineHeight: 15 },
    rowRight: { marginLeft: 8 },
    versionText: { fontSize: 13, color: '#9AA3B0', fontWeight: '600' },

    // Branding footer
    brand: { alignItems: 'center', marginTop: 40, paddingBottom: 8 },
    brandName:    { fontSize: 15, fontWeight: '900', color: '#1C2E4A', letterSpacing: 0.5 },
    brandTagline: { fontSize: 11, color: '#B0B8C1', marginTop: 4 },
    brandVersion: { fontSize: 10, color: '#D0D8E0', marginTop: 6 },
});

export default SettingsScreen;
