import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import './Rides.css';

const STATUS_META = {
    pending_approval: { label: 'En attente',   color: '#E65100', bg: '#FFF3E0' },
    available:        { label: 'Disponible',   color: '#2E7D32', bg: '#E8F5E9' },
    rented:           { label: 'En location',  color: '#1565C0', bg: '#E3F2FD' },
    unavailable:      { label: 'Indisponible', color: '#888',    bg: '#F5F5F5' },
    suspended:        { label: 'Suspendu',     color: '#C62828', bg: '#FFEBEE' },
};

const FUEL_LABELS  = { essence: 'Essence', diesel: 'Diesel', hybride: 'Hybride', electrique: 'Électrique' };
const TRANS_LABELS = { manuelle: 'Manuelle', automatique: 'Automatique' };

const fmt = n => Number(n || 0).toLocaleString('fr-FR');

export default function RentalCars() {
    const [cars,         setCars]         = useState([]);
    const [total,        setTotal]        = useState(0);
    const [loading,      setLoading]      = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [page,         setPage]         = useState(1);
    const [selected,     setSelected]     = useState(null);
    const [adminNotes,   setAdminNotes]   = useState('');
    const [saving,       setSaving]       = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, limit: 20 };
            if (statusFilter) params.status = statusFilter;
            const res = await api.get('/admin/rentals/cars', { params });
            setCars(res.data.cars || []);
            setTotal(res.data.pagination?.total || 0);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [page, statusFilter]);

    useEffect(() => { load(); }, [load]);

    const openCar = (car) => {
        setSelected(car);
        setAdminNotes(car.admin_notes || '');
    };

    const updateStatus = async (carId, status) => {
        setSaving(true);
        try {
            await api.put(`/admin/rentals/cars/${carId}/status`, { status, admin_notes: adminNotes });
            setSelected(null);
            load();
        } catch (e) { alert(e.response?.data?.error || 'Erreur'); }
        finally { setSaving(false); }
    };

    const pages = Math.ceil(total / 20);

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Véhicules en Location</h1>
                    <p className="page-subtitle">Gestion des annonces de location · Approbation et modération</p>
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
                                    <th>Propriétaire</th>
                                    <th>Tarif</th>
                                    <th>Localisation</th>
                                    <th>Statut</th>
                                    <th>Ajouté le</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>Chargement…</td></tr>}
                                {!loading && cars.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>Aucun véhicule{statusFilter ? ' pour ce statut' : ''}</td></tr>}
                                {cars.map(car => {
                                    const sm = STATUS_META[car.status] || STATUS_META.unavailable;
                                    return (
                                        <tr key={car.id} style={{ cursor: 'pointer', background: selected?.id === car.id ? '#FFF8EE' : undefined }} onClick={() => openCar(car)}>
                                            <td>
                                                <div style={{ fontWeight: 700 }}>{car.make} {car.model} {car.year}</div>
                                                <div style={{ fontSize: 11, color: '#888' }}>{car.color} · {car.license_plate} · {car.seats} places · {FUEL_LABELS[car.fuel_type] || car.fuel_type}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{car.owner?.name || '—'}</div>
                                                <div style={{ fontSize: 11, color: '#888' }}>{car.owner?.phone}</div>
                                                <div style={{ fontSize: 11, color: '#aaa' }}>⭐ {parseFloat(car.owner?.rating || 5).toFixed(1)}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 700, color: '#E65100' }}>{fmt(car.price_per_hour)} XAF/h</div>
                                                <div style={{ fontSize: 11, color: '#888' }}>{fmt(car.price_per_day)} XAF/jour</div>
                                                <div style={{ fontSize: 11, color: '#aaa' }}>Caution : {fmt(car.deposit_amount)} XAF</div>
                                            </td>
                                            <td style={{ fontSize: 12, color: '#555', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {car.pickup_address || '—'}
                                            </td>
                                            <td>
                                                <span style={{ background: sm.bg, color: sm.color, padding: '3px 10px', borderRadius: 8, fontWeight: 700, fontSize: 12 }}>{sm.label}</span>
                                                {car.admin_notes && <div style={{ fontSize: 10, color: '#aaa', marginTop: 2, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{car.admin_notes}</div>}
                                            </td>
                                            <td style={{ fontSize: 12, color: '#888' }}>
                                                {new Date(car.created_at).toLocaleDateString('fr-FR')}
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
                    <div style={{ width: 380, flexShrink: 0, background: '#fff', borderRadius: 14, border: '1.5px solid #E8EAF0', padding: '18px 20px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>{selected.make} {selected.model} {selected.year}</div>
                                <div style={{ fontSize: 11, color: '#888' }}>{selected.color} · {selected.license_plate}</div>
                            </div>
                            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#aaa' }}>×</button>
                        </div>

                        {/* Owner */}
                        <div style={{ background: '#FFF8EE', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#FFA726', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Propriétaire</div>
                            <div style={{ fontWeight: 700 }}>{selected.owner?.name}</div>
                            <div style={{ fontSize: 12, color: '#888' }}>{selected.owner?.email}</div>
                            <div style={{ fontSize: 12, color: '#888' }}>{selected.owner?.phone}</div>
                        </div>

                        {/* Pricing */}
                        <div style={{ background: '#F0F4FF', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#1565C0', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Tarification</div>
                            {[
                                ['Par heure',  fmt(selected.price_per_hour)  + ' XAF'],
                                ['Par jour',   fmt(selected.price_per_day)   + ' XAF'],
                                ['Caution',    fmt(selected.deposit_amount)  + ' XAF'],
                                ['Carburant',  FUEL_LABELS[selected.fuel_type]  || selected.fuel_type],
                                ['Boîte',      TRANS_LABELS[selected.transmission] || selected.transmission],
                                ['Sièges',     selected.seats],
                            ].map(([l, v]) => v ? (
                                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                                    <span style={{ color: '#888' }}>{l}</span>
                                    <span style={{ fontWeight: 600 }}>{v}</span>
                                </div>
                            ) : null)}
                        </div>

                        {/* Availability */}
                        {(selected.available_from || selected.available_until) && (
                            <div style={{ background: '#F8F9FB', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12 }}>
                                <div style={{ fontWeight: 700, color: '#888', fontSize: 11, textTransform: 'uppercase', marginBottom: 4 }}>Disponibilité</div>
                                <div>{new Date(selected.available_from).toLocaleDateString('fr-FR')} → {new Date(selected.available_until).toLocaleDateString('fr-FR')}</div>
                            </div>
                        )}

                        {/* Location */}
                        {selected.pickup_address && (
                            <div style={{ background: '#F8F9FB', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#555' }}>
                                <div style={{ fontWeight: 700, color: '#888', fontSize: 11, textTransform: 'uppercase', marginBottom: 4 }}>Prise en charge</div>
                                {selected.pickup_address}
                                {selected.pickup_instructions && <div style={{ marginTop: 4, color: '#aaa', fontStyle: 'italic' }}>{selected.pickup_instructions}</div>}
                            </div>
                        )}

                        {/* Features */}
                        {selected.features?.length > 0 && (
                            <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Équipements</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {selected.features.map(f => (
                                        <span key={f} style={{ background: '#F0F4FF', color: '#1565C0', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{f}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        {['pending_approval', 'available', 'suspended'].includes(selected.status) && (
                            <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>Actions</div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {selected.status === 'pending_approval' && (
                                        <>
                                            <button className="btn-approve" onClick={() => updateStatus(selected.id, 'available')} disabled={saving}>
                                                {saving ? '…' : '✅ Approuver'}
                                            </button>
                                            <button className="btn-danger" onClick={() => updateStatus(selected.id, 'suspended')} disabled={saving}>
                                                {saving ? '…' : '❌ Rejeter'}
                                            </button>
                                        </>
                                    )}
                                    {selected.status === 'available' && (
                                        <button className="btn-danger" onClick={() => updateStatus(selected.id, 'suspended')} disabled={saving}>
                                            {saving ? '…' : '⏸ Suspendre'}
                                        </button>
                                    )}
                                    {selected.status === 'suspended' && (
                                        <button className="btn-approve" onClick={() => updateStatus(selected.id, 'available')} disabled={saving}>
                                            {saving ? '…' : '✅ Réactiver'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Admin notes */}
                        <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>Note pour le propriétaire (optionnel)</div>
                            <textarea
                                className="form-input"
                                rows={3}
                                placeholder="Motif de refus, instructions de correction…"
                                value={adminNotes}
                                onChange={e => setAdminNotes(e.target.value)}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
