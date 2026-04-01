import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import './Rides.css';

const CATEGORY_LABELS = {
    restaurant: 'Restauration', grocery: 'Épicerie', fashion: 'Mode',
    beauty: 'Beauté', electronics: 'Électronique', home: 'Maison',
    sports: 'Sport', services: 'Services', other: 'Autre',
};

const STATUS_META = {
    active:       { label: 'Actif',   color: '#2E7D32', bg: '#E8F5E9' },
    paused:       { label: 'Pausé',   color: '#E65100', bg: '#FFF3E0' },
    out_of_stock: { label: 'Rupture', color: '#C62828', bg: '#FFEBEE' },
};

const fmt     = n => Number(n || 0).toLocaleString('fr-FR');
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function ProductPhoto({ url }) {
    if (!url) return <div style={{ background: '#F5F5F5', borderRadius: 6, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 18 }}>📦</div>;
    const full = url.startsWith('http') ? url : `${API_BASE.replace('/api', '')}${url}`;
    return <a href={full} target="_blank" rel="noreferrer"><img src={full} alt="" style={{ width: '100%', height: 56, objectFit: 'cover', borderRadius: 6 }} /></a>;
}

export default function Products() {
    const [products,     setProducts]     = useState([]);
    const [stats,        setStats]        = useState([]);
    const [total,        setTotal]        = useState(0);
    const [loading,      setLoading]      = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [page,         setPage]         = useState(1);
    const [selected,     setSelected]     = useState(null);
    const [saving,       setSaving]       = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, limit: 30 };
            if (statusFilter) params.status = statusFilter;
            const res = await api.get('/admin/products', { params });
            setProducts(res.data.products || []);
            setTotal(res.data.total || 0);
            // Normalize stats: server returns object { active: N, paused: N, out_of_stock: N }
            const raw = res.data.stats || {};
            setStats(Object.entries(raw).map(([status, count]) => ({ status, count })));
        } finally { setLoading(false); }
    }, [page, statusFilter]);

    useEffect(() => { load(); }, [load]);

    const changeStatus = async (id, status) => {
        setSaving(true);
        try {
            await api.put(`/admin/products/${id}`, { status });
            setSelected(prev => prev?.id === id ? { ...prev, status } : prev);
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
                    <h1 className="page-title">Produits E-commerce</h1>
                    <p className="page-subtitle">Marché · Produits listés par les vendeurs vérifiés Ombia</p>
                </div>
            </div>

            {/* Stats bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10, marginBottom: 20 }}>
                {stats.map(s => {
                    const m = STATUS_META[s.status] || STATUS_META.active;
                    return (
                        <div key={s.status}
                             style={{ background: m.bg, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', border: statusFilter === s.status ? `2px solid ${m.color}` : '2px solid transparent' }}
                             onClick={() => { setStatusFilter(statusFilter === s.status ? '' : s.status); setPage(1); }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: m.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{m.label}</div>
                            <div style={{ fontSize: 26, fontWeight: 900, color: m.color, marginTop: 2 }}>{s.count}</div>
                        </div>
                    );
                })}
                {statusFilter && (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button className="btn-secondary" style={{ fontSize: 11 }} onClick={() => { setStatusFilter(''); setPage(1); }}>✕ Réinitialiser</button>
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
                                    <th>Photo</th>
                                    <th>Produit</th>
                                    <th>Catégorie</th>
                                    <th>Vendeur</th>
                                    <th>Prix</th>
                                    <th>Stock</th>
                                    <th>Statut</th>
                                    <th>Publié le</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>Chargement…</td></tr>}
                                {!loading && products.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>Aucun produit{statusFilter ? ' pour ce statut' : ''}</td></tr>}
                                {products.map(p => {
                                    const sm = STATUS_META[p.status] || STATUS_META.active;
                                    const photo = p.photos?.[0];
                                    return (
                                        <tr key={p.id} style={{ cursor: 'pointer', background: selected?.id === p.id ? '#F5F3FF' : undefined }} onClick={() => setSelected(p)}>
                                            <td style={{ width: 60 }}>
                                                {photo
                                                    ? <img src={photo} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
                                                    : <div style={{ width: 44, height: 44, borderRadius: 8, background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📦</div>
                                                }
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 700, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                                            </td>
                                            <td style={{ fontSize: 12, color: '#555' }}>{CATEGORY_LABELS[p.category] || p.category || '—'}</td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{p.seller?.name || '—'}</div>
                                                <div style={{ fontSize: 11, color: '#888' }}>{p.seller?.phone}</div>
                                            </td>
                                            <td style={{ fontWeight: 700, color: '#7B1FA2' }}>{fmt(p.price)} XAF</td>
                                            <td style={{ fontSize: 12, color: '#555' }}>{p.stock === -1 ? '∞' : (p.stock ?? '—')}</td>
                                            <td>
                                                <span style={{ background: sm.bg, color: sm.color, padding: '3px 10px', borderRadius: 8, fontWeight: 700, fontSize: 12 }}>{sm.label}</span>
                                            </td>
                                            <td style={{ fontSize: 12, color: '#888' }}>
                                                {new Date(p.created_at).toLocaleDateString('fr-FR')}
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
                                <div style={{ fontWeight: 700, fontSize: 16 }}>{selected.name}</div>
                                <div style={{ fontSize: 17, fontWeight: 900, color: '#7B1FA2', marginTop: 4 }}>{fmt(selected.price)} XAF</div>
                            </div>
                            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#aaa' }}>×</button>
                        </div>

                        {/* Photos */}
                        {selected.photos?.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
                                {selected.photos.slice(0, 4).map((url, i) => <ProductPhoto key={i} url={url} />)}
                            </div>
                        )}

                        {/* Specs */}
                        <div style={{ background: '#F5F3FF', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#7B1FA2', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Caractéristiques</div>
                            {[
                                ['Catégorie', CATEGORY_LABELS[selected.category] || selected.category],
                                ['Stock', selected.stock === -1 ? 'Illimité' : selected.stock],
                                ['Unité', selected.unit || 'unité'],
                                ['Vues', selected.view_count ?? 0],
                            ].map(([l, v]) => v !== undefined && v !== null ? (
                                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                                    <span style={{ color: '#888' }}>{l}</span>
                                    <span style={{ fontWeight: 600 }}>{v}</span>
                                </div>
                            ) : null)}
                        </div>

                        {/* Description */}
                        {selected.description && (
                            <div style={{ fontSize: 13, color: '#555', marginBottom: 14, lineHeight: 1.6 }}>{selected.description}</div>
                        )}

                        {/* Seller */}
                        <div style={{ background: '#FAFAFA', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 6 }}>Vendeur</div>
                            <div style={{ fontWeight: 700 }}>{selected.seller?.name || '—'}</div>
                            <div style={{ fontSize: 12, color: '#888' }}>{selected.seller?.phone}</div>
                        </div>

                        {/* Moderation */}
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>Modération</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {Object.entries(STATUS_META).map(([s, m]) => (
                                    <button
                                        key={s}
                                        disabled={selected.status === s || saving}
                                        onClick={() => changeStatus(selected.id, s)}
                                        style={{
                                            padding: '7px 12px', borderRadius: 8,
                                            border: `1.5px solid ${selected.status === s ? m.color : '#E0E0E0'}`,
                                            background: selected.status === s ? m.bg : '#fff',
                                            color: selected.status === s ? m.color : '#555',
                                            fontWeight: 700, fontSize: 12,
                                            cursor: (selected.status === s || saving) ? 'default' : 'pointer',
                                            opacity: saving ? 0.7 : 1,
                                        }}
                                    >
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
