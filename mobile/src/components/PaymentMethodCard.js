import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS } from '../constants/colors';

// ── Mini virtual Ombia Express card ───────────────────────────────────────────
export const MiniOmbiaCard = ({ width = 60, height = 42 }) => (
    <View style={[miniCard.card, { width, height, borderRadius: width * 0.12 }]}>
        {/* Shine */}
        <View style={[miniCard.shine, { width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4 }]} />
        {/* Top row: icon + NFC */}
        <View style={miniCard.top}>
            <Image
                source={require('../../assets/ombia-icon.png')}
                style={{ width: width * 0.22, height: width * 0.22 }}
                resizeMode="contain"
            />
            {/* NFC arcs */}
            <View style={miniCard.nfcWrap}>
                {[width * 0.12, width * 0.19, width * 0.26].map((s, i) => (
                    <View key={i} style={{
                        position:    'absolute',
                        width: s, height: s,
                        borderRadius: s / 2,
                        borderWidth:  1,
                        borderColor:  '#FFA726',
                        opacity:      0.25 + i * 0.2,
                    }} />
                ))}
            </View>
        </View>
        {/* Bottom: brand + payment mode icons */}
        <View style={miniCard.bottom}>
            <View>
                <Text style={[miniCard.brand, { fontSize: width * 0.13, letterSpacing: width * 0.008 }]}>OMBIA</Text>
                <Text style={[miniCard.brandSub, { fontSize: width * 0.09, letterSpacing: 0 }]}>EXPRESS</Text>
            </View>
            <View style={miniCard.modes}>
                {/* NFC waves icon */}
                <View style={miniCard.modeIcon}>
                    <View style={[miniCard.nfcArcSm, { width: width*0.08, height: width*0.08, borderRadius: width*0.04 }]} />
                    <View style={[miniCard.nfcArcSm, { width: width*0.13, height: width*0.13, borderRadius: width*0.065, opacity: 0.5 }]} />
                </View>
                {/* QR dot grid */}
                <View style={[miniCard.modeIcon, { marginLeft: 4 }]}>
                    {[0,1,2].map(r => (
                        <View key={r} style={{ flexDirection: 'row' }}>
                            {[0,1,2].map(c => (
                                <View key={c} style={{
                                    width: width * 0.05, height: width * 0.05,
                                    backgroundColor: (r===0&&c===0)||(r===0&&c===2)||(r===2&&c===0)||(r===1&&c===1) ? '#FFA726' : 'rgba(255,255,255,0.25)',
                                    margin: 0.8, borderRadius: 1,
                                }} />
                            ))}
                        </View>
                    ))}
                </View>
            </View>
        </View>
    </View>
);

const miniCard = StyleSheet.create({
    card: {
        backgroundColor: '#1A2E48',
        padding:         5,
        justifyContent:  'space-between',
        overflow:        'hidden',
    },
    shine: {
        position:        'absolute',
        top:             -12,
        right:           -12,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    top: {
        flexDirection:  'row',
        alignItems:     'center',
        justifyContent: 'space-between',
    },
    nfcWrap: {
        width: 18,
        height: 18,
        alignItems:     'center',
        justifyContent: 'center',
    },
    bottom: {
        flexDirection:  'row',
        alignItems:     'flex-end',
        justifyContent: 'space-between',
    },
    brand: {
        color:      '#fff',
        fontWeight: '800',
        lineHeight: 13,
    },
    brandSub: {
        color:         'rgba(255,255,255,0.5)',
        fontWeight:    '700',
        letterSpacing: 0.6,
    },
    modes: {
        flexDirection: 'row',
        alignItems:    'center',
    },
    modeIcon: {
        alignItems:     'center',
        justifyContent: 'center',
    },
    nfcArcSm: {
        position:    'absolute',
        borderWidth: 1,
        borderColor: '#FFA726',
    },
});

// ── Payment method config ─────────────────────────────────────────────────────
export const PAYMENT_METHODS = {
    wallet: {
        type:        'mini_card',
        name:        'Ombia Express',
        description: 'NFC sans contact ou Scan QR · –5%',
        color:       '#1A2E48',
    },
    cash: {
        type:        'icon',
        icon:        'cash-outline',
        iconColor:   '#2E7D32',
        iconBg:      '#E8F5E9',
        name:        'Espèces',
        description: 'Payer en cash',
    },
    airtel_money: {
        type:        'image',
        image:       require('../../assets/airtel-money.png'),
        name:        'Airtel Money',
        description: 'Mobile money',
    },
    moov_money: {
        type:        'image',
        image:       require('../../assets/moov-money.png'),
        name:        'Moov Money',
        description: 'Mobile money',
    },
    bank_card: {
        type:        'image',
        image:       require('../../assets/card-payment.png'),
        name:        'Carte bancaire',
        description: 'Mastercard / Visa',
    },
};

// ── Dropdown row card ─────────────────────────────────────────────────────────
const PaymentMethodCard = ({ method, selected, onSelect, style }) => {
    const info = PAYMENT_METHODS[method];
    if (!info) return null;

    return (
        <TouchableOpacity
            style={[styles.container, selected && styles.containerSelected, style]}
            onPress={() => onSelect(method)}
            activeOpacity={0.7}
        >
            {/* Logo / icon / mini card */}
            <View style={styles.logoWrap}>
                {info.type === 'mini_card' ? (
                    <MiniOmbiaCard width={60} height={42} />
                ) : info.type === 'image' ? (
                    <Image source={info.image} style={styles.logoImage} resizeMode="contain" />
                ) : (
                    <View style={[styles.iconCircle, { backgroundColor: info.iconBg }]}>
                        <Ionicons name={info.icon} size={26} color={info.iconColor} />
                    </View>
                )}
            </View>

            <View style={styles.info}>
                <Text style={styles.name}>{info.name}</Text>
                <Text style={styles.description}>{info.description}</Text>
            </View>

            <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected && <View style={styles.radioDot} />}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection:   'row',
        alignItems:      'center',
        padding:         SPACING.md,
        backgroundColor: '#fff',
        borderRadius:    BORDER_RADIUS.lg,
        borderWidth:     1.5,
        borderColor:     '#E8E8E8',
        ...SHADOWS.sm,
    },
    containerSelected: {
        borderColor: COLORS.primary,
        borderWidth: 2,
    },
    logoWrap: {
        width:          60,
        height:         44,
        justifyContent: 'center',
        alignItems:     'center',
        marginRight:    SPACING.md,
    },
    logoImage: {
        width:  60,
        height: 44,
    },
    iconCircle: {
        width:          50,
        height:         50,
        borderRadius:   12,
        justifyContent: 'center',
        alignItems:     'center',
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize:     FONT_SIZES.md,
        fontWeight:   '600',
        color:        COLORS.textPrimary,
        marginBottom: 2,
    },
    description: {
        fontSize: FONT_SIZES.sm,
        color:    COLORS.textSecondary,
    },
    radio: {
        width:          22,
        height:         22,
        borderRadius:   11,
        borderWidth:    2,
        borderColor:    '#CCC',
        justifyContent: 'center',
        alignItems:     'center',
    },
    radioSelected: {
        borderColor: COLORS.primary,
    },
    radioDot: {
        width:           11,
        height:          11,
        borderRadius:    6,
        backgroundColor: COLORS.primary,
    },
});

export default PaymentMethodCard;
