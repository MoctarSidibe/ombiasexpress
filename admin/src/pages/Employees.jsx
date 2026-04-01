import { useState, useEffect, useCallback } from 'react';
import {
    UsersFour, Plus, PencilSimple, Trash, Lock, Check,
    X, Eye, EyeSlash, UserCircle,
} from '@phosphor-icons/react';
import './Rides.css';
import api from '../api';

const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const blankStaff = () => ({
    name: '', email: '', phone: '', password: '', role_id: '', department: '', notes: '',
});

// ── Password reset modal ──────────────────────────────────────────────────────
function ResetPasswordModal({ staff, onClose }) {
    const [pw, setPw]       = useState('');
    const [show, setShow]   = useState(false);
    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (pw.length < 6) return;
        setSaving(true);
        try {
            await api.put(`/staff/staff/${staff.id}/password`, { password: pw });
            alert('Mot de passe mis à jour');
            onClose();
        } catch (e) { alert(e.response?.data?.error || 'Erreur'); }
        finally { setSaving(false); }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: '#fff', borderRadius: 16, width: 380, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#1C2E4A' }}>Nouveau mot de passe</h3>
                <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6B7280' }}>{staff.user?.name} ({staff.user?.email})</p>
                <div style={{ position: 'relative' }}>
                    <input
                        type={show ? 'text' : 'password'}
                        value={pw}
                        onChange={e => setPw(e.target.value)}
                        placeholder="Min. 6 caractères"
                        style={{ width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '10px 40px 10px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                    />
                    <button onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                        {show ? <EyeSlash size={16} /> : <Eye size={16} />}
                    </button>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '9px 18px', border: '1.5px solid #E5E7EB', borderRadius: 10, background: '#fff', cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
                    <button onClick={save} disabled={pw.length < 6 || saving} style={{ padding: '9px 18px', background: '#1565C0', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, opacity: pw.length < 6 ? 0.5 : 1 }}>
                        {saving ? 'Enregistrement…' : 'Mettre à jour'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Staff form modal ──────────────────────────────────────────────────────────
function StaffModal({ initial, roles, onClose, onSaved }) {
    const isEdit = !!initial?.id;
    const [form, setForm] = useState(isEdit
        ? { role_id: initial.role_id || initial.role?.id || '', department: initial.department || '', notes: initial.notes || '', is_active: initial.is_active }
        : blankStaff()
    );
    const [showPw, setShowPw] = useState(false);
    const [saving, setSaving] = useState(false);

    const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

    const save = async () => {
        setSaving(true);
        try {
            if (isEdit) {
                const { data } = await api.put(`/staff/staff/${initial.id}`, {
                    role_id:    form.role_id,
                    department: form.department,
                    notes:      form.notes,
                    is_active:  form.is_active,
                });
                onSaved(data.staff);
            } else {
                const { data } = await api.post('/staff/staff', form);
                onSaved(data.staff);
            }
            onClose();
        } catch (e) { alert(e.response?.data?.error || 'Erreur'); }
        finally { setSaving(false); }
    };

    const inputStyle = { width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '10px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
    const labelStyle = { fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1C2E4A' }}>{isEdit ? 'Modifier l\'employé' : 'Nouvel employé'}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#6B7280" /></button>
                </div>
                <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {!isEdit && (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={labelStyle}>Nom complet *</label>
                                    <input value={form.name} onChange={f('name')} placeholder="Jean Dupont" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Téléphone *</label>
                                    <input value={form.phone} onChange={f('phone')} placeholder="+241 XX XXX XXX" style={inputStyle} />
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Email *</label>
                                <input type="email" value={form.email} onChange={f('email')} placeholder="jean.dupont@ombia.ga" style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Mot de passe *</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPw ? 'text' : 'password'}
                                        value={form.password} onChange={f('password')}
                                        placeholder="Min. 6 caractères"
                                        style={{ ...inputStyle, paddingRight: 40 }}
                                    />
                                    <button onClick={() => setShowPw(s => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                                        {showPw ? <EyeSlash size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                    <div>
                        <label style={labelStyle}>Rôle *</label>
                        {roles.length === 0 ? (
                            <div style={{ padding: '10px 14px', background: '#FFF7ED', border: '1.5px solid #FED7AA', borderRadius: 10, fontSize: 13, color: '#C2410C' }}>
                                Aucun rôle disponible. Créez d'abord un rôle dans <strong>Rôles &amp; Permissions</strong> avant d'ajouter un employé.
                            </div>
                        ) : (
                            <select value={form.role_id} onChange={f('role_id')} style={{ ...inputStyle, background: '#fff' }}>
                                <option value="">— Choisir un rôle —</option>
                                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        )}
                    </div>
                    <div>
                        <label style={labelStyle}>Département</label>
                        <input value={form.department} onChange={f('department')} placeholder="Ex: Support, Opérations, Finance…" style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Notes internes</label>
                        <textarea value={form.notes} onChange={f('notes')} rows={2} placeholder="Informations complémentaires…" style={{ ...inputStyle, resize: 'vertical' }} />
                    </div>
                    {isEdit && (
                        <div
                            onClick={() => setForm(prev => ({ ...prev, is_active: !prev.is_active }))}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: 12, borderRadius: 10, border: '1.5px solid #E5E7EB', userSelect: 'none' }}
                        >
                            <div style={{ width: 40, height: 22, borderRadius: 11, background: form.is_active ? '#16A34A' : '#D1D5DB', position: 'relative', transition: 'background .2s' }}>
                                <div style={{ width: 18, height: 18, borderRadius: 9, background: '#fff', position: 'absolute', top: 2, left: form.is_active ? 20 : 2, transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                            </div>
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{form.is_active ? 'Compte actif' : 'Compte désactivé'}</span>
                        </div>
                    )}
                </div>
                <div style={{ padding: '16px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '9px 18px', border: '1.5px solid #E5E7EB', borderRadius: 10, background: '#fff', cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
                    <button onClick={save} disabled={saving || !form.role_id} style={{ padding: '9px 22px', background: '#1565C0', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, opacity: !form.role_id ? 0.5 : 1 }}>
                        {saving ? 'Enregistrement…' : isEdit ? 'Mettre à jour' : 'Créer l\'employé'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Employees() {
    const [staff,   setStaff]   = useState([]);
    const [roles,   setRoles]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal,   setModal]   = useState(null);   // null | 'create' | staffObj
    const [resetPw, setResetPw] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [s, r] = await Promise.all([
                api.get('/staff/staff'),
                api.get('/staff/roles'),
            ]);
            setStaff(s.data.staff || []);
            setRoles(r.data.roles || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleSaved = (updated) => {
        setStaff(prev => {
            const exists = prev.find(s => s.id === updated.id);
            return exists ? prev.map(s => s.id === updated.id ? updated : s) : [updated, ...prev];
        });
    };

    const del = async (member) => {
        if (!confirm(`Supprimer l'accès de "${member.user?.name}" ? Cette action est irréversible.`)) return;
        try {
            await api.delete(`/staff/staff/${member.id}`);
            setStaff(prev => prev.filter(s => s.id !== member.id));
        } catch (e) { alert(e.response?.data?.error || 'Erreur'); }
    };

    const activeCount   = staff.filter(s => s.is_active).length;
    const inactiveCount = staff.filter(s => !s.is_active).length;

    return (
        <div className="page-wrap">
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <UsersFour size={24} color="#0D9488" />
                    <h1 className="page-title">Employés</h1>
                    <span style={{ background: '#CCFBF1', color: '#0D9488', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>{activeCount} actifs</span>
                    {inactiveCount > 0 && <span style={{ background: '#F3F4F6', color: '#6B7280', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>{inactiveCount} inactifs</span>}
                </div>
                <button
                    onClick={() => setModal('create')}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0D9488', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
                >
                    <Plus size={15} />Nouvel employé
                </button>
            </div>

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Chargement…</div>
            ) : staff.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' }}>
                    <UsersFour size={56} style={{ opacity: 0.3, marginBottom: 12 }} />
                    <p style={{ fontSize: 16, fontWeight: 600 }}>Aucun employé</p>
                    <p style={{ fontSize: 13 }}>Créez votre premier compte employé pour commencer</p>
                    <button onClick={() => setModal('create')} style={{ marginTop: 16, background: '#0D9488', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 22px', cursor: 'pointer', fontWeight: 700 }}>
                        Créer un employé
                    </button>
                </div>
            ) : (
                <div style={{ padding: '0 24px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #F3F4F6' }}>
                                {['Employé', 'Rôle', 'Département', 'Permissions', 'Statut', 'Créé le', 'Actions'].map(h => (
                                    <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {staff.map(member => (
                                <tr key={member.id} style={{ borderBottom: '1px solid #F9FAFB', opacity: member.is_active ? 1 : 0.55 }}>
                                    <td style={{ padding: '14px 12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 38, height: 38, borderRadius: 12, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {member.user?.profile_photo
                                                    ? <img src={member.user.profile_photo} alt="" style={{ width: 38, height: 38, borderRadius: 12, objectFit: 'cover' }} />
                                                    : <UserCircle size={22} color="#9CA3AF" />
                                                }
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: 13, color: '#1C2E4A' }}>{member.user?.name}</div>
                                                <div style={{ fontSize: 11, color: '#9CA3AF' }}>{member.user?.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '14px 12px' }}>
                                        <span style={{ background: (member.role?.color || '#1565C0') + '18', color: member.role?.color || '#1565C0', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                                            {member.role?.name || '—'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 12px', fontSize: 13, color: '#6B7280' }}>{member.department || '—'}</td>
                                    <td style={{ padding: '14px 12px' }}>
                                        <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>{(member.role?.permissions || []).length} permission{(member.role?.permissions || []).length !== 1 ? 's' : ''}</span>
                                    </td>
                                    <td style={{ padding: '14px 12px' }}>
                                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: member.is_active ? '#DCFCE7' : '#F3F4F6', color: member.is_active ? '#16A34A' : '#9CA3AF' }}>
                                            {member.is_active ? 'Actif' : 'Inactif'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 12px', fontSize: 12, color: '#9CA3AF' }}>{fmtDate(member.created_at)}</td>
                                    <td style={{ padding: '14px 12px' }}>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button onClick={() => setModal(member)} title="Modifier" style={{ background: '#EFF6FF', color: '#1565C0', border: 'none', borderRadius: 7, padding: '6px 10px', cursor: 'pointer' }}>
                                                <PencilSimple size={13} />
                                            </button>
                                            <button onClick={() => setResetPw(member)} title="Réinitialiser MDP" style={{ background: '#FFF3E0', color: '#E65100', border: 'none', borderRadius: 7, padding: '6px 10px', cursor: 'pointer' }}>
                                                <Lock size={13} />
                                            </button>
                                            <button onClick={() => del(member)} title="Supprimer" style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 7, padding: '6px 10px', cursor: 'pointer' }}>
                                                <Trash size={13} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {modal && (
                <StaffModal
                    initial={modal === 'create' ? null : modal}
                    roles={roles}
                    onClose={() => setModal(null)}
                    onSaved={handleSaved}
                />
            )}
            {resetPw && <ResetPasswordModal staff={resetPw} onClose={() => setResetPw(null)} />}
        </div>
    );
}
