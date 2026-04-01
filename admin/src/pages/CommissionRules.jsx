import { useState, useEffect } from 'react';
import api from '../api';
import './Rides.css';

const SERVICES = [
    {
        key: 'ride',
        label: 'Courses',
        icon: '🚗',
        color: '#FF6B35',
        bg: '#FFF0EB',
        border: '#FFCCB3',
        who_pays: 'Passager → Plateforme prend sa part → Reste versé au chauffeur',
        example_amount: 3000,
        example_label: 'trajet 3 000 XAF',
    },
    {
        key: 'rental',
        label: 'Locations',
        icon: '🔑',
        color: '#0288D1',
        bg: '#E1F3FB',
        border: '#B3DFF5',
        who_pays: 'Locataire → Plateforme prend sa part → Reste versé au propriétaire',
        example_amount: 15000,
        example_label: 'location 15 000 XAF',
    },
    {
        key: 'partner',
        label: 'Paiements partenaires',
        icon: '🏪',
        color: '#00897B',
        bg: '#D4F5F2',
        border: '#80D8D1',
        who_pays: 'Client → Paiement marchand → Plateforme prend sa part au marchand',
        example_amount: 5000,
        example_label: 'achat 5 000 XAF',
    },
    {
        key: 'ecommerce',
        label: 'E-commerce',
        icon: '🛍️',
        color: '#7B1FA2',
        bg: '#F3E5F5',
        border: '#CE93D8',
        who_pays: 'Acheteur → Commande en ligne → Plateforme prend sa part au vendeur',
        example_amount: 8000,
        example_label: 'commande 8 000 XAF',
    },
    {
        key: 'transfer',
        label: 'Transferts',
        icon: '💸',
        color: '#1565C0',
        bg: '#DCEEFF',
        border: '#90C3F5',
        who_pays: 'Expéditeur → Transfert inter-membres → Frais prélevés sur le montant',
        example_amount: 10000,
        example_label: 'envoi 10 000 XAF',
    },
];

