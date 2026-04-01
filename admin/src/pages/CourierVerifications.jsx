import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import './Rides.css';

const STATUS_META = {
    submitted:    { label: 'Soumis',          color: '#0288D1', bg: '#E1F3FB' },
    under_review: { label: 'En vérification', color: '#F57F17', bg: '#FFF8E1' },
    approved:     { label: 'Approuvé',        color: '#2E7D32', bg: '#E8F5E9' },
    rejected:     { label: 'Refusé',          color: '#C62828', bg: '#FFEBEE' },
    draft:        { label: 'Brouillon',       color: '#888',    bg: '#F5F5F5' },
};

const NEXT_ACTIONS = {
    submitted:    [{ status: 'under_review', label: '🔍 Mettre en vérification' }],
    under_review: [{ status: 'approved', label: '✅ Approuver' }, { status: 'rejected', label: '❌ Refuser' }],
};

const TRANSPORT_LABELS = {
    scooter: 'Scooter / Moto',
    velo:    'Vélo',
    voiture: 'Voiture',
    a_pied:  'À pied',
};

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function DocImg({ url, label }) {
    if (!url) return (
        <div style={{ background: '#F5F5F5', borderRadius: 8, padding: '12px 8px', textAlign: 'center', color: '#ccc', fontSize: 11 }}>—</div>
    );
    const full = url.startsWith('http') ? url : `${API_BASE.replace('/api', '')}${url}`;
    return (
        <div>
            <div style={{ fontSize: 10, color: '#888', marginBottom: 4, fontWeight: 600 }}>{label}</div>
            <a href={full} target="_blank" rel="noreferrer">
                <img src={full} alt={label} style={{ width: '100%', borderRadius: 8, maxHeight: 120, objectFit: 'cover', cursor: 'pointer' }} />
            </a>
        </div>
    );
}

