import { useState, useEffect } from 'react';
import api from '../api';
import './Rides.css';

const EMPTY_FORM = {
    code:               '',
    type:               'percentage',
    value:              '',
    min_fare:           '',
    max_discount:       '',
    max_uses:           '',
    max_uses_per_user:  1,
    expires_at:         '',
    description:        '',
    is_active:          true,
};

function Coupons() {
    const [coupons,    setCoupons]    = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [showModal,  setShowModal]  = useState(false);
    const [editTarget, setEditTarget] = useState(null);   // null = create, id = edit
    const [form,       setForm]       = useState(EMPTY_FORM);
    const [saving,     setSaving]     = useState(false);
    const [error,      setError]      = useState('');

    useEffect(() => { fetchCoupons(); }, []);

    const fetchCoupons = async () => {
        setLoading(true);
        try {
            const res = await api.get('/coupons/admin');
            setCoupons(res.data.coupons ?? res.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const openCreate = () => {
        setEditTarget(null);
        setForm(EMPTY_FORM);
        setError('');
        setShowModal(true);
    };

    const openEdit = (c) => {
        setEditTarget(c.id);
        setForm({
            code:              c.code,
            type:              c.type,
            value:             String(c.value),
            min_fare:          c.min_fare != null ? String(c.min_fare) : '',
            max_discount:      c.max_discount != null ? String(c.max_discount) : '',
            max_uses:          c.max_uses != null ? String(c.max_uses) : '',
            max_uses_per_user: c.max_uses_per_user,
            expires_at:        c.expires_at ? c.expires_at.substring(0, 10) : '',
            description:       c.description ?? '',
            is_active:         c.is_active,
        });
        setError('');
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.code.trim() || !form.value) { setError('Code et valeur requis'); return; }
        setSaving(true);
        setError('');
        try {
            const payload = {
                code:              form.code.trim().toUpperCase(),
                type:              form.type,
                value:             parseFloat(form.value),
                min_fare:          form.min_fare      ? parseFloat(form.min_fare)      : null,
                max_discount:      form.max_discount  ? parseFloat(form.max_discount)  : null,
                max_uses:          form.max_uses       ? parseInt(form.max_uses)         : null,
                max_uses_per_user: parseInt(form.max_uses_per_user) || 1,
                expires_at:        form.expires_at || null,
                description:       form.description.trim() || null,
                is_active:         form.is_active,
            };
            if (editTarget) {
                await api.put(`/coupons/admin/${editTarget}`, payload);
            } else {
                await api.post('/coupons/admin', payload);
            }
            setShowModal(false);
            fetchCoupons();
        } catch (e) {
            setError(e.response?.data?.error || 'Erreur lors de l\'enregistrement');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, code) => {
        if (!window.confirm(`Supprimer le coupon « ${code} » ?`)) return;
        try {
            await api.delete(`/coupons/admin/${id}`);
            fetchCoupons();
        } catch (e) { alert(e.response?.data?.error || 'Erreur'); }
    };

    const handleToggle = async (id, current) => {
        try {
            await api.put(`/coupons/admin/${id}`, { is_active: !current });
            fetchCoupons();
        } catch (e) { alert(e.response?.data?.error || 'Erreur'); }
    };

    const fmt = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
    const typeLabel = (t) => ({ free_ride: 'Gratuit', percentage: '%', fixed: 'Fixe' }[t] ?? t);
    const valueLabel = (c) => {
        if (c.type === 'free_ride') return '100% offert';
        if (c.type === 'percentage') return `–${c.value}%`;
        return `–${c.value} XAF`;
    };

    return (
        <div className="page-container">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>Codes Promo</h1>
                <button className="btn-approve" onClick={openCreate}>+ Nouveau coupon</button>
            </div>

            {loading ? (
                <div className="loading-spinner" />
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Type</th>
                                <th>Valeur</th>
                                <th>Utilisations</th>
                                <th>Expire le</th>
                                <th>Statut</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {coupons.length === 0 ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#aaa', padding: '32px' }}>Aucun coupon</td></tr>
                            ) : coupons.map(c => (
                                <tr key={c.id}>
                                    <td><strong style={{ letterSpacing: 1 }}>{c.code}</strong></td>
                                    <td>
                                        <span style={{
                                            display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                            background: c.type === 'free_ride' ? '#d4edda' : c.type === 'percentage' ? '#cce5ff' : '#fff3cd',
                                            color:      c.type === 'free_ride' ? '#155724' : c.type === 'percentage' ? '#004085' : '#856404',
                                        }}>
                                            {typeLabel(c.type)}
                                        </span>
                                    </td>
                                    <td>{valueLabel(c)}</td>
                                    <td>
                                        {c.used_count ?? 0}
                                        {c.max_uses != null ? ` / ${c.max_uses}` : ' / ∞'}
                                    </td>
                                    <td>{fmt(c.expires_at)}</td>
                                    <td>
                                        <button
                                            style={{
                                                display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                                                fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer',
                                                background: c.is_active ? '#d4edda' : '#f8d7da',
                                                color:      c.is_active ? '#155724' : '#721c24',
                                            }}
                                            onClick={() => handleToggle(c.id, c.is_active)}
                                            title="Cliquer pour basculer"
                                        >
                                            {c.is_active ? 'Actif' : 'Désactivé'}
                                        </button>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => openEdit(c)}>Modifier</button>
                                            <button className="btn-danger"    style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => handleDelete(c.id, c.code)}>Supprimer</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editTarget ? 'Modifier le coupon' : 'Nouveau coupon'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        <div className="modal-body">
                            {error && <div className="error-banner">{error}</div>}

                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Code *</label>
                                    <input
                                        value={form.code}
                                        onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                                        placeholder="ex: BIENVENUE50"
                                        style={{ textTransform: 'uppercase', letterSpacing: 1 }}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Type *</label>
                                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                                        <option value="percentage">Pourcentage (%)</option>
                                        <option value="fixed">Montant fixe (XAF)</option>
                                        <option value="free_ride">Trajet gratuit</option>
                                    </select>
                                </div>

                                {form.type !== 'free_ride' && (
                                    <div className="form-group">
                                        <label>Valeur * {form.type === 'percentage' ? '(%)' : '(XAF)'}</label>
                                        <input type="number" min="0" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="ex: 20" />
                                    </div>
                                )}

                                <div className="form-group">
                                    <label>Montant minimum (XAF)</label>
                                    <input type="number" min="0" value={form.min_fare} onChange={e => setForm(f => ({ ...f, min_fare: e.target.value }))} placeholder="Laisser vide = aucun" />
                                </div>

                                {form.type === 'percentage' && (
                                    <div className="form-group">
                                        <label>Remise max (XAF)</label>
                                        <input type="number" min="0" value={form.max_discount} onChange={e => setForm(f => ({ ...f, max_discount: e.target.value }))} placeholder="Laisser vide = illimité" />
                                    </div>
                                )}

                                <div className="form-group">
                                    <label>Utilisations totales max</label>
                                    <input type="number" min="1" value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} placeholder="Laisser vide = illimité" />
                                </div>

                                <div className="form-group">
                                    <label>Max par utilisateur</label>
                                    <input type="number" min="1" value={form.max_uses_per_user} onChange={e => setForm(f => ({ ...f, max_uses_per_user: e.target.value }))} />
                                </div>

                                <div className="form-group">
                                    <label>Date d'expiration</label>
                                    <input type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
                                </div>

                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label>Description (affichée à l'utilisateur)</label>
                                    <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="ex: –20% sur votre prochain trajet" />
                                </div>

                                <div className="form-group" style={{ gridColumn: '1 / -1', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} style={{ width: 18, height: 18 }} />
                                    <label htmlFor="is_active" style={{ margin: 0 }}>Actif (utilisable immédiatement)</label>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                            <button className="btn-approve" onClick={handleSave} disabled={saving}>
                                {saving ? 'Enregistrement…' : (editTarget ? 'Mettre à jour' : 'Créer')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Coupons;
