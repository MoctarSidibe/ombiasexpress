import { useState, useEffect } from 'react';
import api from '../api';
import './Rides.css';

const SERVICE_LABELS = {
    ride:      { label: 'Courses',      color: '#FF6B35', bg: '#FFF0EB', icon: '🚗', exampleAmount: 3000 },
    rental:    { label: 'Locations',    color: '#0288D1', bg: '#E1F3FB', icon: '🔑', exampleAmount: 15000 },
    partner:   { label: 'Partenaires',  color: '#00897B', bg: '#D4F5F2', icon: '🏪', exampleAmount: 5000 },
    ecommerce: { label: 'E-commerce',   color: '#7B1FA2', bg: '#F3E5F5', icon: '🛍️', exampleAmount: 8000 },
    transfer:  { label: 'Transferts',   color: '#1565C0', bg: '#DCEEFF', icon: '💸', exampleAmount: 10000 },
};

export default function CashbackSettings() {
    const [rules, setRules]               = useState([]);
    const [stats, setStats]               = useState(null);
    const [redemptionRate, setRedemRate]  = useState(100);
    const [loading, setLoading]           = useState(true);
    const [saving, setSaving]             = useState({});
    const [editing, setEditing]           = useState({});
    const [redeemEdit, setRedeemEdit]     = useState(false);
    const [newRedemRate, setNewRedemRate] = useState('');
    const [msg, setMsg]                   = useState({});
    const [showHow, setShowHow]           = useState(false);

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            const [rulesRes, statsRes] = await Promise.all([
                api.get('/admin/cashback-rules'),
                api.get('/admin/cashback-stats'),
            ]);
            setRules(rulesRes.data.rules);
            setRedemRate(rulesRes.data.redemption_rate);
            setStats(statsRes.data);
        } finally { setLoading(false); }
    };

    const startEdit = (id, r) => setEditing(prev => ({ ...prev, [id]: { ...r } }));
    const cancelEdit = (id) => setEditing(prev => { const n = { ...prev }; delete n[id]; return n; });

    const saveRule = async (id) => {
        setSaving(prev => ({ ...prev, [id]: true }));
        try {
            await api.put('/admin/cashback-rules/' + id, editing[id]);
            setMsg(prev => ({ ...prev, [id]: 'Sauvegardé ✓' }));
            setTimeout(() => setMsg(prev => ({ ...prev, [id]: '' })), 2000);
            cancelEdit(id); load();
        } catch (e) { setMsg(prev => ({ ...prev, [id]: e.response?.data?.error || 'Erreur' })); }
        setSaving(prev => ({ ...prev, [id]: false }));
    };

    const saveRedemRate = async () => {
        if (!newRedemRate || newRedemRate < 1) return;
        try {
            await api.put('/admin/cashback-settings', { redemption_rate: parseFloat(newRedemRate) });
            setRedemRate(parseFloat(newRedemRate));
            setRedeemEdit(false);
        } catch (e) { alert(e.response?.data?.error || 'Erreur'); }
    };

    if (loading) return <div className="page-loading">Chargement…</div>;

    const xafPerPoint = (1 / redemptionRate).toFixed(4);

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Cashback & Points fidélité</h1>
                    <p className="page-subtitle">Programme de fidélité — les clients gagnent des points à chaque paiement et les échangent contre des réductions</p>
                </div>
                <button className="btn-secondary" onClick={() => setShowHow(h => !h)} style={{ fontSize: 13 }}>
                    {showHow ? '▲ Masquer' : '💡 Comment ça marche ?'}
                </button>
            </div>

            {/* How it works panel */}
            {showHow && (
                <div style={{ background: '#F3F9F0', border: '1.5px solid #C8E6C9', borderRadius: 14, padding: 20, marginBottom: 20 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#2E7D32', marginBottom: 14 }}>💡 Cycle de vie d'un point fidélité</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>1. Gain de points après paiement</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {['ride', 'rental', 'partner'].map(s => {
                                    const rule = rules.find(r => r.service_type === s);
                                    const meta = SERVICE_LABELS[s];
                                    const pts = rule ? Math.round(meta.exampleAmount * rule.earn_rate / 100) : '?';
                                    return (
                                        <div key={s} style={{ background: '#fff', borderRadius: 8, padding: '8px 12px', border: `1px solid ${meta.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: 12 }}>{meta.icon} {meta.exampleAmount.toLocaleString('fr-FR')} XAF {meta.label.toLowerCase()}</span>
                                            <span style={{ fontWeight: 700, color: meta.color, fontSize: 13 }}>+{pts} pts</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>2. Échange de points → réduction</div>
                            <div style={{ background: '#fff', borderRadius: 10, padding: 14, border: '1px solid #C8E6C9', fontSize: 12 }}>
                                <div style={{ fontWeight: 700, color: '#2E7D32', marginBottom: 8 }}>Taux actuel : {redemptionRate} pts = 1 XAF</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {[500, 1500, 5000].map(pts => (
                                        <div key={pts} style={{ display: 'flex', justifyContent: 'space-between', color: '#555' }}>
                                            <span>{pts.toLocaleString('fr-FR')} points</span>
                                            <span style={{ fontWeight: 700, color: '#2E7D32' }}>= {(pts / redemptionRate).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} XAF</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div style={{ fontSize: 11, color: '#666', marginTop: 8 }}>
                                Les points expirent après la durée configurée. Les utilisateurs peuvent utiliser leurs points directement dans l'app pour réduire le prix de leur prochain service.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats bar */}
            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
                    {[
                        { label: 'Points distribués', value: stats.total_earned.toLocaleString('fr-FR'), sub: 'depuis le début', color: '#1565C0', bg: '#EEF4FF' },
                        { label: 'Points échangés',   value: stats.total_redeemed.toLocaleString('fr-FR'), sub: `= ${(stats.total_redeemed / redemptionRate).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} XAF remboursés`, color: '#00897B', bg: '#E8FAF6' },
                        { label: 'Points en cours',   value: stats.outstanding.toLocaleString('fr-FR'), sub: `= ${(stats.outstanding / redemptionRate).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} XAF potentiels`, color: '#E65100', bg: '#FFF3E0' },
                        { label: 'Utilisateurs actifs', value: stats.active_users.toLocaleString('fr-FR'), sub: 'avec des points', color: '#7B1FA2', bg: '#F3E5F5' },
                    ].map(s => (
                        <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '14px 18px' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{s.label}</div>
                            <div style={{ fontSize: 26, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
                            <div style={{ fontSize: 10, color: s.color, opacity: 0.7, marginTop: 4 }}>{s.sub}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Redemption rate */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #E8EAF0', padding: 20, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>Taux d'échange des points</div>
                        <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                            Combien de points valent 1 XAF quand un client échange ses points en réduction
                        </div>
                    </div>
                    {!redeemEdit && (
                        <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => { setRedeemEdit(true); setNewRedemRate(String(redemptionRate)); }}>Modifier</button>
                    )}
                </div>
                {redeemEdit ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                        <input className="form-input" type="number" min="1" style={{ width: 120 }} value={newRedemRate} onChange={e => setNewRedemRate(e.target.value)} />
                        <span style={{ color: '#555', fontSize: 13 }}>pts = 1 XAF</span>
                        <button className="btn-primary" style={{ fontSize: 12 }} onClick={saveRedemRate}>Sauvegarder</button>
                        <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => setRedeemEdit(false)}>Annuler</button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 8, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                            <span style={{ fontSize: 36, fontWeight: 900, color: '#1565C0' }}>{redemptionRate}</span>
                            <span style={{ fontSize: 15, color: '#555' }}>pts = 1 XAF</span>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            {[1000, 5000, 10000].map(pts => (
                                <div key={pts} style={{ background: '#EEF4FF', borderRadius: 8, padding: '6px 12px', textAlign: 'center' }}>
                                    <div style={{ fontSize: 11, color: '#1565C0', fontWeight: 700 }}>{pts.toLocaleString('fr-FR')} pts</div>
                                    <div style={{ fontSize: 13, fontWeight: 800, color: '#1565C0' }}>= {(pts / redemptionRate).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} XAF</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ fontSize: 11, color: '#888' }}>({xafPerPoint} XAF par point)</div>
                    </div>
                )}
            </div>

            {/* Cashback rules per service */}
            <div style={{ fontWeight: 700, fontSize: 14, color: '#333', marginBottom: 12 }}>Taux de gain par service</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {rules.map(r => {
                    const meta = SERVICE_LABELS[r.service_type] || { label: r.service_type, color: '#555', bg: '#F5F5F5', icon: '📦', exampleAmount: 1000 };
                    const isEditing = !!editing[r.id];
                    const ed = editing[r.id] || r;
                    const earnedPts = Math.round(meta.exampleAmount * parseFloat(ed.earn_rate || 0) / 100);
                    const earnedXAF = (earnedPts / redemptionRate).toFixed(2);

                    return (
                        <div key={r.id} style={{ background: '#fff', borderRadius: 14, border: `1.5px solid ${isEditing ? meta.color : '#E8EAF0'}`, padding: '16px 20px', transition: 'border-color 0.2s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ background: meta.bg, color: meta.color, borderRadius: 10, padding: '8px 12px', fontSize: 22 }}>{meta.icon}</div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 14, color: meta.color }}>{meta.label}</div>
                                        <div style={{ fontSize: 11, color: '#888' }}>{r.description || 'Points gagnés à chaque paiement'}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ background: r.enabled ? '#E8F5E9' : '#FFF3E0', color: r.enabled ? '#2E7D32' : '#E65100', padding: '3px 10px', borderRadius: 8, fontWeight: 700, fontSize: 12 }}>
                                        {r.enabled ? 'Actif' : 'Inactif'}
                                    </span>
                                    {!isEditing && (
                                        <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => startEdit(r.id, r)}>Modifier</button>
                                    )}
                                </div>
                            </div>

                            {isEditing ? (
                                <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, alignItems: 'end' }}>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: '#555' }}>Taux de gain (pts / 100 XAF)</span>
                                        <input className="form-input" type="number" min="0" step="0.5" value={ed.earn_rate} onChange={e => setEditing(prev => ({ ...prev, [r.id]: { ...prev[r.id], earn_rate: e.target.value } }))} />
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: '#555' }}>Montant min (XAF)</span>
                                        <input className="form-input" type="number" min="0" value={ed.min_amount || ''} onChange={e => setEditing(prev => ({ ...prev, [r.id]: { ...prev[r.id], min_amount: e.target.value } }))} />
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: '#555' }}>Expiration (jours, 0 = jamais)</span>
                                        <input className="form-input" type="number" min="0" value={ed.expiry_days} onChange={e => setEditing(prev => ({ ...prev, [r.id]: { ...prev[r.id], expiry_days: e.target.value } }))} />
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: '#555' }}>Actif</span>
                                        <select className="form-input" value={ed.enabled ? '1' : '0'} onChange={e => setEditing(prev => ({ ...prev, [r.id]: { ...prev[r.id], enabled: e.target.value === '1' } }))}>
                                            <option value="1">Oui</option>
                                            <option value="0">Non</option>
                                        </select>
                                    </label>
                                    <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <button className="btn-primary" style={{ fontSize: 12 }} onClick={() => saveRule(r.id)} disabled={saving[r.id]}>{saving[r.id] ? '…' : 'Sauvegarder'}</button>
                                        <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => cancelEdit(r.id)}>Annuler</button>
                                        {msg[r.id] && <span style={{ fontSize: 12, color: '#2E7D32', fontWeight: 600 }}>{msg[r.id]}</span>}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: 0, marginTop: 12, alignItems: 'stretch' }}>
                                    <div style={{ flex: 1, paddingRight: 20 }}>
                                        <div style={{ fontSize: 30, fontWeight: 900, color: meta.color, lineHeight: 1 }}>{r.earn_rate} <span style={{ fontSize: 14, fontWeight: 600 }}>pts</span></div>
                                        <div style={{ fontSize: 11, color: '#888' }}>par 100 XAF dépensé</div>
                                    </div>
                                    <div style={{ flex: 1, borderLeft: '1px solid #f0f0f0', paddingLeft: 20, paddingRight: 20 }}>
                                        <div style={{ fontSize: 30, fontWeight: 900, color: '#555', lineHeight: 1 }}>{r.expiry_days || '∞'} <span style={{ fontSize: 14, fontWeight: 600 }}>{r.expiry_days ? 'j' : ''}</span></div>
                                        <div style={{ fontSize: 11, color: '#888' }}>durée de validité</div>
                                    </div>
                                    <div style={{ flex: 1.5, borderLeft: '1px solid #f0f0f0', paddingLeft: 20, background: meta.bg, borderRadius: '0 10px 10px 0', padding: '10px 16px' }}>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: meta.color, marginBottom: 4 }}>Exemple : {meta.exampleAmount.toLocaleString('fr-FR')} XAF</div>
                                        <div style={{ fontSize: 18, fontWeight: 800, color: meta.color }}>+{earnedPts} pts <span style={{ fontSize: 12, fontWeight: 500, color: '#555' }}>≈ {earnedXAF} XAF</span></div>
                                        <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>valeur après échange ({redemptionRate} pts/XAF)</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
