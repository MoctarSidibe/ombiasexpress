import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import './Rides.css';

const STATUS_META = {
    submitted:             { label: 'Soumis',          color: '#0288D1', bg: '#E1F3FB' },
    under_review:          { label: 'En vérification', color: '#F57F17', bg: '#FFF8E1' },
    appointment_scheduled: { label: 'RDV planifié',    color: '#7B1FA2', bg: '#F3E5F5' },
    approved:              { label: 'Approuvé',        color: '#2E7D32', bg: '#E8F5E9' },
    rejected:              { label: 'Refusé',          color: '#C62828', bg: '#FFEBEE' },
    draft:                 { label: 'Brouillon',       color: '#888',    bg: '#F5F5F5' },
};

const NEXT_ACTIONS = {
    submitted:             [{ status: 'under_review',          label: '🔍 Mettre en vérification' }],
    under_review:          [{ status: 'appointment_scheduled', label: '📅 Planifier RDV' }, { status: 'approved', label: '✅ Approuver' }, { status: 'rejected', label: '❌ Refuser' }],
    appointment_scheduled: [{ status: 'approved', label: '✅ Approuver' }, { status: 'rejected', label: '❌ Refuser' }],
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

export default function DriverVerifications() {
    const [verifications, setVerifications] = useState([]);
    const [stats, setStats]                 = useState([]);
    const [total, setTotal]                 = useState(0);
    const [loading, setLoading]             = useState(true);
    const [statusFilter, setStatusFilter]   = useState('');
    const [page, setPage]                   = useState(1);
    const [selected, setSelected]           = useState(null);

    // Edit panel state
    const [newStatus, setNewStatus]     = useState('');
    const [adminNotes, setAdminNotes]   = useState('');
    const [rejReason, setRejReason]     = useState('');
    const [apptDate, setApptDate]       = useState('');
    const [apptOffice, setApptOffice]   = useState('');
    const [saving, setSaving]           = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, limit: 30 };
            if (statusFilter) params.status = statusFilter;
            const res = await api.get('/admin/verifications/drivers', { params });
            setVerifications(res.data.verifications);
            setTotal(res.data.total);
            setStats(res.data.stats || []);
        } finally { setLoading(false); }
    }, [page, statusFilter]);

    useEffect(() => { load(); }, [load]);

    const openDetail = (v) => {
        setSelected(v);
        setNewStatus('');
        setAdminNotes(v.admin_notes || '');
        setRejReason(v.rejection_reason || '');
        setApptDate(v.appointment_date ? v.appointment_date.slice(0, 10) : '');
        setApptOffice(v.office_location || '');
    };

    const saveAction = async (statusOverride) => {
        const status = statusOverride || newStatus;
        if (!status) return;
        setSaving(true);
        try {
            await api.put(`/admin/verifications/drivers/${selected.id}`, {
                status,
                admin_notes:      adminNotes,
                rejection_reason: rejReason,
                ...(status === 'appointment_scheduled' && apptDate ? { appointment_date: apptDate, office_location: apptOffice } : {}),
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
                    <h1 className="page-title">Vérifications Chauffeurs</h1>
                    <p className="page-subtitle">KYC · Documents d'identité, permis de conduire et rendez-vous en agence</p>
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                                    <th>Candidat</th>
                                    <th>Contact</th>
                                    <th>Documents</th>
                                    <th>Statut</th>
                                    <th>Soumis le</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>Chargement…</td></tr>}
                                {!loading && verifications.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>Aucune vérification{statusFilter ? ' pour ce statut' : ''}</td></tr>}
                                {verifications.map(v => {
                                    const m = STATUS_META[v.status] || STATUS_META.draft;
                                    const docCount = v.docs ? Object.values(v.docs).filter(Boolean).length : 0;
                                    return (
                                        <tr key={v.id} style={{ cursor: 'pointer', background: selected?.id === v.id ? '#F0F7FF' : undefined }} onClick={() => openDetail(v)}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{v.full_name || v.user?.name || '—'}</div>
                                                <div style={{ fontSize: 11, color: '#888' }}>{v.user?.email}</div>
                                            </td>
                                            <td style={{ fontSize: 12, color: '#555' }}>
                                                <div>{v.phone || v.user?.phone || '—'}</div>
                                                <div style={{ color: '#aaa' }}>{v.city || '—'}</div>
                                            </td>
                                            <td>
                                                <span style={{ background: docCount >= 4 ? '#E8F5E9' : '#FFF3E0', color: docCount >= 4 ? '#2E7D32' : '#E65100', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                                                    {docCount}/5 docs
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{ background: m.bg, color: m.color, padding: '3px 10px', borderRadius: 8, fontWeight: 700, fontSize: 12 }}>{m.label}</span>
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
                            <button className="btn-secondary" style={{ fontSize: 12 }} disabled={page === 1} onClick={() => setPage(p => p-1)}>← Préc.</button>
                            <span style={{ padding: '6px 12px', fontSize: 12, color: '#555' }}>Page {page} / {pages}</span>
                            <button className="btn-secondary" style={{ fontSize: 12 }} disabled={page === pages} onClick={() => setPage(p => p+1)}>Suiv. →</button>
                        </div>
                    )}
                </div>

                {/* Detail panel */}
                {selected && (
                    <div style={{ width: 360, flexShrink: 0, background: '#fff', borderRadius: 14, border: '1.5px solid #E8EAF0', padding: '18px 20px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>{selected.full_name || selected.user?.name}</div>
                                <div style={{ fontSize: 11, color: '#888' }}>{selected.user?.email}</div>
                            </div>
                            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#aaa' }}>×</button>
                        </div>

                        {/* Personal info */}
                        <div style={{ background: '#FAFAFA', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Informations</div>
                            {[
                                ['Date de naissance', selected.date_of_birth],
                                ['Téléphone', selected.phone],
                                ['Adresse', selected.address],
                                ['Ville', selected.city],
                                ['N° CNI', selected.national_id_number],
                                ['N° Permis', selected.license_number],
                            ].map(([l, v]) => v ? (
                                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                                    <span style={{ color: '#888' }}>{l}</span>
                                    <span style={{ fontWeight: 600 }}>{v}</span>
                                </div>
                            ) : null)}
                        </div>

                        {/* Documents */}
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Documents</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <DocImg url={selected.docs?.id_front}       label="CNI Recto" />
                                <DocImg url={selected.docs?.id_back}        label="CNI Verso" />
                                <DocImg url={selected.docs?.license_front}  label="Permis Recto" />
                                <DocImg url={selected.docs?.license_back}   label="Permis Verso" />
                                <DocImg url={selected.docs?.selfie}         label="Selfie" />
                            </div>
                        </div>

                        {/* Appointment */}
                        {(selected.appointment_date || selected.office_location) && (
                            <div style={{ background: '#F3E5F5', borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 12 }}>
                                <div style={{ fontWeight: 700, color: '#7B1FA2', marginBottom: 4 }}>Rendez-vous</div>
                                {selected.appointment_date && <div>{new Date(selected.appointment_date).toLocaleDateString('fr-FR')}</div>}
                                {selected.office_location  && <div>{selected.office_location}</div>}
                            </div>
                        )}

                        {/* Action section */}
                        {NEXT_ACTIONS[selected.status] && (
                            <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>Action</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {/* Appointment fields if scheduling */}
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        {NEXT_ACTIONS[selected.status].map(a => (
                                            <button key={a.status}
                                                style={{ padding: '7px 12px', borderRadius: 8, border: `1.5px solid ${a.status === 'rejected' ? '#FFCDD2' : a.status === 'approved' ? '#C8E6C9' : '#E8EAF0'}`, background: a.status === 'rejected' ? '#FFEBEE' : a.status === 'approved' ? '#E8F5E9' : '#F0F7FF', color: a.status === 'rejected' ? '#C62828' : a.status === 'approved' ? '#2E7D32' : '#1565C0', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                                                onClick={() => saveAction(a.status)}
                                                disabled={saving}
                                            >
                                                {saving ? '…' : a.label}
                                            </button>
                                        ))}
                                    </div>

                                    {NEXT_ACTIONS[selected.status].some(a => a.status === 'appointment_scheduled') && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                                            <div>
                                                <div style={{ fontSize: 10, fontWeight: 600, color: '#888', marginBottom: 4 }}>Date RDV</div>
                                                <input type="date" className="form-input" value={apptDate} onChange={e => setApptDate(e.target.value)} style={{ fontSize: 12 }} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 10, fontWeight: 600, color: '#888', marginBottom: 4 }}>Agence</div>
                                                <select className="form-input" value={apptOffice} onChange={e => setApptOffice(e.target.value)} style={{ fontSize: 12 }}>
                                                    <option value="">Choisir</option>
                                                    {['Agence Yaoundé Centre', 'Agence Douala Akwa', 'Agence Bafoussam', 'Agence Garoua'].map(o => (
                                                        <option key={o} value={o}>{o}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>Note pour le candidat</div>
                            <textarea className="form-input" rows={3} style={{ width: '100%', fontSize: 12, resize: 'vertical' }} placeholder="Instructions, informations complémentaires…" value={adminNotes} onChange={e => setAdminNotes(e.target.value)} />
                        </div>
                        {(selected.status === 'under_review' || selected.status === 'appointment_scheduled') && (
                            <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: '#C62828', marginBottom: 4 }}>Motif de refus (si applicable)</div>
                                <textarea className="form-input" rows={2} style={{ width: '100%', fontSize: 12, resize: 'vertical', borderColor: '#FFCDD2' }} placeholder="Expliquer pourquoi le dossier est refusé…" value={rejReason} onChange={e => setRejReason(e.target.value)} />
                            </div>
                        )}
                        <button className="btn-primary" style={{ width: '100%', fontSize: 13 }} onClick={() => saveAction()} disabled={saving || !adminNotes}>
                            {saving ? '…' : '💾 Sauvegarder les notes'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
