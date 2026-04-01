import { useState, useEffect } from 'react';
import api from '../api';
import './Rides.css';

// ── MFA Panel ─────────────────────────────────────────────────────────────────
function MfaPanel() {
    const [status,    setStatus]    = useState(null);   // null=loading, true/false
    const [qrCode,    setQrCode]    = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [code,      setCode]      = useState('');
    const [step,      setStep]      = useState('idle'); // idle | setup | verify | disable
    const [msg,       setMsg]       = useState(null);   // { type: 'success'|'error', text }
    const [loading,   setLoading]   = useState(false);

    useEffect(() => { fetchStatus(); }, []);

    const fetchStatus = async () => {
        try {
            const { data } = await api.get('/mfa/status');
            setStatus(data.mfa_enabled);
        } catch { setStatus(false); }
    };

    const startSetup = async () => {
        setLoading(true); setMsg(null);
        try {
            const { data } = await api.post('/mfa/setup');
            setQrCode(data.qr_code);
            setSecretKey(data.secret_key);
            setStep('verify');
        } catch (e) { setMsg({ type: 'error', text: e.response?.data?.error || 'Erreur' }); }
        finally { setLoading(false); }
    };

    const verifySetup = async () => {
        if (code.length !== 6) return;
        setLoading(true); setMsg(null);
        try {
            await api.post('/mfa/verify-setup', { code });
            setStatus(true); setStep('idle'); setQrCode(''); setCode('');
            setMsg({ type: 'success', text: '✅ MFA activé avec succès !' });
        } catch (e) { setMsg({ type: 'error', text: e.response?.data?.error || 'Code invalide' }); }
        finally { setLoading(false); }
    };

    const disableMfa = async () => {
        if (code.length !== 6) return;
        setLoading(true); setMsg(null);
        try {
            await api.post('/mfa/disable', { code });
            setStatus(false); setStep('idle'); setCode('');
            setMsg({ type: 'success', text: 'MFA désactivé.' });
        } catch (e) { setMsg({ type: 'error', text: e.response?.data?.error || 'Code invalide' }); }
        finally { setLoading(false); }
    };

    const cardStyle = { background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: '24px 28px', marginBottom: 24 };
    const badgeOn   = { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#DCFCE7', color: '#16A34A', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700 };
    const badgeOff  = { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FEF2F2', color: '#DC2626', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700 };
    const btnPrimary = { padding: '10px 22px', background: '#1565C0', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 };
    const btnDanger  = { padding: '10px 22px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 };
    const btnGhost   = { padding: '10px 18px', background: '#fff', color: '#6B7280', border: '1.5px solid #E5E7EB', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14 };
    const inputStyle = { border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '10px 14px', fontSize: 22, textAlign: 'center', letterSpacing: 10, width: 160, outline: 'none' };

    return (
        <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1C2E4A' }}>
                        🔐 Authentification à deux facteurs (MFA)
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>
                        Protège votre compte même si votre mot de passe est compromis.
                    </p>
                </div>
                {status !== null && (
                    <span style={status ? badgeOn : badgeOff}>
                        {status ? '● Activé' : '○ Désactivé'}
                    </span>
                )}
            </div>

            {msg && (
                <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 600,
                    background: msg.type === 'success' ? '#F0FDF4' : '#FEF2F2',
                    color: msg.type === 'success' ? '#16A34A' : '#DC2626',
                    border: `1px solid ${msg.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
                }}>
                    {msg.text}
                </div>
            )}

            {/* ── Idle: show action button ── */}
            {step === 'idle' && !status && (
                <button onClick={startSetup} disabled={loading} style={btnPrimary}>
                    {loading ? 'Chargement…' : 'Activer le MFA'}
                </button>
            )}

            {step === 'idle' && status && (
                <button onClick={() => { setStep('disable'); setCode(''); setMsg(null); }} style={btnDanger}>
                    Désactiver le MFA
                </button>
            )}

            {/* ── Setup: show QR code ── */}
            {step === 'verify' && qrCode && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                    <p style={{ fontSize: 13, color: '#374151', textAlign: 'center', maxWidth: 360 }}>
                        1. Ouvrez <strong>Google Authenticator</strong> ou <strong>Authy</strong><br/>
                        2. Appuyez sur <strong>+</strong> et scannez ce QR code
                    </p>
                    <img src={qrCode} alt="QR Code MFA" style={{ width: 200, height: 200, borderRadius: 12, border: '1px solid #E5E7EB' }} />
                    <details style={{ fontSize: 12, color: '#9CA3AF' }}>
                        <summary style={{ cursor: 'pointer' }}>Entrée manuelle</summary>
                        <code style={{ display: 'block', marginTop: 6, padding: '6px 12px', background: '#F9FAFB', borderRadius: 6, letterSpacing: 2 }}>
                            {secretKey}
                        </code>
                    </details>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                        <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>3. Entrez le code à 6 chiffres :</p>
                        <input
                            type="text" inputMode="numeric" maxLength={6}
                            value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="000000" style={inputStyle} autoFocus
                        />
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={verifySetup} disabled={loading || code.length !== 6} style={{ ...btnPrimary, opacity: code.length !== 6 ? 0.5 : 1 }}>
                                {loading ? '…' : 'Confirmer'}
                            </button>
                            <button onClick={() => { setStep('idle'); setQrCode(''); setCode(''); }} style={btnGhost}>Annuler</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Disable: require TOTP confirmation ── */}
            {step === 'disable' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>
                        Entrez votre code MFA actuel pour confirmer la désactivation :
                    </p>
                    <input
                        type="text" inputMode="numeric" maxLength={6}
                        value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000" style={inputStyle} autoFocus
                    />
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={disableMfa} disabled={loading || code.length !== 6} style={{ ...btnDanger, opacity: code.length !== 6 ? 0.5 : 1 }}>
                            {loading ? '…' : 'Désactiver'}
                        </button>
                        <button onClick={() => { setStep('idle'); setCode(''); }} style={btnGhost}>Annuler</button>
                    </div>
                </div>
            )}
        </div>
    );
}

function Settings() {
    const [settings, setSettings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState({});
    const [saving, setSaving] = useState({});
    const [messages, setMessages] = useState({});

    useEffect(() => { fetchSettings(); }, []);

    const fetchSettings = async () => {
        try {
            const res = await api.get('/admin/settings');
            setSettings(res.data.settings);
        } catch (e) {
            console.error('Failed to load settings', e);
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (key, currentValue) => {
        setEditing(prev => ({ ...prev, [key]: currentValue }));
        setMessages(prev => ({ ...prev, [key]: null }));
    };

    const cancelEdit = (key) => {
        setEditing(prev => { const n = { ...prev }; delete n[key]; return n; });
    };

    const toggleBool = async (key, currentValue) => {
        const newVal = currentValue === '1' || currentValue === 'true' ? '0' : '1';
        setSaving(prev => ({ ...prev, [key]: true }));
        try {
            await api.put('/admin/settings/' + key, { value: newVal });
            fetchSettings();
        } catch (e) {
            setMessages(prev => ({ ...prev, [key]: { type: 'error', text: e.response?.data?.error || 'Failed to save' } }));
        } finally {
            setSaving(prev => ({ ...prev, [key]: false }));
        }
    };

    const saveEdit = async (key) => {
        const value = editing[key];
        if (value === undefined || String(value).trim() === '') return;
        setSaving(prev => ({ ...prev, [key]: true }));
        try {
            await api.put('/admin/settings/' + key, { value });
            setMessages(prev => ({ ...prev, [key]: { type: 'success', text: 'Saved successfully' } }));
            setEditing(prev => { const n = { ...prev }; delete n[key]; return n; });
            fetchSettings();
        } catch (e) {
            setMessages(prev => ({ ...prev, [key]: { type: 'error', text: e.response?.data?.error || 'Failed to save' } }));
        } finally {
            setSaving(prev => ({ ...prev, [key]: false }));
        }
    };

    if (loading) return <div className="loading">Loading settings...</div>;

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>Platform Settings</h1>
                    <p style={{ color: '#888', marginTop: 4 }}>Configure commission rates and platform parameters</p>
                </div>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Setting</th>
                            <th>Description</th>
                            <th style={{ width: 140 }}>Current Value</th>
                            <th style={{ width: 180 }}>New Value</th>
                            <th style={{ width: 130 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {settings.map(s => {
                            const isEditing = s.key in editing;
                            const msg = messages[s.key];
                            const isCommission = s.key.includes('commission_rate');
                            const isBool = s.key.endsWith('_enabled');
                            const boolOn = s.value === '1' || s.value === 'true';
                            return (
                                <tr key={s.key}>
                                    <td>
                                        <strong>{s.label}</strong><br />
                                        <code style={{ fontSize: 11, color: '#aaa' }}>{s.key}</code>
                                    </td>
                                    <td style={{ color: '#666', fontSize: 13 }}>{s.description}</td>
                                    <td>
                                        {isBool ? (
                                            <span style={{
                                                display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                                                fontSize: 12, fontWeight: 700,
                                                background: boolOn ? '#d4edda' : '#f8d7da',
                                                color: boolOn ? '#155724' : '#721c24',
                                            }}>
                                                {boolOn ? 'Activé' : 'Désactivé'}
                                            </span>
                                        ) : (
                                            <span className="badge badge-info">
                                                {s.value}{isCommission ? '%' : ''}
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        {isBool ? (
                                            <span style={{ color: '#ccc', fontSize: 13 }}>toggle →</span>
                                        ) : isEditing ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <input
                                                    type="number"
                                                    min={isCommission ? 0 : undefined}
                                                    max={isCommission ? 100 : undefined}
                                                    step="0.5"
                                                    value={editing[s.key]}
                                                    onChange={e => setEditing(prev => ({ ...prev, [s.key]: e.target.value }))}
                                                    style={{ width: 80, padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}
                                                />
                                                {isCommission && <span style={{ color: '#666' }}>%</span>}
                                            </div>
                                        ) : (
                                            msg ? (
                                                <span style={{ color: msg.type === 'success' ? '#00b894' : '#d63031', fontSize: 13 }}>
                                                    {msg.text}
                                                </span>
                                            ) : <span style={{ color: '#ccc' }}>—</span>
                                        )}
                                    </td>
                                    <td>
                                        {isBool ? (
                                            <button
                                                className={boolOn ? 'btn-warn btn-sm' : 'btn-approve btn-sm'}
                                                onClick={() => toggleBool(s.key, s.value)}
                                                disabled={saving[s.key]}
                                            >
                                                {saving[s.key] ? '…' : (boolOn ? 'Désactiver' : 'Activer')}
                                            </button>
                                        ) : isEditing ? (
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="action-button approve" onClick={() => saveEdit(s.key)} disabled={saving[s.key]}>
                                                    {saving[s.key] ? 'Saving...' : 'Save'}
                                                </button>
                                                <button className="action-button" onClick={() => cancelEdit(s.key)} disabled={saving[s.key]}>
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <button className="action-button" onClick={() => startEdit(s.key, s.value)}>
                                                Edit
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: 24, padding: '16px 20px', background: '#fff8e1', borderRadius: 8, border: '1px solid #ffe08a' }}>
                <strong>Note:</strong> Commission changes apply to new transactions only. Rates are cached for up to 1 minute after update.
            </div>

            <div style={{ marginTop: 32 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1C2E4A', marginBottom: 16 }}>Security</h2>
                <MfaPanel />
            </div>
        </div>
    );
}

export default Settings;
