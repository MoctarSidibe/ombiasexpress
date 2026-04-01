import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import './Rides.css';

const SERVICE_META = {
    ride:     { label: 'Course',    color: '#E65100', bg: '#FFF3E0' },
    rental:   { label: 'Location',  color: '#2E7D32', bg: '#E8F5E9' },
    delivery: { label: 'Livraison', color: '#1565C0', bg: '#E3F2FD' },
};

const STAR_COLORS = ['', '#e53935', '#FF6F00', '#F9A825', '#43A047', '#2E7D32'];

const fmt     = (n) => Number(n || 0).toLocaleString('fr-FR');
const fmtDate = (d) => d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
const stars   = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

export default function Ratings() {
    const [ratings,     setRatings]     = useState([]);
    const [stats,       setStats]       = useState([]);
    const [total,       setTotal]       = useState(0);
    const [loading,     setLoading]     = useState(true);
    const [typeFilter,  setTypeFilter]  = useState('');
    const [starFilter,  setStarFilter]  = useState('');
    const [page,        setPage]        = useState(1);
    const [selected,    setSelected]    = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, limit: 25 };
            if (typeFilter) params.service_type = typeFilter;
            if (starFilter) { params.min_rating = starFilter; params.max_rating = starFilter; }
            const [rRes, sRes] = await Promise.all([
                api.get('/admin/ratings', { params }),
                api.get('/admin/ratings/stats'),
            ]);
            setRatings(rRes.data.ratings || []);
            setTotal(rRes.data.total   || 0);
            setStats(sRes.data.stats   || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [page, typeFilter, starFilter]);

    useEffect(() => { load(); }, [load]);

    const toggleHide = async (id) => {
        await api.patch('/admin/ratings/' + id);
        load();
    };

    const deleteRating = async (id) => {
        if (!window.confirm('Supprimer cette évaluation ?')) return;
        await api.delete('/admin/ratings/' + id);
        setSelected(null);
        load();
    };

    const pages = Math.ceil(total / 25);

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Évaluations</h1>
                    <p className="page-subtitle">Gestion des avis clients — courses, locations, livraisons</p>
                </div>
            </div>

            {/* Stats cards */}
            {stats.length > 0 && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                    {stats.map(s => {
                        const meta = SERVICE_META[s.service_type] || {};
                        return (
                            <div key={s.service_type} style={{
                                flex: 1, backgroundColor: meta.bg || '#F5F5F5',
                                borderRadius: 12, padding: '14px 18px',
                                borderLeft: `4px solid ${meta.color || '#888'}`,
                            }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
                                    {meta.label || s.service_type}
                                </div>
                                <div style={{ fontSize: 26, fontWeight: 800, color: '#1C2E4A', lineHeight: 1 }}>
                                    {parseFloat(s.avg_rating || 0).toFixed(2)} <span style={{ fontSize: 14, color: '#FFD700' }}>★</span>
                                </div>
                                <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{fmt(s.total)} évaluation{s.total !== '1' ? 's' : ''}</div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Filters */}
            <div className="filters">
                <select className="filter-select" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}>
                    <option value="">Tous les services</option>
                    <option value="ride">Courses</option>
                    <option value="rental">Locations</option>
                    <option value="delivery">Livraisons</option>
                </select>
                <select className="filter-select" value={starFilter} onChange={e => { setStarFilter(e.target.value); setPage(1); }}>
                    <option value="">Toutes les notes</option>
                    {[5, 4, 3, 2, 1].map(s => (
                        <option key={s} value={s}>{s} étoile{s > 1 ? 's' : ''}</option>
                    ))}
                </select>
                <button className="btn-secondary" onClick={load}>↻ Actualiser</button>
                {(typeFilter || starFilter) && (
                    <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => { setTypeFilter(''); setStarFilter(''); setPage(1); }}>✕ Réinitialiser</button>
                )}
                <span style={{ fontSize: 12, color: '#888', marginLeft: 'auto' }}>{total} évaluation{total !== 1 ? 's' : ''}</span>
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
                {/* Table */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Noteur</th>
                                    <th>Noté</th>
                                    <th>Service</th>
                                    <th>Note</th>
                                    <th>Commentaire</th>
                                    <th>Date</th>
                                    <th>Statut</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32 }}>Chargement…</td></tr>
                                ) : ratings.length === 0 ? (
                                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>Aucune évaluation</td></tr>
                                ) : ratings.map(r => {
                                    const meta = SERVICE_META[r.service_type] || {};
                                    return (
                                        <tr
                                            key={r.id}
                                            className={selected?.id === r.id ? 'selected' : ''}
                                            onClick={() => setSelected(r)}
                                            style={{ opacity: r.is_hidden ? 0.5 : 1, cursor: 'pointer' }}
                                        >
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{r.rater?.name || '—'}</div>
                                                <div style={{ fontSize: 11, color: '#aaa' }}>{r.rater?.phone}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{r.ratedUser?.name || '—'}</div>
                                                <div style={{ fontSize: 11, color: '#aaa' }}>{r.ratedUser?.phone}</div>
                                            </td>
                                            <td>
                                                <span style={{ background: meta.bg, color: meta.color, padding: '3px 10px', borderRadius: 8, fontWeight: 700, fontSize: 12 }}>
                                                    {meta.label || r.service_type}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{ color: STAR_COLORS[r.rating], fontWeight: 800, fontSize: 15, letterSpacing: 1 }}>
                                                    {stars(r.rating)}
                                                </span>
                                            </td>
                                            <td style={{ maxWidth: 180 }}>
                                                <div style={{ fontSize: 12, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {r.comment || <span style={{ color: '#ccc' }}>—</span>}
                                                </div>
                                                {r.categories?.length > 0 && (
                                                    <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>{r.categories.join(', ')}</div>
                                                )}
                                            </td>
                                            <td style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>{fmtDate(r.created_at)}</td>
                                            <td>
                                                <span style={{
                                                    background: r.is_hidden ? '#FFEBEE' : '#E8F5E9',
                                                    color: r.is_hidden ? '#C62828' : '#2E7D32',
                                                    padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                                                }}>
                                                    {r.is_hidden ? 'Masqué' : 'Visible'}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button
                                                        className="btn-secondary"
                                                        style={{ fontSize: 11, padding: '4px 8px' }}
                                                        onClick={e => { e.stopPropagation(); toggleHide(r.id); }}
                                                    >
                                                        {r.is_hidden ? '👁 Afficher' : '🙈 Masquer'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pages > 1 && (
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                            <button className="btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹ Préc.</button>
                            <span style={{ padding: '6px 14px', fontSize: 13, fontWeight: 600 }}>{page} / {pages}</span>
                            <button className="btn-secondary" disabled={page === pages} onClick={() => setPage(p => p + 1)}>Suiv. ›</button>
                        </div>
                    )}
                </div>

                {/* Detail panel */}
                {selected && (
                    <div style={{ width: 300, flexShrink: 0 }}>
                        <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <span style={{ fontWeight: 800, fontSize: 15, color: '#1C2E4A' }}>Détail</span>
                                <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#aaa' }} onClick={() => setSelected(null)}>✕</button>
                            </div>

                            <div style={{ marginBottom: 10 }}>
                                <div style={{ fontSize: 11, color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Noteur</div>
                                <div style={{ fontWeight: 700 }}>{selected.rater?.name || '—'}</div>
                                <div style={{ fontSize: 12, color: '#aaa' }}>{selected.rater?.phone}</div>
                            </div>

                            <div style={{ marginBottom: 10 }}>
                                <div style={{ fontSize: 11, color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Noté</div>
                                <div style={{ fontWeight: 700 }}>{selected.ratedUser?.name || '—'}</div>
                                <div style={{ fontSize: 12, color: '#aaa' }}>{selected.ratedUser?.phone}</div>
                            </div>

                            <div style={{ marginBottom: 10 }}>
                                <div style={{ fontSize: 11, color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Note</div>
                                <span style={{ color: STAR_COLORS[selected.rating], fontWeight: 800, fontSize: 22 }}>
                                    {stars(selected.rating)}
                                </span>
                                <span style={{ fontSize: 13, color: '#888', marginLeft: 8 }}>{selected.rating}/5</span>
                            </div>

                            {selected.categories?.length > 0 && (
                                <div style={{ marginBottom: 10 }}>
                                    <div style={{ fontSize: 11, color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Catégories</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                        {selected.categories.map(c => (
                                            <span key={c} style={{ background: '#F0F4FF', color: '#1565C0', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{c}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selected.comment && (
                                <div style={{ marginBottom: 16 }}>
                                    <div style={{ fontSize: 11, color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Commentaire</div>
                                    <div style={{ fontSize: 13, color: '#333', lineHeight: 1.5, background: '#F8F9FA', borderRadius: 8, padding: '8px 12px' }}>{selected.comment}</div>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                                <button
                                    className={selected.is_hidden ? 'btn-primary' : 'btn-secondary'}
                                    style={{ width: '100%' }}
                                    onClick={() => { toggleHide(selected.id); setSelected(prev => ({ ...prev, is_hidden: !prev.is_hidden })); }}
                                >
                                    {selected.is_hidden ? '👁 Rendre visible' : '🙈 Masquer'}
                                </button>
                                <button
                                    className="btn-secondary"
                                    style={{ width: '100%', color: '#C62828', borderColor: '#FFCDD2' }}
                                    onClick={() => deleteRating(selected.id)}
                                >
                                    🗑 Supprimer définitivement
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
