import { useState, useEffect, useCallback } from 'react';
import { Shield, Plus, PencilSimple, Trash, Check, X, Users } from '@phosphor-icons/react';
import './Rides.css';
import api from '../api';

const PERM_GROUPS = [
    { group: 'Général',        perms: ['dashboard', 'users'] },
    { group: 'Services',       perms: ['rides', 'rentals', 'deliveries', 'orders', 'products', 'car_listings'] },
    { group: 'Vérifications',  perms: ['kyc', 'ratings'] },
    { group: 'Support',        perms: ['support'] },
    { group: 'Finance',        perms: ['wallet', 'card_printing', 'coupons', 'commissions', 'cashback'] },
    { group: 'Système',        perms: ['settings', 'employees', 'roles'] },
];

const PERM_LABELS = {
    dashboard: 'Tableau de bord',    users: 'Utilisateurs',
    rides: 'Courses',                rentals: 'Location véhicules',
    deliveries: 'Livraisons',        orders: 'Commandes',
    products: 'Produits',            car_listings: 'Annonces auto',
    kyc: 'Vérifications KYC',        ratings: 'Évaluations',
    support: 'Support client',       wallet: 'Portefeuilles',
    card_printing: 'Cartes NFC',     coupons: 'Coupons & promos',
    commissions: 'Commissions',      cashback: 'Cashback & points',
    settings: 'Paramètres système',  employees: 'Gestion employés',
    roles: 'Gestion des rôles',
};

const COLORS = ['#1565C0','#0D9488','#7C3AED','#DC2626','#D97706','#16A34A','#0284C7','#9D174D','#374151'];

const blank = () => ({ name: '', description: '', color: '#1565C0', permissions: [] });

