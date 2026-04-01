import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import './Rides.css';

const STATUS_META = {
    requested:  { label: 'Demandée',  color: '#E65100', bg: '#FFF3E0' },
    approved:   { label: 'Approuvée', color: '#1565C0', bg: '#E3F2FD' },
    active:     { label: 'En cours',  color: '#2E7D32', bg: '#E8F5E9' },
    completed:  { label: 'Terminée',  color: '#888',    bg: '#F5F5F5' },
    rejected:   { label: 'Refusée',   color: '#C62828', bg: '#FFEBEE' },
    cancelled:  { label: 'Annulée',   color: '#C62828', bg: '#FFEBEE' },
    disputed:   { label: 'Contestée', color: '#7B1FA2', bg: '#F3E5F5' },
};

const fmt     = n => Number(n || 0).toLocaleString('fr-FR');
const fmtDate = d => d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

export default function RentalBookings() {
    const [bookings,     setBookings]     = useState([]);
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
            const res = await api.get('/admin/rentals/bookings', { params });
            setBookings(res.data.bookings || []);
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
                    <h1 className="page-title">Réservations Location</h1>
                    <p className="page-subtitle">Suivi de toutes les transactions de location de véhicules</p>
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
                <span style={{ fontSize: 12, color: '#888', marginLeft: 'auto' }}>{total} réservation{total !== 1 ? 's' : ''}</span>
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
                {/* Table */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Véhicule</th>
                                    <th>Locataire</th>
                                    <th>Propriétaire</th>
                                    <th>Période</th>
                                    <th>Montant</th>
                                    <th>Statut</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>Chargement…</td></tr>}
                                {!loading && bookings.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>Aucune réservation{statusFilter ? ' pour ce statut' : ''}</td></tr>}
                                {bookings.map(b => {
                                    const sm = STATUS_META[b.status] || STATUS_META.requested;
                                    return (
                                        <tr key={b.id} style={{ cursor: 'pointer', background: selected?.id === b.id ? '#F0F7FF' : undefined }} onClick={() => setSelected(b)}>
                                            <td>
                                                <div style={{ fontWeight: 700 }}>{b.rentalCar?.make} {b.rentalCar?.model} {b.rentalCar?.year}</div>
                                                <div style={{ fontSize: 11, color: '#888' }}>{b.rentalCar?.license_plate}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{b.renter?.name || '—'}</div>
                                                <div style={{ fontSize: 11, color: '#888' }}>{b.renter?.phone}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{b.owner?.name || '—'}</div>
                                                <div style={{ fontSize: 11, color: '#888' }}>{b.owner?.phone}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: 11 }}>{fmtDate(b.requested_start)}</div>
                                                <div style={{ fontSize: 11, color: '#888' }}>→ {fmtDate(b.requested_end)}</div>
                                                {b.total_hours && <div style={{ fontSize: 10, color: '#aaa' }}>{b.total_hours}h</div>}
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 700, color: '#1565C0' }}>{fmt(b.total_charged)} XAF</div>
                                                <div style={{ fontSize: 11, color: '#888' }}>Proprio : {fmt(b.owner_earnings)} XAF</div>
                                                <div style={{ fontSize: 11, color: '#888' }}>Frais : {fmt(b.platform_fee)} XAF</div>
                                            </td>
                                            <td>
                                                <span style={{ background: sm.bg, color: sm.color, padding: '3px 10px', borderRadius: 8, fontWeight: 700, fontSize: 12 }}>{sm.label}</span>
                                                {b.payment_status && <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>{b.payment_status}</div>}
                                            </td>
                                            <td>
                                                <button className="btn-secondary btn-sm">Détail</button>
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
                    <div style={{ width: 400, flexShrink: 0, background: '#fff', borderRadius: 14, border: '1.5px solid #E8EAF0', padding: '18px 20px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>{selected.rentalCar?.make} {selected.rentalCar?.model} {selected.rentalCar?.year}</div>
                                <div style={{ fontSize: 11, color: '#888' }}>{selected.rentalCar?.license_plate}</div>
                            </div>
                            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#aaa' }}>×</button>
                        </div>

                        {/* Status */}
                        {(() => {
                            const sm = STATUS_META[selected.status] || STATUS_META.requested;
                            return (
                                <div style={{ background: sm.bg, borderRadius: 8, padding: '8px 14px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 700, color: sm.color }}>{sm.label}</span>
                                    {selected.payment_status && <span style={{ fontSize: 11, color: sm.color, opacity: 0.7 }}>{selected.payment_status}</span>}
                                </div>
                            );
                        })()}

                        {/* Parties */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                            {[
                                { label: 'Locataire', user: selected.renter },
                                { label: 'Propriétaire', user: selected.owner },
                            ].map(({ label, user }) => (
                                <div key={label} style={{ background: '#FAFAFA', borderRadius: 10, padding: '10px 12px' }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                                    <div style={{ fontWeight: 700, fontSize: 13 }}>{user?.name || '—'}</div>
                                    <div style={{ fontSize: 11, color: '#888' }}>{user?.phone}</div>
                                </div>
                            ))}
                        </div>

                        {/* Period */}
                        <div style={{ background: '#F0F4FF', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#1565C0', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Période</div>
                            {[
                                ['Demandée',  `${fmtDate(selected.requested_start)} → ${fmtDate(selected.requested_end)}`],
                                selected.confirmed_start && ['Confirmée', `${fmtDate(selected.confirmed_start)} → ${fmtDate(selected.confirmed_end)}`],
                                selected.actual_return_time && ['Retour effectif', fmtDate(selected.actual_return_time)],
                                ['Durée', selected.total_hours ? `${selected.total_hours}h` : '—'],
                            ].filter(Boolean).map(([l, v]) => (
                                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                                    <span style={{ color: '#888' }}>{l}</span>
                                    <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: 200 }}>{v}</span>
                                </div>
                            ))}
                        </div>

                        {/* Financials */}
                        <div style={{ background: '#F0FDF4', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#2E7D32', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Finances</div>
                            {[
                                ['Prix de base',           fmt(selected.base_price)      + ' XAF', false],
                                ['Caution',                fmt(selected.deposit_amount)  + ' XAF', false],
                                ['Frais plateforme (10%)', fmt(selected.platform_fee)    + ' XAF', false],
                                ['Total facturé',          fmt(selected.total_charged)   + ' XAF', true],
                                ['Gains propriétaire',     fmt(selected.owner_earnings)  + ' XAF', true],
                            ].map(([l, v, bold]) => (
                                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12, borderBottom: bold && l === 'Total facturé' ? '1px solid #C8E6C9' : 'none', paddingBottom: bold && l === 'Total facturé' ? 4 : 0 }}>
                                    <span style={{ color: bold ? '#2E7D32' : '#888', fontWeight: bold ? 700 : 400 }}>{l}</span>
                                    <span style={{ fontWeight: bold ? 800 : 600, color: bold ? '#2E7D32' : '#1C2E4A' }}>{v}</span>
                                </div>
                            ))}
                        </div>

                        {/* Ratings */}
                        {(selected.renter_rating || selected.owner_rating) && (
                            <div style={{ background: '#FFF8EE', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#FFA726', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Évaluations</div>
                                {selected.renter_rating && (
                                    <div style={{ marginBottom: 6 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600 }}>Locataire → {'⭐'.repeat(selected.renter_rating)}</div>
                                        {selected.renter_comment && <div style={{ fontSize: 11, color: '#888', fontStyle: 'italic' }}>"{selected.renter_comment}"</div>}
                                    </div>
                                )}
                                {selected.owner_rating && (
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 600 }}>Propriétaire → {'⭐'.repeat(selected.owner_rating)}</div>
                                        {selected.owner_comment && <div style={{ fontSize: 11, color: '#888', fontStyle: 'italic' }}>"{selected.owner_comment}"</div>}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Cancellation */}
                        {selected.cancellation_reason && (
                            <div style={{ background: '#FFEBEE', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#C62828' }}>
                                <div style={{ fontWeight: 700, marginBottom: 2 }}>Motif d'annulation</div>
                                {selected.cancellation_reason}
                            </div>
                        )}

                        {/* Renter notes */}
                        {selected.notes && (
                            <div style={{ background: '#F8F9FB', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#555' }}>
                                <div style={{ fontWeight: 700, marginBottom: 2, color: '#888' }}>Notes du locataire</div>
                                {selected.notes}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
