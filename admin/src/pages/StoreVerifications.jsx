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

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function DocImg({ url, label }) {
    if (!url) return <div style={{ background: '#F5F5F5', borderRadius: 8, padding: '12px 8px', textAlign: 'center', color: '#ccc', fontSize: 11 }}>—</div>;
    const full = url.startsWith('http') ? url : `${API_BASE.replace('/api', '')}${url}`;
    return (
        <div>
            <div style={{ fontSize: 10, color: '#888', marginBottom: 4, fontWeight: 600 }}>{label}</div>
            <a href={full} target="_blank" rel="noreferrer">
                <img src={full} alt={label} style={{ width: '100%', borderRadius: 8, maxHeight: 100, objectFit: 'cover', cursor: 'pointer' }} />
            </a>
        </div>
    );
}

export default function StoreVerifications() {
    const [verifications, setVerifications] = useState([]);
    const [stats, setStats]                 = useState([]);
    const [total, setTotal]                 = useState(0);
    const [loading, setLoading]             = useState(true);
    const [statusFilter, setStatusFilter]   = useState('');
    const [page, setPage]                   = useState(1);
    const [selected, setSelected]           = useState(null);
    const [adminNotes, setAdminNotes]       = useState('');
    const [rejReason, setRejReason]         = useState('');
    const [saving, setSaving]               = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, limit: 30, merchant_type: 'store_owner' };
            if (statusFilter) params.status = statusFilter;
            const res = await api.get('/admin/verifications/merchants', { params });
            setVerifications(res.data.verifications);
            setTotal(res.data.total);
            setStats(res.data.stats || []);
        } finally { setLoading(false); }
    }, [page, statusFilter]);

    useEffect(() => { load(); }, [load]);

    const openDetail = (v) => {
        setSelected(v);
        setAdminNotes(v.admin_notes || '');
        setRejReason(v.rejection_reason || '');
    };

    const saveAction = async (statusOverride) => {
        if (!statusOverride && !adminNotes) return;
        setSaving(true);
        try {
            await api.put(`/admin/verifications/merchants/${selected.id}`, {
                ...(statusOverride && { status: statusOverride }),
                admin_notes:      adminNotes,
                rejection_reason: rejReason,
            });
            setSelected(null);
            load();
        } catch (e) {
            alert(e.response?.data?.error || 'Erreur');
        } finally { setSaving(false); }
    };

    const pages = Math.ceil(total / 30);

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Vérifications Boutiques en ligne</h1>
                    <p className="page-subtitle">KYC · Propriétaires de boutiques souhaitant vendre sur Ombia Express</p>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10, marginBottom: 20 }}>
                {stats.map(s => {
                    const m = STATUS_META[s.status] || STATUS_META.draft;
                    return (
                        <div key={s.status}
                             style={{ background: m.bg, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', border: statusFilter === s.status ? `2px solid ${m.color}` : '2px solid transparent' }}
                             onClick={() => setStatusFilter(statusFilter === s.status ? '' : s.status)}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: m.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{m.label}</div>
                            <div style={{ fontSize: 26, fontWeight: 900, color: m.color, marginTop: 2 }}>{s.count}</div>
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
                                    <th>Propriétaire</th>
                                    <th>Nom de la boutique</th>
                                    <th>Catégorie</th>
                                    <th>Ville</th>
                                    <th>Statut</th>
                                    <th>Soumis le</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>Chargement…</td></tr>}
                                {!loading && verifications.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>Aucune vérification de boutique</td></tr>}
                                {verifications.map(v => {
                                    const sm = STATUS_META[v.status] || STATUS_META.draft;
                                    return (
                                        <tr key={v.id} style={{ cursor: 'pointer', background: selected?.id === v.id ? '#F0F7FF' : undefined }} onClick={() => openDetail(v)}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{v.user?.name || '—'}</div>
                                                <div style={{ fontSize: 11, color: '#888' }}>{v.user?.email}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{v.business_name || '—'}</div>
                                            </td>
                                            <td style={{ fontSize: 12, color: '#555' }}>{v.business_type || '—'}</td>
                                            <td style={{ fontSize: 12, color: '#555' }}>{v.city || '—'}</td>
                                            <td>
                                                <span style={{ background: sm.bg, color: sm.color, padding: '3px 10px', borderRadius: 8, fontWeight: 700, fontSize: 12 }}>{sm.label}</span>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <div>
                                <span style={{ background: '#FFF3E0', color: '#E65100', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>🛍️ Boutique en ligne</span>
                                <div style={{ fontWeight: 700, fontSize: 15, marginTop: 4 }}>{selected.business_name || '—'}</div>
                                <div style={{ fontSize: 11, color: '#888' }}>{selected.user?.name} · {selected.user?.email}</div>
                            </div>
                            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#aaa' }}>×</button>
                        </div>

                        {/* Business info */}
                        <div style={{ background: '#FAFAFA', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Informations boutique</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 12 }}>
                                {[
                                    ['Catégorie', selected.business_type],
                                    ['RCCM', selected.rccm_number],
                                    ['NIF', selected.tax_id],
                                    ['Adresse', selected.address],
                                    ['Ville', selected.city],
                                    ['Téléphone', selected.phone],
                                    ['Email', selected.email],
                                    ['Site web', selected.website],
                                ].map(([l, val]) => val ? (
                                    <div key={l}>
                                        <span style={{ color: '#aaa' }}>{l}: </span>
                                        <span style={{ fontWeight: 600 }}>{val}</span>
                                    </div>
                                ) : null)}
                            </div>
                        </div>

                        {/* Bank info */}
                        {selected.bank_info && Object.values(selected.bank_info).some(Boolean) && (
                            <div style={{ background: '#FFF8E1', borderRadius: 10, padding: '12px 14px', marginBottom: 14, border: '1px solid #FFE082' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#F57F17', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Compte bancaire</div>
                                <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {[
                                        ['Banque', selected.bank_info.bank_name],
                                        ['Titulaire', selected.bank_info.account_holder],
                                        ['Compte', selected.bank_info.account_number],
                                    ].map(([l, val]) => val ? (
                                        <div key={l}>
                                            <span style={{ color: '#aaa' }}>{l}: </span>
                                            <span style={{ fontWeight: 600 }}>{val}</span>
                                        </div>
                                    ) : null)}
                                </div>
                            </div>
                        )}

                        {/* Documents */}
                        {selected.docs && Object.values(selected.docs).some(Boolean) && (
                            <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Documents fournis</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    <DocImg url={selected.docs.rccm_doc}         label="RCCM" />
                                    <DocImg url={selected.docs.id_card}          label="Pièce d'identité" />
                                    <DocImg url={selected.docs.tax_cert}         label="Attestation fiscale" />
                                    <DocImg url={selected.docs.storefront_photo} label="Façade / devanture" />
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        {NEXT_ACTIONS[selected.status] && (
                            <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>Action</div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {NEXT_ACTIONS[selected.status].map(a => (
                                        <button key={a.status}
                                            style={{ padding: '8px 14px', borderRadius: 8, border: `1.5px solid ${a.status === 'rejected' ? '#FFCDD2' : '#C8E6C9'}`, background: a.status === 'rejected' ? '#FFEBEE' : '#E8F5E9', color: a.status === 'rejected' ? '#C62828' : '#2E7D32', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                                            onClick={() => saveAction(a.status)}
                                            disabled={saving}
                                        >
                                            {saving ? '…' : a.label}
                                        </button>
                                    ))}
                                </div>
                                {selected.status === 'approved' && (
                                    <div style={{ marginTop: 8, fontSize: 12, color: '#2E7D32', background: '#E8F5E9', padding: '6px 10px', borderRadius: 8 }}>
                                        ✓ Compte boutique activé — l'utilisateur peut maintenant vendre sur Ombia Express
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Notes */}
                        <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>Note pour le propriétaire</div>
                            <textarea className="form-input" rows={3} style={{ width: '100%', fontSize: 12, resize: 'vertical' }} placeholder="Commentaire, demande de correction…" value={adminNotes} onChange={e => setAdminNotes(e.target.value)} />
                        </div>
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#C62828', marginBottom: 4 }}>Motif de refus (si applicable)</div>
                            <textarea className="form-input" rows={2} style={{ width: '100%', fontSize: 12, resize: 'vertical', borderColor: '#FFCDD2' }} placeholder="Documents manquants, activité non conforme…" value={rejReason} onChange={e => setRejReason(e.target.value)} />
                        </div>
                        <button className="btn-primary" style={{ width: '100%', fontSize: 13 }} onClick={() => saveAction()} disabled={saving || !adminNotes}>
                            {saving ? '…' : '💾 Sauvegarder les notes'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
