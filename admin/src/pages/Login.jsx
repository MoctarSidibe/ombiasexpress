import { useState } from 'react';
import api from '../api';
import './Login.css';

// ── Step 1: Email + password
// ── Step 2: TOTP code (only when mfa_required: true)

function Login({ setIsAuthenticated }) {
    const [step,       setStep]       = useState(1);          // 1 = password, 2 = OTP
    const [email,      setEmail]      = useState('');
    const [password,   setPassword]   = useState('');
    const [otp,        setOtp]        = useState('');
    const [mfaSession, setMfaSession] = useState('');
    const [error,      setError]      = useState('');
    const [loading,    setLoading]    = useState(false);

    // ── Step 1: submit email + password ──────────────────────────────────────
    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { data } = await api.post('/auth/login', { email, password });

            if (data.mfa_required) {
                // Server requires TOTP — move to step 2
                setMfaSession(data.mfa_session);
                setStep(2);
                return;
            }

            const { token, user } = data;
            if (user.role !== 'admin' && !user.is_staff) {
                setError('Accès refusé. Identifiants administrateur requis.');
                return;
            }
            localStorage.setItem('adminToken', token);
            localStorage.setItem('adminUser', JSON.stringify(user));
            setIsAuthenticated(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Échec de connexion.');
        } finally {
            setLoading(false);
        }
    };

    // ── Step 2: submit OTP code ───────────────────────────────────────────────
    const handleOtp = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { data } = await api.post('/mfa/verify', { mfa_session: mfaSession, code: otp });
            const { token, user } = data;

            if (user.role !== 'admin' && !user.is_staff) {
                setError('Accès refusé.');
                return;
            }
            localStorage.setItem('adminToken', token);
            localStorage.setItem('adminUser', JSON.stringify(user));
            setIsAuthenticated(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Code invalide.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <img src="/logo.png" alt="Ombia Express" className="login-logo" />
                    <p className="login-tagline">Admin Dashboard</p>
                </div>

                {/* ── Step 1: credentials ── */}
                {step === 1 && (
                    <form onSubmit={handleLogin} className="login-form">
                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="admin@ombiaexpress.com"
                                required
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label>Mot de passe</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        {error && <div className="error-message">{error}</div>}
                        <button type="submit" disabled={loading} className="login-button">
                            {loading ? 'Connexion…' : 'Se connecter'}
                        </button>
                    </form>
                )}

                {/* ── Step 2: TOTP OTP ── */}
                {step === 2 && (
                    <form onSubmit={handleOtp} className="login-form">
                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            <div style={{ fontSize: 40, marginBottom: 8 }}>🔐</div>
                            <p style={{ fontWeight: 700, color: '#1C2E4A', fontSize: 15 }}>
                                Vérification en 2 étapes
                            </p>
                            <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                                Entrez le code affiché dans votre application d'authentification
                            </p>
                        </div>
                        <div className="form-group">
                            <label>Code à 6 chiffres</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]{6}"
                                maxLength={6}
                                value={otp}
                                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                                placeholder="000000"
                                required
                                autoFocus
                                style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8 }}
                            />
                        </div>
                        {error && <div className="error-message">{error}</div>}
                        <button type="submit" disabled={loading || otp.length !== 6} className="login-button">
                            {loading ? 'Vérification…' : 'Confirmer'}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setStep(1); setOtp(''); setError(''); }}
                            style={{ marginTop: 10, background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 13, width: '100%' }}
                        >
                            ← Retour
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default Login;
