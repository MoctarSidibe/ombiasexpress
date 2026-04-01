import { useState, useEffect } from 'react';
import {
    ShoppingCart, Package, CheckCircle, Clock, XCircle, Truck,
    ArrowLeft, MagnifyingGlass, CaretLeft, CaretRight,
} from '@phosphor-icons/react';
import './Rides.css';
import api from '../api';

const STATUS_META = {
    pending:   { label: 'En attente', bg: '#FFF3E0', color: '#E65100', icon: Clock },
    confirmed: { label: 'Confirmée',  bg: '#E3F2FD', color: '#1565C0', icon: CheckCircle },
    ready:     { label: 'Prête',      bg: '#F3E5F5', color: '#6A1B9A', icon: Package },
    delivered: { label: 'Livrée',     bg: '#E8F5E9', color: '#2E7D32', icon: CheckCircle },
    cancelled: { label: 'Annulée',    bg: '#FFEBEE', color: '#C62828', icon: XCircle },
};

const DELIVERY_LABELS = { pickup: 'Retrait sur place', delivery: 'Livraison' };

const fmt     = v => Number(v || 0).toLocaleString('fr-FR') + ' XAF';
const fmtDate = d => d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export default function Orders() {
    const [orders,   setOrders]   = useState([]);
    const [stats,    setStats]    = useState({ pending: 0, confirmed: 0, ready: 0, delivered: 0, cancelled: 0, total_revenue: 0 });
    const [filter,   setFilter]   = useState('all');
    const [search,   setSearch]   = useState('');
    const [selected, setSelected] = useState(null);
    const [loading,  setLoading]  = useState(true);
    const [page,     setPage]     = useState(1);
    const LIMIT = 30;

    const load = async (pg = 1, f = filter) => {
        setLoading(true);
        try {
            const params = { page: pg, limit: LIMIT };
            if (f !== 'all') params.status = f;
            const res = await api.get('/admin/orders', { params });
            setOrders(res.data.orders || []);
            if (res.data.stats) setStats(res.data.stats);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { load(1, filter); }, [filter]);

    const applyFilter = (f) => { setFilter(f); setPage(1); setSelected(null); };

    const updateStatus = async (id, status) => {
        try {
            await api.put(`/admin/orders/${id}/status`, { status });
            setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
            if (selected?.id === id) setSelected(prev => ({ ...prev, status }));
        } catch (e) {
            alert(e.response?.data?.error || 'Erreur lors de la mise à jour');
        }
    };

    const filtered = orders.filter(o => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            o.id?.toLowerCase().includes(q) ||
            o.buyer?.name?.toLowerCase().includes(q) ||
            o.seller?.name?.toLowerCase().includes(q)
        );
    });

    const statCards = [
        { key: 'all',       label: 'Total',      value: Object.entries(stats).filter(([k]) => k !== 'total_revenue').reduce((a, [, v]) => a + (Number(v) || 0), 0), bg: '#F5F5F5',  color: '#546E7A', icon: ShoppingCart },
        { key: 'pending',   label: 'En attente', value: stats.pending,   bg: '#FFF3E0', color: '#E65100', icon: Clock },
        { key: 'confirmed', label: 'Confirmées', value: stats.confirmed, bg: '#E3F2FD', color: '#1565C0', icon: CheckCircle },
        { key: 'ready',     label: 'Prêtes',     value: stats.ready,     bg: '#F3E5F5', color: '#6A1B9A', icon: Package },
        { key: 'delivered', label: 'Livrées',    value: stats.delivered, bg: '#E8F5E9', color: '#2E7D32', icon: Truck },
        { key: 'cancelled', label: 'Annulées',   value: stats.cancelled, bg: '#FFEBEE', color: '#C62828', icon: XCircle },
    ];

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Commandes E-commerce</h1>
                    <p className="page-subtitle">Gestion des commandes · Revenu total livré : <strong>{fmt(stats.total_revenue)}</strong></p>
                </div>
            </div>

            {/* Stat cards */}
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

            {/* Search + count */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #E8EAF0', borderRadius: 8, padding: '9px 14px', flex: 1, maxWidth: 360 }}>
                    <MagnifyingGlass size={15} color="#9AA3B0" />
                    <input
                        type="text"
                        placeholder="Rechercher par ID, acheteur, vendeur…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ border: 'none', outline: 'none', fontSize: 13, background: 'transparent', width: '100%' }}
                    />
                </div>
                <span style={{ fontSize: 12, color: '#888', marginLeft: 'auto' }}>{filtered.length} commande{filtered.length !== 1 ? 's' : ''}</span>
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
                {/* Table */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {loading ? (
                        <div className="loading">Chargement…</div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Acheteur</th>
                                        <th>Vendeur</th>
                                        <th>Articles</th>
                                        <th>Total</th>
                                        <th>Livraison</th>
                                        <th>Statut</th>
                                        <th>Date</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(order => {
                                        const meta = STATUS_META[order.status] || STATUS_META.pending;
                                        const StatusIcon = meta.icon;
                                        return (
                                            <tr key={order.id} style={{ background: selected?.id === order.id ? '#F0F7FF' : undefined }}>
                                                <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#9AA3B0' }}>
                                                    #{order.id?.slice(-8)}
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{order.buyer?.name || '—'}</div>
                                                    <div style={{ fontSize: 11, color: '#9AA3B0' }}>{order.buyer?.phone}</div>
                                                </td>
                                                <td style={{ fontWeight: 600, fontSize: 13 }}>{order.seller?.name || '—'}</td>
                                                <td style={{ fontSize: 13 }}>
                                                    {order.items?.length || 0} article{(order.items?.length || 0) > 1 ? 's' : ''}
                                                </td>
                                                <td style={{ fontWeight: 700, color: '#1C2E4A', fontSize: 13 }}>{fmt(order.total_amount)}</td>
                                                <td style={{ fontSize: 12, color: '#546E7A' }}>
                                                    {DELIVERY_LABELS[order.delivery_type] || order.delivery_type}
                                                </td>
                                                <td>
                                                    <span className="status-badge" style={{ background: meta.bg, color: meta.color, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                        <StatusIcon size={11} weight="fill" />
                                                        {meta.label}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: 12, color: '#9AA3B0' }}>{fmtDate(order.created_at)}</td>
                                                <td>
                                                    <button className="btn-secondary btn-sm" onClick={() => setSelected(order)}>Détail</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filtered.length === 0 && (
                                        <tr><td colSpan={9} style={{ textAlign: 'center', color: '#9AA3B0', padding: 40 }}>Aucune commande</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12 }}>
                        <button className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => { setPage(p => p - 1); load(page - 1); }}>
                            <CaretLeft size={13} />
                        </button>
                        <span style={{ fontSize: 12, padding: '6px 12px', color: '#546E7A' }}>Page {page}</span>
                        <button className="btn-secondary btn-sm" disabled={filtered.length < LIMIT} onClick={() => { setPage(p => p + 1); load(page + 1); }}>
                            <CaretRight size={13} />
                        </button>
                    </div>
                </div>

                {/* Detail side panel */}
                {selected && (
                    <div style={{ width: 420, flexShrink: 0, background: '#fff', borderRadius: 14, border: '1.5px solid #E8EAF0', padding: '18px 20px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>Commande #{selected.id?.slice(-8)}</div>
                                <div style={{ fontSize: 11, color: '#9AA3B0', marginTop: 2 }}>{fmtDate(selected.created_at)}</div>
                            </div>
                            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#aaa' }}>×</button>
                        </div>

                        {/* Status badge */}
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
                                { label: 'Acheteur', data: selected.buyer },
                                { label: 'Vendeur',  data: selected.seller },
                            ].map(({ label, data }) => (
                                <div key={label} style={{ background: '#FAFAFA', borderRadius: 10, padding: '10px 12px' }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1C2E4A' }}>{data?.name || '—'}</div>
                                    <div style={{ fontSize: 11, color: '#9AA3B0' }}>{data?.phone || data?.email}</div>
                                </div>
                            ))}
                        </div>

                        {/* Delivery */}
                        <div style={{ background: '#F8F9FB', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 6 }}>Livraison</div>
                            <div style={{ fontSize: 13, color: '#1C2E4A', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Truck size={14} />
                                {DELIVERY_LABELS[selected.delivery_type] || selected.delivery_type}
                            </div>
                            {selected.delivery_address && <div style={{ fontSize: 12, color: '#546E7A', marginTop: 4 }}>{selected.delivery_address}</div>}
                            {selected.notes && <div style={{ fontSize: 11, color: '#9AA3B0', fontStyle: 'italic', marginTop: 4 }}>"{selected.notes}"</div>}
                        </div>

                        {/* Items */}
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 8 }}>Articles ({selected.items?.length || 0})</div>
                            {(selected.items || []).map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F0F0F0' }}>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1C2E4A' }}>{item.product_name}</div>
                                        <div style={{ fontSize: 11, color: '#9AA3B0' }}>× {item.quantity} · {fmt(item.unit_price)} / unité</div>
                                    </div>
                                    <span style={{ fontWeight: 700, color: '#1C2E4A', fontSize: 13 }}>{fmt(item.subtotal)}</span>
                                </div>
                            ))}
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, fontWeight: 800, fontSize: 16, color: '#1C2E4A' }}>
                                <span>Total</span>
                                <span>{fmt(selected.total_amount)}</span>
                            </div>
                        </div>

                        {/* Admin actions */}
                        {selected.status !== 'delivered' && selected.status !== 'cancelled' && (
                            <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 10 }}>Actions Admin</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {selected.status === 'pending' && (
                                        <button className="btn-approve" onClick={() => updateStatus(selected.id, 'confirmed')}>Confirmer</button>
                                    )}
                                    {selected.status === 'confirmed' && (
                                        <button className="btn-approve" onClick={() => updateStatus(selected.id, 'ready')}>Marquer prête</button>
                                    )}
                                    {selected.status === 'ready' && (
                                        <button className="btn-approve" onClick={() => updateStatus(selected.id, 'delivered')}>Marquer livrée</button>
                                    )}
                                    <button
                                        className="btn-danger btn-sm"
                                        onClick={() => updateStatus(selected.id, 'cancelled')}
                                    >
                                        Annuler
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
