import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import './Rides.css';

const STATUS_META = {
    requested:        { label: 'Demandée',          color: '#E65100', bg: '#FFF3E0' },
    accepted:         { label: 'Acceptée',           color: '#1565C0', bg: '#E3F2FD' },
    driver_arrived:   { label: 'Chauffeur arrivé',  color: '#7B1FA2', bg: '#F3E5F5' },
    in_progress:      { label: 'En cours',          color: '#2E7D32', bg: '#E8F5E9' },
    completed:        { label: 'Terminée',          color: '#888',    bg: '#F5F5F5' },
    cancelled_rider:  { label: 'Annulée passager',  color: '#C62828', bg: '#FFEBEE' },
    cancelled_driver: { label: 'Annulée chauffeur', color: '#C62828', bg: '#FFEBEE' },
};

const PAY_LABELS = {
    ombia_wallet: 'Portefeuille Ombia', airtel_money: 'Airtel Money',
    moov_money: 'Moov Money', bank_card: 'Carte bancaire', cash: 'Espèces',
};

const fmt     = n => Number(n || 0).toLocaleString('fr-FR');
const fmtDate = d => d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

export default function Rides() {
    const [rides,        setRides]        = useState([]);
    const [total,        setTotal]        = useState(0);
    const [loading,      setLoading]      = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [page,         setPage]         = useState(1);
    const [selected,     setSelected]     = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, limit: 20 };
            if (statusFilter) params.status = statusFilter;
            const res = await api.get('/admin/rides', { params });
            setRides(res.data.rides || []);
            setTotal(res.data.pagination?.total || 0);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [page, statusFilter]);

    useEffect(() => { load(); }, [load]);

    const pages = Math.ceil(total / 20);

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Courses</h1>
                    <p className="page-subtitle">Suivi de toutes les courses de ride-sharing en temps réel</p>
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
                <span style={{ fontSize: 12, color: '#888', marginLeft: 'auto' }}>{total} course{total !== 1 ? 's' : ''}</span>
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
                {/* Table */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Passager</th>
                                    <th>Chauffeur</th>
                                    <th>Trajet</th>
                                    <th>Tarif</th>
                                    <th>Statut</th>
                                    <th>Date</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>Chargement…</td></tr>}
                                {!loading && rides.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>Aucune course trouvée</td></tr>}
                                {rides.map(r => {
                                    const sm = STATUS_META[r.status] || STATUS_META.requested;
                                    return (
                                        <tr key={r.id} style={{ cursor: 'pointer', background: selected?.id === r.id ? '#F0F7FF' : undefined }} onClick={() => setSelected(r)}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{r.rider?.name || '—'}</div>
                                                <div style={{ fontSize: 11, color: '#888' }}>{r.rider?.phone}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{r.driver?.name || 'Non assigné'}</div>
                                                <div style={{ fontSize: 11, color: '#888' }}>{r.driver?.phone}</div>
                                                {r.vehicle && <div style={{ fontSize: 10, color: '#aaa' }}>{r.vehicle.make} {r.vehicle.model}</div>}
                                            </td>
                                            <td style={{ maxWidth: 180 }}>
                                                <div style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {r.pickup_address}</div>
                                                <div style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#888' }}>🏁 {r.dropoff_address}</div>
                                                {r.distance_km && <div style={{ fontSize: 10, color: '#aaa' }}>{parseFloat(r.distance_km).toFixed(1)} km · {r.duration_minutes} min</div>}
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 700 }}>{r.fare ? fmt(r.fare) + ' XAF' : '—'}</div>
                                                {r.payment && <div style={{ fontSize: 11, color: '#888' }}>{PAY_LABELS[r.payment.payment_method] || r.payment.payment_method}</div>}
                                                {r.surge_multiplier > 1 && <div style={{ fontSize: 11, color: '#C62828' }}>×{r.surge_multiplier} surge</div>}
                                            </td>
                                            <td>
                                                <span style={{ background: sm.bg, color: sm.color, padding: '3px 10px', borderRadius: 8, fontWeight: 700, fontSize: 12 }}>{sm.label}</span>
                                            </td>
                                            <td style={{ fontSize: 11, color: '#888' }}>
                                                {new Date(r.created_at).toLocaleDateString('fr-FR')}
                                            </td>
                                            <td>
                                                <button className="btn-secondary btn-sm">Voir</button>
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
                                <div style={{ fontWeight: 700, fontSize: 14 }}>Détail de la course</div>
                                <div style={{ fontSize: 11, color: '#888' }}>{fmtDate(selected.created_at)}</div>
                            </div>
                            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#aaa' }}>×</button>
                        </div>

                        {/* Status */}
                        {(() => {
                            const sm = STATUS_META[selected.status] || STATUS_META.requested;
                            return <div style={{ background: sm.bg, borderRadius: 8, padding: '8px 14px', marginBottom: 14 }}><span style={{ fontWeight: 700, color: sm.color }}>{sm.label}</span></div>;
                        })()}

                        {/* Parties */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                            {[
                                { label: 'Passager',  user: selected.rider },
                                { label: 'Chauffeur', user: selected.driver },
                            ].map(({ label, user }) => (
                                <div key={label} style={{ background: '#FAFAFA', borderRadius: 10, padding: '10px 12px' }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                                    <div style={{ fontWeight: 700, fontSize: 13 }}>{user?.name || 'Non assigné'}</div>
                                    <div style={{ fontSize: 11, color: '#888' }}>{user?.phone}</div>
                                </div>
                            ))}
                        </div>

                        {/* Vehicle */}
                        {selected.vehicle && (
                            <div style={{ background: '#F8F9FB', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12 }}>
                                <div style={{ fontWeight: 700, color: '#888', fontSize: 11, textTransform: 'uppercase', marginBottom: 4 }}>Véhicule</div>
                                <div style={{ fontWeight: 600 }}>{selected.vehicle.make} {selected.vehicle.model} {selected.vehicle.year}</div>
                                <div style={{ color: '#888' }}>{selected.vehicle.license_plate} · {selected.vehicle.color}</div>
                            </div>
                        )}

                        {/* Route */}
                        <div style={{ background: '#F0F4FF', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#1565C0', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Trajet</div>
                            <div style={{ fontSize: 12, marginBottom: 6 }}>
                                <span style={{ color: '#888' }}>📍 Départ :</span>
                                <span style={{ fontWeight: 600, marginLeft: 4 }}>{selected.pickup_address}</span>
                            </div>
                            <div style={{ fontSize: 12, marginBottom: 6 }}>
                                <span style={{ color: '#888' }}>🏁 Arrivée :</span>
                                <span style={{ fontWeight: 600, marginLeft: 4 }}>{selected.dropoff_address}</span>
                            </div>
                            {selected.distance_km && (
                                <div style={{ fontSize: 12, color: '#888' }}>{parseFloat(selected.distance_km).toFixed(2)} km · {selected.duration_minutes} min</div>
                            )}
                        </div>

                        {/* Payment */}
                        <div style={{ background: '#F0FDF4', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#2E7D32', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Paiement</div>
                            {[
                                ['Tarif', selected.fare ? fmt(selected.fare) + ' XAF' : '—'],
                                selected.surge_multiplier > 1 && ['Surge', `×${selected.surge_multiplier}`],
                                selected.payment && ['Méthode', PAY_LABELS[selected.payment.payment_method] || selected.payment.payment_method],
                                selected.payment && ['Statut paiement', selected.payment.status],
                            ].filter(Boolean).map(([l, v]) => (
                                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                                    <span style={{ color: '#888' }}>{l}</span>
                                    <span style={{ fontWeight: 600 }}>{v}</span>
                                </div>
                            ))}
                        </div>

                        {/* Timestamps */}
                        <div style={{ fontSize: 11, color: '#aaa', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div>Demandée : {fmtDate(selected.created_at)}</div>
                            {selected.accepted_at   && <div>Acceptée : {fmtDate(selected.accepted_at)}</div>}
                            {selected.started_at    && <div>Démarrée : {fmtDate(selected.started_at)}</div>}
                            {selected.completed_at  && <div>Terminée : {fmtDate(selected.completed_at)}</div>}
                            {selected.cancelled_at  && <div>Annulée : {fmtDate(selected.cancelled_at)}</div>}
                        </div>

                        {/* Cancellation */}
                        {selected.cancellation_reason && (
                            <div style={{ marginTop: 10, background: '#FFEBEE', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#C62828' }}>
                                <strong>Motif d'annulation :</strong> {selected.cancellation_reason}
                            </div>
                        )}

                        {/* Ratings */}
                        {(selected.rider_rating || selected.driver_rating) && (
                            <div style={{ marginTop: 10, background: '#FFF8EE', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                                {selected.rider_rating && <div>Passager → chauffeur : {'⭐'.repeat(selected.rider_rating)} {selected.rider_comment && `— ${selected.rider_comment}`}</div>}
                                {selected.driver_rating && <div>Chauffeur → passager : {'⭐'.repeat(selected.driver_rating)} {selected.driver_comment && `— ${selected.driver_comment}`}</div>}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