export default function Roles() {
    const [roles,   setRoles]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [form,    setForm]    = useState(null);   // null = closed, obj = open
    const [saving,  setSaving]  = useState(false);
    const [deleting,setDeleting]= useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/staff/roles');
            setRoles(data.roles || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const togglePerm = (key) => {
        setForm(f => ({
            ...f,
            permissions: f.permissions.includes(key)
                ? f.permissions.filter(p => p !== key)
                : [...f.permissions, key],
        }));
    };

    const toggleGroup = (perms) => {
        const all = perms.every(p => form.permissions.includes(p));
        setForm(f => ({
            ...f,
            permissions: all
                ? f.permissions.filter(p => !perms.includes(p))
                : [...new Set([...f.permissions, ...perms])],
        }));
    };

    const save = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            if (form.id) {
                const { data } = await api.put(`/staff/roles/${form.id}`, form);
                setRoles(r => r.map(x => x.id === form.id ? data.role : x));
            } else {
                const { data } = await api.post('/staff/roles', form);
                setRoles(r => [...r, data.role]);
            }
            setForm(null);
        } catch (e) { alert(e.response?.data?.error || 'Erreur'); }
        finally { setSaving(false); }
    };

    const del = async (role) => {
        if (!confirm(`Supprimer le rôle "${role.name}" ?`)) return;
        setDeleting(role.id);
        try {
            await api.delete(`/staff/roles/${role.id}`);
            setRoles(r => r.filter(x => x.id !== role.id));
        } catch (e) { alert(e.response?.data?.error || 'Erreur'); }
        finally { setDeleting(null); }
    };

    return (
        <div className="page-wrap">
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Shield size={24} color="#7C3AED" />
                    <h1 className="page-title">Rôles & Permissions</h1>
                </div>
                <button
                    onClick={() => setForm(blank())}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
                >
                    <Plus size={15} />Nouveau rôle
                </button>
            </div>

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Chargement…</div>
            ) : (
                <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {roles.map(role => (
                        <div key={role.id} style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                            {/* Color dot */}
                            <div style={{ width: 44, height: 44, borderRadius: 13, background: (role.color || '#1565C0') + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Shield size={22} color={role.color || '#1565C0'} weight="fill" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontWeight: 700, fontSize: 15, color: '#1C2E4A' }}>{role.name}</span>
                                    {role.is_system && <span style={{ background: '#F3F4F6', color: '#6B7280', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>Système</span>}
                                    <span style={{ background: '#EFF6FF', color: '#1565C0', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>
                                        <Users size={10} style={{ marginRight: 3 }} />{role.staffMembers?.length || 0} employé{(role.staffMembers?.length || 0) !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                {role.description && <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 6px' }}>{role.description}</p>}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {(role.permissions || []).map(p => (
                                        <span key={p} style={{ background: (role.color || '#1565C0') + '12', color: role.color || '#1565C0', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>
                                            {PERM_LABELS[p] || p}
                                        </span>
                                    ))}
                                    {(role.permissions || []).length === 0 && <span style={{ fontSize: 11, color: '#9CA3AF' }}>Aucune permission</span>}
                                </div>
                            </div>
                            {!role.is_system && (
                                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                    <button onClick={() => setForm({ ...role })} style={{ background: '#EFF6FF', color: '#1565C0', border: 'none', borderRadius: 8, padding: '7px 12px', cursor: 'pointer' }}>
                                        <PencilSimple size={15} />
                                    </button>
                                    <button onClick={() => del(role)} disabled={deleting === role.id} style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 8, padding: '7px 12px', cursor: 'pointer' }}>
                                        <Trash size={15} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ── Role form modal ── */}
            {form && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1C2E4A' }}>{form.id ? 'Modifier le rôle' : 'Nouveau rôle'}</h2>
                            <button onClick={() => setForm(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={20} color="#6B7280" /></button>
                        </div>
                        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Name */}
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>Nom du rôle *</label>
                                <input
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="Ex: Agent support, Manager livraisons…"
                                    style={{ width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '10px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>
                            {/* Description */}
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>Description (optionnel)</label>
                                <input
                                    value={form.description || ''}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Responsabilités du rôle…"
                                    style={{ width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '10px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>
                            {/* Color */}
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 8 }}>Couleur</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {COLORS.map(c => (
                                        <div
                                            key={c}
                                            onClick={() => setForm(f => ({ ...f, color: c }))}
                                            style={{ width: 28, height: 28, borderRadius: 8, background: c, cursor: 'pointer', border: form.color === c ? '3px solid #1C2E4A' : '2px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            {form.color === c && <Check size={13} color="#fff" weight="bold" />}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Permissions */}
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 10 }}>Permissions</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    {PERM_GROUPS.map(({ group, perms }) => {
                                        const allOn = perms.every(p => form.permissions.includes(p));
                                        return (
                                            <div key={group}>
                                                <div
                                                    onClick={() => toggleGroup(perms)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}
                                                >
                                                    <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${form.color || '#1565C0'}`, background: allOn ? form.color || '#1565C0' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {allOn && <Check size={10} color="#fff" weight="bold" />}
                                                    </div>
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5 }}>{group}</span>
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingLeft: 24 }}>
                                                    {perms.map(p => (
                                                        <div
                                                            key={p}
                                                            onClick={() => togglePerm(p)}
                                                            style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '5px 10px', borderRadius: 8, border: `1.5px solid ${form.permissions.includes(p) ? form.color || '#1565C0' : '#E5E7EB'}`, background: form.permissions.includes(p) ? (form.color || '#1565C0') + '12' : '#fff' }}
                                                        >
                                                            <div style={{ width: 14, height: 14, borderRadius: 3, border: `2px solid ${form.permissions.includes(p) ? form.color || '#1565C0' : '#D1D5DB'}`, background: form.permissions.includes(p) ? form.color || '#1565C0' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                {form.permissions.includes(p) && <Check size={9} color="#fff" weight="bold" />}
                                                            </div>
                                                            <span style={{ fontSize: 12, fontWeight: 600, color: form.permissions.includes(p) ? form.color || '#1565C0' : '#6B7280' }}>{PERM_LABELS[p] || p}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '16px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button onClick={() => setForm(null)} style={{ padding: '9px 18px', border: '1.5px solid #E5E7EB', borderRadius: 10, background: '#fff', cursor: 'pointer', fontWeight: 600, color: '#374151' }}>Annuler</button>
                            <button onClick={save} disabled={saving || !form.name.trim()} style={{ padding: '9px 22px', background: form.color || '#7C3AED', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
                                {saving ? 'Enregistrement…' : 'Enregistrer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
