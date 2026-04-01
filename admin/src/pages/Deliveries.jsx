import { useState, useEffect } from 'react';
import {
    Package, Clock, CheckCircle, XCircle, Truck,
    MagnifyingGlass, CaretLeft, CaretRight, ArrowsClockwise,
} from '@phosphor-icons/react';
import './Rides.css';
import api from '../api';

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_META = {
    pending:   { label: 'En attente',  bg: '#FFF3E0', color: '#E65100', icon: Clock },
    accepted:  { label: 'Acceptée',    bg: '#E3F2FD', color: '#1565C0', icon: CheckCircle },
    picked_up: { label: 'Récupérée',   bg: '#F3E5F5', color: '#6A1B9A', icon: Package },
    delivered: { label: 'Livrée',      bg: '#E8F5E9', color: '#2E7D32', icon: Truck },
    cancelled: { label: 'Annulée',     bg: '#FFEBEE', color: '#C62828', icon: XCircle },
};

const SIZE_LABELS = { petit: 'Petit colis', moyen: 'Colis moyen', lourd: 'Colis lourd' };

const fmt     = v => Number(v || 0).toLocaleString('fr-FR') + ' XAF';
const fmtDate = d => d
    ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

// ── Component ──────────────────────────────────────────────────────────────────

export default function Deliveries() {
    const [deliveries, setDeliveries] = useState([]);
    const [stats,      setStats]      = useState({ pending: 0, accepted: 0, picked_up: 0, delivered: 0, cancelled: 0, total_revenue: 0 });
    const [filter,     setFilter]     = useState('all');
    const [search,     setSearch]     = useState('');
    const [selected,   setSelected]   = useState(null);
    const [loading,    setLoading]    = useState(true);
    const [page,       setPage]       = useState(1);
    const LIMIT = 30;

    const load = async (pg = page, f = filter) => {
        setLoading(true);
        try {
            const params = { page: pg, limit: LIMIT };
            if (f !== 'all') params.status = f;
            const res = await api.get('/admin/deliveries', { params });
            setDeliveries(res.data.deliveries || []);
            if (res.data.stats) setStats(res.data.stats);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { load(1, filter); }, [filter]);

    const applyFilter = (f) => { setFilter(f); setPage(1); setSelected(null); };

    const filtered = deliveries.filter(d => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            d.id?.toLowerCase().includes(q) ||
            d.sender?.name?.toLowerCase().includes(q) ||
            d.courier?.name?.toLowerCase().includes(q) ||
            d.pickup_address?.toLowerCase().includes(q) ||
            d.dropoff_address?.toLowerCase().includes(q)
        );
    });

    const totalAll = (stats.pending || 0) + (stats.accepted || 0) + (stats.picked_up || 0) + (stats.delivered || 0) + (stats.cancelled || 0);

    const statCards = [
        { key: 'all',       label: 'Total',      value: totalAll,         bg: '#F5F5F5', color: '#546E7A', icon: Package },
        { key: 'pending',   label: 'En attente', value: stats.pending,   bg: '#FFF3E0', color: '#E65100', icon: Clock },
        { key: 'accepted',  label: 'Acceptées',  value: stats.accepted,  bg: '#E3F2FD', color: '#1565C0', icon: CheckCircle },
        { key: 'picked_up', label: 'Récupérées', value: stats.picked_up, bg: '#F3E5F5', color: '#6A1B9A', icon: Package },
        { key: 'delivered', label: 'Livrées',    value: stats.delivered, bg: '#E8F5E9', color: '#2E7D32', icon: Truck },
        { key: 'cancelled', label: 'Annulées',   value: stats.cancelled, bg: '#FFEBEE', color: '#C62828', icon: XCircle },
    ];

    return (
        <div className="page">
            {/* ── Header ── */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Livraisons</h1>
                    <p className="page-subtitle">
                        Suivi des livraisons de colis &nbsp;·&nbsp;
                        Revenu total livré : <strong>{fmt(stats.total_revenue)}</strong>
                    </p>
                </div>
                <button className="btn-secondary" onClick={() => load(page, filter)} style={{ alignSelf: 'center' }}>
                    <ArrowsClockwise size={14} style={{ marginRight: 6 }} />
                    Actualiser
                </button>
            </div>

            {/* ── Stat cards / filter pills ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10, marginBottom: 24 }}>
                {statCards.map(({ key, label, value, bg, color, icon: Icon }) => (
                    <div
                        key={key}
                        onClick={() => applyFilter(key)}
                        style={{
                            background: filter === key ? bg : '#fff',
                            borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
                            border: `1.5px solid ${filter === key ? color : '#F0F2F5'}`,
                            transition: 'all 0.15s',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: filter === key ? color : '#9AA3B0', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                            <div style={{ width: 28, height: 28, borderRadius: 7, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Icon size={14} color={color} weight="fill" />
                            </div>
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: filter === key ? color : '#1C2E4A' }}>{value}</div>
                    </div>
                ))}
            </div>

            {/* ── Search bar ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #E8EAF0', borderRadius: 8, padding: '9px 14px', flex: 1, maxWidth: 360 }}>
                    <MagnifyingGlass size={15} color="#9AA3B0" />
                    <input
                        type="text"
                        placeholder="Rechercher par ID, expéditeur, coursier, adresse…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ border: 'none', outline: 'none', fontSize: 13, background: 'transparent', width: '100%' }}
                    />
                </div>
                <span style={{ fontSize: 12, color: '#888', marginLeft: 'auto' }}>
                    {filtered.length} livraison{filtered.length !== 1 ? 's' : ''}
                </span>
            </div>

            <div style={{ display: 'flex', gap: 16 }}>

                {/* ── Table ── */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {loading ? (
                        <div className="loading">Chargement…</div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Expéditeur</th>
                                        <th>Coursier</th>
                                        <th>Trajet</th>
                                        <th>Colis</th>
                                        <th>Tarif</th>
                                        <th>Statut</th>
                                        <th>Date</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(d => {
                                        const meta = STATUS_META[d.status] || STATUS_META.pending;
                                        const StatusIcon = meta.icon;
                                        return (
                                            <tr key={d.id} style={{ background: selected?.id === d.id ? '#F0F7FF' : undefined }}>
                                                <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#9AA3B0' }}>
                                                    #{d.id?.slice(-8)}
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{d.sender?.name || '—'}</div>
                                                    <div style={{ fontSize: 11, color: '#9AA3B0' }}>{d.sender?.phone}</div>
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{d.courier?.name || <span style={{ color: '#FFB300', fontWeight: 600 }}>Non assigné</span>}</div>
                                                    <div style={{ fontSize: 11, color: '#9AA3B0' }}>{d.courier?.phone}</div>
                                                </td>
                                                <td style={{ maxWidth: 160 }}>
                                                    <div style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        📍 {d.pickup_address}
                                                    </div>
                                                    <div style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#888' }}>
                                                        🏁 {d.dropoff_address}
                                                    </div>
                                                    {d.distance_km && (
                                                        <div style={{ fontSize: 10, color: '#B0B8C1' }}>{parseFloat(d.distance_km).toFixed(1)} km</div>
                                                    )}
                                                </td>
                                                <td style={{ fontSize: 12, color: '#546E7A' }}>
                                                    {SIZE_LABELS[d.package_size] || d.package_size}
                                                </td>
                                                <td style={{ fontWeight: 700, color: '#1C2E4A', fontSize: 13 }}>
                                                    {d.fare ? fmt(d.fare) : '—'}
                                                </td>
                                                <td>
                                                    <span className="status-badge" style={{ background: meta.bg, color: meta.color, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                        <StatusIcon size={11} weight="fill" />
                                                        {meta.label}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: 11, color: '#9AA3B0' }}>{fmtDate(d.created_at)}</td>
                                                <td>
                                                    <button className="btn-secondary btn-sm" onClick={() => setSelected(d)}>
                                                        Détail
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filtered.length === 0 && (
                                        <tr>
                                            <td colSpan={9} style={{ textAlign: 'center', color: '#9AA3B0', padding: 40 }}>
                                                Aucune livraison trouvée
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12 }}>
                        <button className="btn-secondary btn-sm" disabled={page <= 1}
                            onClick={() => { const p = page - 1; setPage(p); load(p); }}>
                            <CaretLeft size={13} />
                        </button>
                        <span style={{ fontSize: 12, padding: '6px 12px', color: '#546E7A' }}>Page {page}</span>
                        <button className="btn-secondary btn-sm" disabled={filtered.length < LIMIT}
                            onClick={() => { const p = page + 1; setPage(p); load(p); }}>
                            <CaretRight size={13} />
                        </button>
                    </div>
                </div>

                {/* ── Detail panel ── */}
                {selected && (
                    <div style={{
                        width: 420, flexShrink: 0,
                        background: '#fff', borderRadius: 14,
                        border: '1.5px solid #E8EAF0', padding: '18px 20px',
                        maxHeight: '80vh', overflowY: 'auto',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>Livraison #{selected.id?.slice(-8)}</div>
                                <div style={{ fontSize: 11, color: '#9AA3B0', marginTop: 2 }}>{fmtDate(selected.created_at)}</div>
                            </div>
                            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#aaa', padding: 0 }}>×</button>
                        </div>

                        {/* Status */}
                        {(() => {
                            const meta = STATUS_META[selected.status] || STATUS_META.pending;
                            const StatusIcon = meta.icon;
                            return (
                                <div style={{ background: meta.bg, borderRadius: 8, padding: '8px 14px', marginBottom: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                    <StatusIcon size={14} color={meta.color} weight="fill" />
                                    <span style={{ fontWeight: 700, color: meta.color, fontSize: 13 }}>{meta.label}</span>
                                </div>
                            );
                        })()}

                        {/* Parties */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                            {[
                                { label: 'Expéditeur', data: selected.sender },
                                { label: 'Coursier',   data: selected.courier },
                            ].map(({ label, data }) => (
                                <div key={label} style={{ background: '#FAFAFA', borderRadius: 10, padding: '10px 12px' }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1C2E4A' }}>
                                        {data?.name || (label === 'Coursier' ? <span style={{ color: '#FFB300' }}>Non assigné</span> : '—')}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#9AA3B0' }}>{data?.phone}</div>
                                    <div style={{ fontSize: 11, color: '#9AA3B0' }}>{data?.email}</div>
                                </div>
                            ))}
                        </div>

                        {/* Route */}
                        <div style={{ background: '#F0F4FF', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#1565C0', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Trajet</div>
                            <div style={{ fontSize: 12, marginBottom: 6 }}>
                                <span style={{ color: '#888' }}>📍 Départ :</span>
                                <span style={{ fontWeight: 600, marginLeft: 6 }}>{selected.pickup_address}</span>
                            </div>
                            <div style={{ fontSize: 12, marginBottom: 4 }}>
                                <span style={{ color: '#888' }}>🏁 Arrivée :</span>
                                <span style={{ fontWeight: 600, marginLeft: 6 }}>{selected.dropoff_address}</span>
                            </div>
                            {selected.distance_km && (
                                <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>
                                    Distance : {parseFloat(selected.distance_km).toFixed(2)} km
                                </div>
                            )}
                        </div>

                        {/* Package */}
                        <div style={{ background: '#F8F9FB', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Colis</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#1C2E4A' }}>
                                {SIZE_LABELS[selected.package_size] || selected.package_size}
                            </div>
                            {selected.package_description && (
                                <div style={{ fontSize: 12, color: '#546E7A', marginTop: 4 }}>{selected.package_description}</div>
                            )}
                            {selected.notes && (
                                <div style={{ fontSize: 11, color: '#9AA3B0', fontStyle: 'italic', marginTop: 4 }}>"{selected.notes}"</div>
                            )}
                        </div>

                        {/* Fare */}
                        <div style={{ background: '#F0FDF4', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#2E7D32', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Paiement</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, color: '#1C2E4A' }}>
                                <span>Tarif</span>
                                <span>{selected.fare ? fmt(selected.fare) : '—'}</span>
                            </div>
                        </div>

                        {/* Cancellation */}
                        {selected.status === 'cancelled' && selected.cancelled_by && (
                            <div style={{ background: '#FFEBEE', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#C62828', marginBottom: 14 }}>
                                <strong>Annulée par :</strong> {selected.cancelled_by}
                            </div>
                        )}

                        {/* Timestamps */}
                        <div style={{ fontSize: 11, color: '#B0B8C1', display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <div>Créée : {fmtDate(selected.created_at)}</div>
                            <div>Mise à jour : {fmtDate(selected.updated_at)}</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
