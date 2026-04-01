import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import './Rides.css';

const STATUS_META = {
    pending:   { label: 'En attente', color: '#E65100', bg: '#FFF3E0' },
    approved:  { label: 'Approuvé',   color: '#2E7D32', bg: '#E8F5E9' },
    rejected:  { label: 'Refusé',     color: '#C62828', bg: '#FFEBEE' },
    suspended: { label: 'Suspendu',   color: '#888',    bg: '#F5F5F5' },
};

const TYPE_LABELS = { economy: 'Économie', comfort: 'Confort', premium: 'Premium', xl: 'XL' };

export default function Vehicles() {
    const [vehicles,      setVehicles]      = useState([]);
    const [total,         setTotal]         = useState(0);
    const [loading,       setLoading]       = useState(true);
    const [statusFilter,  setStatusFilter]  = useState('');
    const [page,          setPage]          = useState(1);
    const [selected,      setSelected]      = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, limit: 20 };
            if (statusFilter) params.status = statusFilter;
            const res = await api.get('/admin/vehicles', { params });
            setVehicles(res.data.vehicles || []);
            setTotal(res.data.pagination?.total || 0);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [page, statusFilter]);

    useEffect(() => { load(); }, [load]);

    const updateStatus = async (vehicleId, status) => {
        setActionLoading(true);
        try {
            await api.put(`/admin/vehicles/${vehicleId}/status`, { status });
            setSelected(null);
            load();
        } catch (e) { alert('Erreur : ' + (e.response?.data?.error || e.message)); }
        finally { setActionLoading(false); }
    };

    const pages = Math.ceil(total / 20);

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Véhicules</h1>
                    <p className="page-subtitle">Validation des véhicules de chauffeurs · Approbation et suspension</p>
                </div>
            </div>

            {/* Filters */}
            <div className="filters">
                <select className="filter-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                    <option value="">Tous les statuts</option>
                    {Object.entries(STATUS_META).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                    ))}
                </select>
                <button className="btn-secondary" onClick={load}>↻ Actualiser</button>
                {statusFilter && (
                    <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => { setStatusFilter(''); setPage(1); }}>✕ Réinitialiser</button>
                )}
                <span style={{ fontSize: 12, color: '#888', marginLeft: 'auto' }}>{total} véhicule{total !== 1 ? 's' : ''}</span>
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
                {/* Table */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Véhicule</th>
                                    <th>Chauffeur</th>
                                    <th>Caractéristiques</th>
                                    <th>Statut</th>
                                    <th>Enregistré le</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>Chargement…</td></tr>}
                                {!loading && vehicles.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>Aucun véhicule trouvé</td></tr>}
                                {vehicles.map(v => {
                                    const sm = STATUS_META[v.status] || STATUS_META.pending;
                                    return (
                                        <tr key={v.id} style={{ cursor: 'pointer', background: selected?.id === v.id ? '#F0F7FF' : undefined }} onClick={() => setSelected(v)}>
                                            <td>
                                                <div style={{ fontWeight: 700 }}>{v.make} {v.model} {v.year}</div>
                                                <div style={{ fontSize: 11, color: '#888' }}>{v.color} · {v.license_plate}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{v.driver?.name || '—'}</div>
                                                <div style={{ fontSize: 11, color: '#888' }}>{v.driver?.email}</div>
                                                <div style={{ fontSize: 11, color: '#888' }}>{v.driver?.phone}</div>
                                                <div style={{ fontSize: 10, color: '#aaa' }}>⭐ {parseFloat(v.driver?.rating || 5).toFixed(1)}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: 11, color: '#555' }}>Type : {TYPE_LABELS[v.vehicle_type] || v.vehicle_type}</div>
                                                <div style={{ fontSize: 11, color: '#888' }}>{v.seats} places</div>
                                                {v.photo_url && <div style={{ fontSize: 10, color: '#0984E3' }}>A une photo</div>}
                                                {v.documents  && <div style={{ fontSize: 10, color: '#0984E3' }}>A des docs</div>}
                                            </td>
                                            <td>
                                                <span style={{ background: sm.bg, color: sm.color, padding: '3px 10px', borderRadius: 8, fontWeight: 700, fontSize: 12 }}>{sm.label}</span>
                                            </td>
                                            <td style={{ fontSize: 12, color: '#888' }}>
                                                {new Date(v.created_at).toLocaleDateString('fr-FR')}
                                            </td>
                                            <td>
                                                <button className="btn-secondary btn-sm">Examiner</button>
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
                                <div style={{ fontWeight: 700, fontSize: 15 }}>{selected.make} {selected.model} {selected.year}</div>
                                <div style={{ fontSize: 11, color: '#888' }}>{selected.color} · {selected.license_plate}</div>
                            </div>
                            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#aaa' }}>×</button>
                        </div>

                        {/* Status */}
                        {(() => {
                            const sm = STATUS_META[selected.status] || STATUS_META.pending;
                            return <div style={{ background: sm.bg, borderRadius: 8, padding: '8px 14px', marginBottom: 14 }}><span style={{ fontWeight: 700, color: sm.color }}>{sm.label}</span></div>;
                        })()}

                        {/* Driver */}
                        <div style={{ background: '#F0F4FF', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#1565C0', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Chauffeur</div>
                            <div style={{ fontWeight: 700 }}>{selected.driver?.name}</div>
                            <div style={{ fontSize: 12, color: '#888' }}>{selected.driver?.email}</div>
                            <div style={{ fontSize: 12, color: '#888' }}>{selected.driver?.phone}</div>
                            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>⭐ {parseFloat(selected.driver?.rating || 5).toFixed(1)}</div>
                        </div>

                        {/* Vehicle info */}
                        <div style={{ background: '#FAFAFA', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Informations</div>
                            {[
                                ['Type',   TYPE_LABELS[selected.vehicle_type] || selected.vehicle_type],
                                ['Places', selected.seats],
                                ['Couleur', selected.color],
                                ['Plaque',  selected.license_plate],
                            ].map(([l, v]) => v ? (
                                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                                    <span style={{ color: '#888' }}>{l}</span>
                                    <span style={{ fontWeight: 600 }}>{v}</span>
                                </div>
                            ) : null)}
                        </div>

                        {/* Photo */}
                        {selected.photo_url && (
                            <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 6 }}>Photo</div>
                                <a href={selected.photo_url} target="_blank" rel="noreferrer">
                                    <img src={selected.photo_url} alt="Véhicule" style={{ width: '100%', borderRadius: 8, maxHeight: 120, objectFit: 'cover' }} />
                                </a>
                            </div>
                        )}

                        {/* Actions */}
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>Actions</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {selected.status === 'pending' && (
                                    <>
                                        <button className="btn-approve" onClick={() => updateStatus(selected.id, 'approved')} disabled={actionLoading}>
                                            {actionLoading ? '…' : '✅ Approuver'}
                                        </button>
                                        <button className="btn-danger" onClick={() => updateStatus(selected.id, 'rejected')} disabled={actionLoading}>
                                            {actionLoading ? '…' : '❌ Refuser'}
                                        </button>
                                    </>
                                )}
                                {selected.status === 'approved' && (
                                    <button className="btn-danger" onClick={() => updateStatus(selected.id, 'suspended')} disabled={actionLoading}>
                                        {actionLoading ? '…' : '⏸ Suspendre'}
                                    </button>
                                )}
                                {(selected.status === 'rejected' || selected.status === 'suspended') && (
                                    <button className="btn-approve" onClick={() => updateStatus(selected.id, 'approved')} disabled={actionLoading}>
                                        {actionLoading ? '…' : '✅ Réactiver'}
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