export default function CommissionRules() {
    const [rules, setRules]       = useState({});   // keyed by service_type
    const [loading, setLoading]   = useState(true);
    const [editing, setEditing]   = useState({});   // { service_type: rate_string }
    const [saving, setSaving]     = useState({});
    const [msg, setMsg]           = useState({});

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            const res = await api.get('/admin/commission-rules');
            const map = {};
            (res.data.rules || []).forEach(r => {
                if (r.is_default) map[r.service_type] = r;
            });
            setRules(map);
        } finally { setLoading(false); }
    };

    const startEdit = (key, rate) => setEditing(prev => ({ ...prev, [key]: String(rate) }));
    const cancelEdit = (key) => setEditing(prev => { const n = { ...prev }; delete n[key]; return n; });

    const save = async (svc) => {
        const rate = parseFloat(editing[svc.key]);
        if (isNaN(rate) || rate < 0 || rate > 100) {
            setMsg(prev => ({ ...prev, [svc.key]: 'Taux invalide (0–100)' }));
            return;
        }
        setSaving(prev => ({ ...prev, [svc.key]: true }));
        try {
            const rule = rules[svc.key];
            if (rule) {
                await api.put('/admin/commission-rules/' + rule.id, { ...rule, rate });
            } else {
                await api.post('/admin/commission-rules', {
                    service_type: svc.key,
                    name: svc.label + ' standard',
                    rate,
                    is_default: true,
                    enabled: true,
                    sort_order: 0,
                });
            }
            setMsg(prev => ({ ...prev, [svc.key]: 'Sauvegardé ✓' }));
            setTimeout(() => setMsg(prev => ({ ...prev, [svc.key]: '' })), 2500);
            cancelEdit(svc.key);
            load();
        } catch (e) {
            setMsg(prev => ({ ...prev, [svc.key]: e.response?.data?.error || 'Erreur' }));
        }
        setSaving(prev => ({ ...prev, [svc.key]: false }));
    };

    if (loading) return <div className="page-loading">Chargement…</div>;

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Commissions par service</h1>
                    <p className="page-subtitle">Part prélevée par la plateforme sur chaque transaction — versée automatiquement à la fin du service</p>
                </div>
            </div>

            {/* How it works banner */}
            <div style={{ background: '#F0F7FF', border: '1.5px solid #BBDEFB', borderRadius: 14, padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#1565C0', marginBottom: 6 }}>💡 Comment ça marche</div>
                    <div style={{ fontSize: 12, color: '#333', lineHeight: 1.6 }}>
                        Quand un service est complété, la plateforme retient automatiquement le pourcentage défini ci-dessous sur le montant total.<br />
                        Le reste est versé au prestataire (chauffeur, propriétaire, marchand).
                    </div>
                </div>
                <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#1565C0', marginBottom: 6 }}>📐 Exemple — Course 3 000 XAF à 20%</div>
                    <div style={{ background: '#fff', borderRadius: 10, padding: '10px 14px', border: '1px solid #BBDEFB', fontSize: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ color: '#555' }}>Montant total</span>
                            <span style={{ fontWeight: 700 }}>3 000 XAF</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ color: '#FF6B35' }}>Commission plateforme (20%)</span>
                            <span style={{ fontWeight: 700, color: '#FF6B35' }}>− 600 XAF</span>
                        </div>
                        <div style={{ height: 1, background: '#E8EAF0', margin: '6px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#2E7D32', fontWeight: 600 }}>Versé au chauffeur</span>
                            <span style={{ fontWeight: 800, color: '#2E7D32' }}>2 400 XAF</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Service cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {SERVICES.map(svc => {
                    const rule = rules[svc.key];
                    const rate = rule ? parseFloat(rule.rate) : null;
                    const isEditing = editing[svc.key] !== undefined;
                    const currentRate = isEditing ? parseFloat(editing[svc.key]) || 0 : (rate ?? 0);
                    const platform = Math.round(svc.example_amount * currentRate / 100);
                    const provider = svc.example_amount - platform;

                    return (
                        <div key={svc.key} style={{
                            background: '#fff',
                            borderRadius: 14,
                            border: `1.5px solid ${isEditing ? svc.color : svc.border}`,
                            padding: '18px 22px',
                            transition: 'border-color 0.2s',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                                {/* Left: identity */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <div style={{ background: svc.bg, borderRadius: 12, width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                                        {svc.icon}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 15, color: svc.color }}>{svc.label}</div>
                                        <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{svc.who_pays}</div>
                                    </div>
                                </div>

                                {/* Right: rate display / edit */}
                                {isEditing ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <input
                                            className="form-input"
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.5"
                                            style={{ width: 90, textAlign: 'center', fontSize: 18, fontWeight: 700 }}
                                            value={editing[svc.key]}
                                            onChange={e => setEditing(prev => ({ ...prev, [svc.key]: e.target.value }))}
                                            autoFocus
                                        />
                                        <span style={{ fontSize: 15, color: '#555', fontWeight: 600 }}>%</span>
                                        <button className="btn-primary" style={{ fontSize: 13 }} onClick={() => save(svc)} disabled={saving[svc.key]}>
                                            {saving[svc.key] ? '…' : 'Enregistrer'}
                                        </button>
                                        <button className="btn-secondary" style={{ fontSize: 13 }} onClick={() => cancelEdit(svc.key)}>Annuler</button>
                                        {msg[svc.key] && <span style={{ fontSize: 12, color: msg[svc.key].includes('✓') ? '#2E7D32' : '#C62828', fontWeight: 600 }}>{msg[svc.key]}</span>}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                        {msg[svc.key] && <span style={{ fontSize: 12, color: '#2E7D32', fontWeight: 600 }}>{msg[svc.key]}</span>}
                                        {rate !== null ? (
                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{ fontSize: 38, fontWeight: 900, color: svc.color, lineHeight: 1 }}>{rate}</span>
                                                <span style={{ fontSize: 16, fontWeight: 600, color: svc.color }}>%</span>
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: 14, color: '#aaa' }}>Non configuré</span>
                                        )}
                                        <button className="btn-secondary" style={{ fontSize: 13 }} onClick={() => startEdit(svc.key, rate ?? 20)}>
                                            ✏️ Modifier
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Live breakdown preview */}
                            <div style={{ marginTop: 14, display: 'flex', gap: 12, alignItems: 'center', background: svc.bg, borderRadius: 10, padding: '10px 14px' }}>
                                <div style={{ fontSize: 11, color: '#666', flexShrink: 0 }}>Exemple — {svc.example_label} :</div>
                                <div style={{ display: 'flex', gap: 16, flex: 1, flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{ width: 10, height: 10, borderRadius: 3, background: svc.color }} />
                                        <span style={{ fontSize: 12, color: '#555' }}>Plateforme</span>
                                        <span style={{ fontSize: 14, fontWeight: 800, color: svc.color }}>{platform.toLocaleString('fr-FR')} XAF</span>
                                    </div>
                                    <div style={{ fontSize: 12, color: '#aaa' }}>+</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{ width: 10, height: 10, borderRadius: 3, background: '#2E7D32' }} />
                                        <span style={{ fontSize: 12, color: '#555' }}>Prestataire</span>
                                        <span style={{ fontSize: 14, fontWeight: 800, color: '#2E7D32' }}>{provider.toLocaleString('fr-FR')} XAF</span>
                                    </div>
                                </div>
                                {/* Visual bar */}
                                <div style={{ width: 120, height: 8, borderRadius: 4, background: '#ddd', overflow: 'hidden', flexShrink: 0 }}>
                                    <div style={{ height: '100%', width: `${currentRate}%`, background: svc.color, borderRadius: 4, transition: 'width 0.3s' }} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
