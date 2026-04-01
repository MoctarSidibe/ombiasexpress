import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import './Rides.css';

const STATUS_META = {
    active: { label: 'Active',   color: '#2E7D32', bg: '#E8F5E9' },
    sold:   { label: 'Vendue',   color: '#7B1FA2', bg: '#F3E5F5' },
    paused: { label: 'En pause', color: '#888',    bg: '#F5F5F5' },
};

const FUEL_LABEL  = { essence: 'Essence', diesel: 'Diesel', hybride: 'Hybride', electrique: 'Électrique' };
const TRANS_LABEL = { manuelle: 'Manuelle', automatique: 'Automatique' };

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function CarPhoto({ url }) {
    if (!url) return <div style={{ background: '#F5F5F5', borderRadius: 6, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 11 }}>—</div>;
    const full = url.startsWith('http') ? url : `${API_BASE.replace('/api', '')}${url}`;
    return <a href={full} target="_blank" rel="noreferrer"><img src={full} alt="Car" style={{ width: '100%', height: 56, objectFit: 'cover', borderRadius: 6, cursor: 'pointer' }} /></a>;
}

export default function CarListings() {
    const [listings,      setListings]      = useState([]);
    const [stats,         setStats]         = useState([]);
    const [total,         setTotal]         = useState(0);
    const [loading,       setLoading]       = useState(true);
    const [statusFilter,  setStatusFilter]  = useState('');
    const [page,          setPage]          = useState(1);
    const [selected,      setSelected]      = useState(null);
    const [saving,        setSaving]        = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, limit: 30 };
            if (statusFilter) params.status = statusFilter;
            const res = await api.get('/admin/car-listings', { params });
            setListings(res.data.listings);
            setTotal(res.data.total);
            setStats(res.data.stats || []);
        } finally { setLoading(false); }
    }, [page, statusFilter]);

    useEffect(() => { load(); }, [load]);

    const setStatus = async (id, status) => {
        setSaving(true);
        try {
            await api.put(`/admin/car-listings/${id}`, { status });
            setSelected(null);
            load();
        } catch (e) {
            alert(e.response?.data?.error || 'Erreur');
        } finally { setSaving(false); }
    };

    const pages = Math.ceil(total / 30);
    const fmt   = n => Number(n || 0).toLocaleString('fr-FR');

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Annonces Automobile</h1>
                    <p className="page-subtitle">Marché · Véhicules listés par les vendeurs vérifiés Ombia</p>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10, marginBottom: 20 }}>
                {stats.map(s => {
                    const m = STATUS_META[s.status] || STATUS_META.active;
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
                                    <th>Véhicule</th>
                                    <th>Vendeur</th>
                                    <th>Prix</th>
                                    <th>Ville</th>
                                    <th>Vues</th>
                                    <th>Statut</th>
                                    <th>Publié le</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>Chargement…</td></tr>}
                                {!loading && listings.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>Aucune annonce</td></tr>}
                                {listings.map(l => {
                                    const sm = STATUS_META[l.status] || STATUS_META.active;
                                    return (
                                        <tr key={l.id} style={{ cursor: 'pointer', background: selected?.id === l.id ? '#FDF5FF' : undefined }} onClick={() => setSelected(l)}>
                                            <td>
                                                <div style={{ fontWeight: 700 }}>{l.make} {l.model}</div>
                                                <div style={{ fontSize: 11, color: '#888' }}>{l.year}{l.color ? ` · ${l.color}` : ''}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{l.seller?.name || '—'}</div>
                                                <div style={{ fontSize: 11, color: '#888' }}>{l.seller?.email}</div>
                                            </td>
                                            <td style={{ fontWeight: 700, color: '#7B1FA2' }}>{fmt(l.price)} XAF</td>
                                            <td style={{ fontSize: 12, color: '#555' }}>{l.city || '—'}</td>
                                            <td style={{ fontSize: 12, color: '#888' }}>{l.view_count || 0}</td>
                                            <td>
                                                <span style={{ background: sm.bg, color: sm.color, padding: '3px 10px', borderRadius: 8, fontWeight: 700, fontSize: 12 }}>{sm.label}</span>
                                            </td>
                                            <td style={{ fontSize: 12, color: '#888' }}>
                                                {new Date(l.created_at).toLocaleDateString('fr-FR')}
                                            </td>
                                            <td>
                                                <button className="btn-secondary" style={{ fontSize: 12 }}>Voir</button>
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
                    <div style={{ width: 360, flexShrink: 0, background: '#fff', borderRadius: 14, border: '1.5px solid #E8EAF0', padding: '18px 20px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 16 }}>{selected.make} {selected.model}</div>
                                <div style={{ fontSize: 12, color: '#888' }}>{selected.year} · {selected.color} · {selected.city}</div>
                                <div style={{ fontSize: 16, fontWeight: 900, color: '#7B1FA2', marginTop: 4 }}>{fmt(selected.price)} XAF</div>
                            </div>
                            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#aaa' }}>×</button>
                        </div>

                        {/* Photos */}
                        {selected.photos?.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
                                {selected.photos.slice(0, 4).map((url, i) => <CarPhoto key={i} url={url} />)}
                            </div>
                        )}

                        {/* Specs */}
                        <div style={{ background: '#FDF5FF', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#7B1FA2', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Caractéristiques</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 12 }}>
                                {[
                                    ['Kilométrage', selected.mileage ? `${fmt(selected.mileage)} km` : null],
                                    ['Carburant', FUEL_LABEL[selected.fuel_type] || selected.fuel_type],
                                    ['Transmission', TRANS_LABEL[selected.transmission] || selected.transmission],
                                    ['Sièges', selected.seats],
                                ].map(([l, v]) => v ? (
                                    <div key={l}>
                                        <span style={{ color: '#aaa' }}>{l}: </span>
                                        <span style={{ fontWeight: 600 }}>{v}</span>
                                    </div>
                                ) : null)}
                            </div>
                        </div>

                        {/* Description */}
                        {selected.description && (
                            <div style={{ fontSize: 13, color: '#555', marginBottom: 14, lineHeight: 1.6 }}>{selected.description}</div>
                        )}

                        {/* Seller */}
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 14 }}>
                            <strong style={{ color: '#555' }}>Vendeur :</strong> {selected.seller?.name || '—'} · {selected.seller?.email}
                        </div>

                        {/* Moderate actions */}
                        <div style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>Modération</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {selected.status !== 'active' && (
                                    <button style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid #C8E6C9', background: '#E8F5E9', color: '#2E7D32', fontWeight: 700, fontSize: 13, cursor: 'pointer' }} onClick={() => setStatus(selected.id, 'active')} disabled={saving}>
                                        ✓ Activer
                                    </button>
                                )}
                                {selected.status !== 'paused' && (
                                    <button style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid #E0E0E0', background: '#F5F5F5', color: '#555', fontWeight: 700, fontSize: 13, cursor: 'pointer' }} onClick={() => setStatus(selected.id, 'paused')} disabled={saving}>
                                        ⏸ Mettre en pause
                                    </button>
                                )}
                                {selected.status !== 'sold' && (
                                    <button style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid #E1BEE7', background: '#F3E5F5', color: '#7B1FA2', fontWeight: 700, fontSize: 13, cursor: 'pointer' }} onClick={() => setStatus(selected.id, 'sold')} disabled={saving}>
                                        🏷 Marquer vendu
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