export default function CourierVerifications() {
    const [verifications, setVerifications] = useState([]);
    const [stats,         setStats]         = useState({});
    const [total,         setTotal]         = useState(0);
    const [loading,       setLoading]       = useState(true);
    const [statusFilter,  setStatusFilter]  = useState('');
    const [page,          setPage]          = useState(1);
    const [selected,      setSelected]      = useState(null);
    const [adminNotes,    setAdminNotes]    = useState('');
    const [rejReason,     setRejReason]     = useState('');
    const [saving,        setSaving]        = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, limit: 30 };
            if (statusFilter) params.status = statusFilter;
            const res = await api.get('/admin/verifications/couriers', { params });
            setVerifications(res.data.verifications || []);
            setTotal(res.data.total || 0);
            setStats(res.data.stats || {});
        } catch (_) {}
        finally { setLoading(false); }
    }, [page, statusFilter]);

    useEffect(() => { load(); }, [load]);

    const openDetail = (v) => {
        setSelected(v);
        setAdminNotes(v.admin_notes || '');
        setRejReason(v.rejection_reason || '');
    };

    const saveAction = async (statusOverride) => {
        setSaving(true);
        try {
            await api.put(`/admin/verifications/couriers/${selected.id}`, {
                ...(statusOverride && { status: statusOverride }),
                admin_notes:      adminNotes,
                rejection_reason: rejReason,
            });
            setSelected(null);
            load();
        } catch (e) {
            alert(e.response?.data?.error || 'Erreur serveur');
        } finally { setSaving(false); }
    };

    const pages = Math.ceil(total / 30);

    const STAT_KEYS = ['submitted', 'under_review', 'approved', 'rejected'];

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Vérifications Coursiers</h1>
                    <p className="page-subtitle">KYC · Coursiers Livraison Express Ombia</p>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10, marginBottom: 20 }}>
                {STAT_KEYS.map(key => {
                    const m = STATUS_META[key];
                    const count = stats[key] || 0;
                    return (
                        <div key={key}
                             style={{ background: m.bg, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', border: statusFilter === key ? `2px solid ${m.color}` : '2px solid transparent' }}
                             onClick={() => setStatusFilter(statusFilter === key ? '' : key)}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: m.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{m.label}</div>
                            <div style={{ fontSize: 26, fontWeight: 900, color: m.color, marginTop: 2 }}>{count}</div>
                        </div>
                    );
                })}
                {statusFilter && (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button className="btn-secondary" style={{ fontSize: 11 }} onClick={() => setStatusFilter('')}>✕ Réinitialiser</button>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
                {/* Table */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Coursier</th>
                                    <th>Transport</th>
                                    <th>Ville</th>
                                    <th>Statut</th>
                                    <th>Documents</th>
                                    <th>Soumis le</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>Chargement…</td></tr>}
                                {!loading && verifications.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>Aucune vérification</td></tr>}
                                {verifications.map(v => {
                                    const sm = STATUS_META[v.status] || STATUS_META.draft;
                                    const docs = v.docs || {};
                                    const docCount = [docs.id_front, docs.id_back, docs.selfie].filter(Boolean).length;
                                    return (
                                        <tr key={v.id} style={{ cursor: 'pointer', background: selected?.id === v.id ? '#EFEBE9' : undefined }} onClick={() => openDetail(v)}>
                                            <td>
                                                <div style={{ fontWeight: 700 }}>{v.full_name || v.user?.name || '—'}</div>
                                                <div style={{ fontSize: 11, color: '#888' }}>{v.user?.email}</div>
                                                <div style={{ fontSize: 11, color: '#5D4037' }}>{v.phone}</div>
                                            </td>
                                            <td>
                                                <span style={{ background: '#EFEBE9', color: '#5D4037', padding: '3px 10px', borderRadius: 8, fontWeight: 700, fontSize: 12 }}>
                                                    {TRANSPORT_LABELS[v.transport_type] || v.transport_type || '—'}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: 12, color: '#555' }}>{v.city || '—'}</td>
                                            <td>
                                                <span style={{ background: sm.bg, color: sm.color, padding: '3px 10px', borderRadius: 8, fontWeight: 700, fontSize: 12 }}>{sm.label}</span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                                    {['id_front', 'id_back', 'selfie'].map(k => (
                                                        <span key={k} title={k} style={{ fontSize: 14 }}>{docs[k] ? '✅' : '⬜'}</span>
                                                    ))}
                                                    <span style={{ fontSize: 11, color: '#888', marginLeft: 4 }}>{docCount}/3</span>
                                                </div>
                                            </td>
                                            <td style={{ fontSize: 12, color: '#888' }}>
                                                {new Date(v.created_at).toLocaleDateString('fr-FR')}
                                            </td>
                                            <td>
                                                <button className="btn-secondary" style={{ fontSize: 12 }}>Examiner</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {pages > 1 && (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12 }}>
                            <button className="btn-secondary" style={{ fontSize: 12 }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Préc.</button>
                            <span style={{ padding: '6px 12px', fontSize: 12, color: '#555' }}>Page {page} / {pages}</span>
                            <button className="btn-secondary" style={{ fontSize: 12 }} disabled={page === pages} onClick={() => setPage(p => p + 1)}>Suiv. →</button>
                        </div>
                    )}
                </div>

                {/* Detail panel */}
                {selected && (
                    <div style={{ width: 380, flexShrink: 0, background: '#fff', borderRadius: 14, border: '1.5px solid #E8EAF0', padding: '18px 20px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: 16, color: '#1C2E4A' }}>{selected.full_name || selected.user?.name || '—'}</div>
                                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{selected.user?.email}</div>
                                <div style={{ fontSize: 11, color: '#5D4037', fontWeight: 600, marginTop: 2 }}>{selected.phone} · {selected.city}</div>
                            </div>
                            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#aaa' }}>×</button>
                        </div>

                        {/* Identity */}
                        <div style={{ background: '#EFEBE9', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#5D4037', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Identité coursier</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 12 }}>
                                {[
                                    ['Nom', selected.full_name],
                                    ['CNI', selected.national_id_number],
                                    ['Téléphone', selected.phone],
                                    ['Date naissance', selected.date_of_birth],
                                    ['Adresse', selected.address],
                                    ['Ville', selected.city],
                                    ['Transport', TRANSPORT_LABELS[selected.transport_type] || selected.transport_type],
                                ].map(([l, val]) => val ? (
                                    <div key={l}>
                                        <span style={{ color: '#aaa' }}>{l}: </span>
                                        <span style={{ fontWeight: 600 }}>{val}</span>
                                    </div>
                                ) : null)}
                            </div>
                        </div>

                        {/* Documents */}
                        {selected.docs && Object.values(selected.docs).some(Boolean) && (
                            <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Documents</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                                    <DocImg url={selected.docs.id_front} label="CNI Recto" />
                                    <DocImg url={selected.docs.id_back}  label="CNI Verso" />
                                    <DocImg url={selected.docs.selfie}   label="Selfie + CNI" />
                                </div>
                            </div>
                        )}

                        {/* Current status */}
                        <div style={{ background: STATUS_META[selected.status]?.bg || '#F5F5F5', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: STATUS_META[selected.status]?.color || '#888' }}>
                                Statut actuel : {STATUS_META[selected.status]?.label || selected.status}
                            </span>
                        </div>

                        {/* Actions */}
                        {NEXT_ACTIONS[selected.status] && (
                            <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>Action</div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {NEXT_ACTIONS[selected.status].map(a => (
                                        <button key={a.status}
                                            style={{
                                                padding: '8px 14px', borderRadius: 8,
                                                border: `1.5px solid ${a.status === 'rejected' ? '#FFCDD2' : a.status === 'approved' ? '#C8E6C9' : '#BBDEFB'}`,
                                                background: a.status === 'rejected' ? '#FFEBEE' : a.status === 'approved' ? '#E8F5E9' : '#E3F2FD',
                                                color: a.status === 'rejected' ? '#C62828' : a.status === 'approved' ? '#2E7D32' : '#1565C0',
                                                fontWeight: 700, fontSize: 13, cursor: 'pointer',
                                            }}
                                            onClick={() => saveAction(a.status)}
                                            disabled={saving}
                                        >
                                            {saving ? '…' : a.label}
                                        </button>
                                    ))}
                                </div>
                                {selected.status === 'approved' && (
                                    <div style={{ marginTop: 8, fontSize: 12, color: '#2E7D32', background: '#E8F5E9', padding: '6px 10px', borderRadius: 8 }}>
                                        ✓ Compte coursier activé — peut recevoir des livraisons
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Admin notes */}
                        <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>Note pour le coursier</div>
                            <textarea className="form-input" rows={3} style={{ width: '100%', fontSize: 12, resize: 'vertical' }}
                                placeholder="Commentaire, demande de correction…"
                                value={adminNotes} onChange={e => setAdminNotes(e.target.value)} />
                        </div>
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#C62828', marginBottom: 4 }}>Motif de refus (si applicable)</div>
                            <textarea className="form-input" rows={2} style={{ width: '100%', fontSize: 12, resize: 'vertical', borderColor: '#FFCDD2' }}
                                placeholder="Documents manquants, photo floue…"
                                value={rejReason} onChange={e => setRejReason(e.target.value)} />
                        </div>
                        <button className="btn-primary" style={{ width: '100%', fontSize: 13 }}
                            onClick={() => saveAction()}
                            disabled={saving || !adminNotes}>
                            {saving ? '…' : '💾 Sauvegarder les notes'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
