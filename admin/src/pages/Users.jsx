import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import './Rides.css';

const SERVICE_LABELS = {
    rider:        { label: 'Passager',    color: '#0984E3', bg: '#EBF5FB' },
    renter:       { label: 'Locataire',   color: '#00B894', bg: '#EAFAF1' },
    driver:       { label: 'Chauffeur',   color: '#6C5CE7', bg: '#F3F0FD' },
    rental_owner: { label: 'Loc. auto',   color: '#0288D1', bg: '#E3F2FD' },
    fleet_owner:  { label: 'Flotte',      color: '#FFA726', bg: '#FFF8E1' },
    partner:      { label: 'Partenaire',  color: '#00897B', bg: '#E0F2F1' },
    store_owner:  { label: 'Boutique',    color: '#7B1FA2', bg: '#F3E5F5' },
    car_seller:   { label: 'Vendeur',     color: '#E53935', bg: '#FFEBEE' },
    admin:        { label: 'Admin',       color: '#D63031', bg: '#FFEAEA' },
};

const KYC_STATUS = {
    approved:              { label: '✓ Approuvé',     color: '#00B894' },
    submitted:             { label: '⏳ Soumis',       color: '#FFA726' },
    under_review:          { label: '🔍 En revue',    color: '#0984E3' },
    appointment_scheduled: { label: '📅 RDV planifié', color: '#6C5CE7' },
    rejected:              { label: '✗ Refusé',       color: '#D63031' },
};

const KYC_MAP = {
    driver:       'driver',
    rental_owner: 'rental_owner',
    fleet_owner:  'fleet_owner',
    partner:      'partner',
    store_owner:  'store_owner',
    car_seller:   'car_seller',
};

const ROLE_OPTIONS = [
    { value: '',             label: 'Tous les rôles' },
    { value: 'rider',        label: 'Passager' },
    { value: 'driver',       label: 'Chauffeur' },
    { value: 'rental_owner', label: 'Propriétaire location' },
    { value: 'fleet_owner',  label: 'Propriétaire flotte' },
    { value: 'partner',      label: 'Partenaire' },
    { value: 'store_owner',  label: 'Boutique' },
    { value: 'admin',        label: 'Admin' },
];

export default function Users() {
    const [users,         setUsers]         = useState([]);
    const [loading,       setLoading]       = useState(true);
    const [roleFilter,    setRoleFilter]    = useState('');
    const [search,        setSearch]        = useState('');
    const [searchInput,   setSearchInput]   = useState('');
    const [page,          setPage]          = useState(1);
    const [pagination,    setPagination]    = useState(null);
    const [actionLoading, setActionLoading] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, limit: 20 };
            if (roleFilter) params.role = roleFilter;
            if (search) params.search = search;
            const res = await api.get('/admin/users', { params });
            setUsers(res.data.users);
            setPagination(res.data.pagination);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [page, roleFilter, search]);

    useEffect(() => { load(); }, [load]);

    const toggleStatus = async (user) => {
        setActionLoading(user.id);
        try {
            await api.put(`/admin/users/${user.id}/status`, { is_active: !user.is_active });
            load();
        } catch (e) { alert('Erreur : ' + (e.response?.data?.error || e.message)); }
        finally { setActionLoading(null); }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setSearch(searchInput);
        setPage(1);
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Utilisateurs</h1>
                    <p className="page-subtitle">Gestion des comptes · Services actifs et statut KYC</p>
                </div>
            </div>

            {/* Filters */}
            <div className="filters">
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1, maxWidth: 480 }}>
                    <input
                        className="search-input"
                        placeholder="Rechercher par nom, email ou téléphone…"
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                    />
                    <button type="submit" className="btn-secondary">Chercher</button>
                    {search && (
                        <button type="button" className="btn-secondary" onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}>✕</button>
                    )}
                </form>
                <select className="filter-select" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
                    {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {pagination && (
                    <span style={{ fontSize: 12, color: '#888', marginLeft: 'auto' }}>{pagination.total} utilisateur{pagination.total !== 1 ? 's' : ''}</span>
                )}
            </div>

            {loading ? <div className="loading">Chargement des utilisateurs…</div> : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Utilisateur</th>
                                <th>Contact</th>
                                <th>Services actifs</th>
                                <th>KYC</th>
                                <th>Note</th>
                                <th>Compte</th>
                                <th>Inscrit le</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 && (
                                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#888', padding: 32 }}>Aucun utilisateur trouvé</td></tr>
                            )}
                            {users.map(user => {
                                const services    = user.active_services || [user.role];
                                const kycServices = Object.entries(KYC_MAP).filter(([svc]) => services.includes(svc));

                                return (
                                    <tr key={user.id}>
                                        <td>
                                            <div style={{ fontWeight: 700 }}>{user.name}</div>
                                            {user.profile_photo && <div style={{ fontSize: 10, color: '#0984E3' }}>a une photo</div>}
                                        </td>
                                        <td>
                                            <div style={{ fontSize: 12 }}>{user.email}</div>
                                            <div style={{ fontSize: 12, color: '#666' }}>{user.phone}</div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                                {services.map(svc => {
                                                    const meta = SERVICE_LABELS[svc];
                                                    if (!meta) return null;
                                                    return (
                                                        <span key={svc} style={{
                                                            background: meta.bg, color: meta.color,
                                                            border: `1px solid ${meta.color}44`,
                                                            borderRadius: 6, padding: '2px 7px',
                                                            fontSize: 11, fontWeight: 700,
                                                        }}>
                                                            {meta.label}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                        <td>
                                            {kycServices.length === 0 ? (
                                                <span style={{ color: '#ccc', fontSize: 12 }}>—</span>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                    {kycServices.map(([svc, kycKey]) => {
                                                        const status  = user.kyc?.[kycKey];
                                                        const meta    = status ? KYC_STATUS[status] : null;
                                                        const svcMeta = SERVICE_LABELS[svc];
                                                        return (
                                                            <div key={svc} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                                <span style={{ fontSize: 10, color: svcMeta?.color, fontWeight: 700, minWidth: 56 }}>{svcMeta?.label}</span>
                                                                {meta
                                                                    ? <span style={{ fontSize: 11, color: meta.color, fontWeight: 600 }}>{meta.label}</span>
                                                                    : <span style={{ fontSize: 11, color: '#ccc' }}>—</span>
                                                                }
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <span style={{ fontWeight: 600 }}>⭐ {parseFloat(user.rating || 5).toFixed(1)}</span>
                                        </td>
                                        <td>
                                            <span style={{ color: user.is_active ? '#00B894' : '#D63031', fontWeight: 700 }}>
                                                {user.is_active ? 'Actif' : 'Inactif'}
                                            </span>
                                            {user.is_verified && <div style={{ fontSize: 10, color: '#0984E3' }}>✓ Vérifié</div>}
                                        </td>
                                        <td style={{ fontSize: 12, color: '#888' }}>
                                            {new Date(user.created_at).toLocaleDateString('fr-FR')}
                                        </td>
                                        <td>
                                            {user.role !== 'admin' && (
                                                <button
                                                    className={user.is_active ? 'btn-danger btn-sm' : 'btn-approve btn-sm'}
                                                    onClick={() => toggleStatus(user)}
                                                    disabled={actionLoading === user.id}
                                                >
                                                    {actionLoading === user.id ? '…' : user.is_active ? 'Désactiver' : 'Activer'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {pagination && (
                <div className="pagination">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Précédent</button>
                    <span>Page {page} / {pagination.totalPages} ({pagination.total} total)</span>
                    <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Suivant →</button>
                </div>
            )}
        </div>
    );
}
