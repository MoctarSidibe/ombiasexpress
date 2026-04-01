import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import './Rides.css';

const CARD_STATUS_LABELS = {
    none:      { label: 'Pas de carte',  color: '#888',    bg: '#F5F5F5' },
    pending:   { label: 'Demandée',      color: '#E65100', bg: '#FFF3E0' },
    printing:  { label: 'Impression',   color: '#F57F17', bg: '#FFF8E1' },
    shipped:   { label: 'Expédiée',     color: '#0288D1', bg: '#E1F3FB' },
    delivered: { label: 'Livrée',       color: '#2E7D32', bg: '#E8F5E9' },
};

const SOURCE_LABELS = {
    airtel_money:    { label: 'Airtel Money',    color: '#E53935', bg: '#FFEBEE' },
    moov_money:      { label: 'Moov Money',      color: '#0288D1', bg: '#E1F3FB' },
    bank_card:       { label: 'Carte bancaire',  color: '#7B1FA2', bg: '#F3E5F5' },
    cash:            { label: 'Espèces',         color: '#558B2F', bg: '#F1F8E9' },
    ride_earning:    { label: 'Gain course',     color: '#FF6B35', bg: '#FFF0EB' },
    rental_earning:  { label: 'Gain location',   color: '#0288D1', bg: '#E1F3FB' },
    ride_payment:    { label: 'Paiement course', color: '#FF6B35', bg: '#FFF0EB' },
    rental_payment:  { label: 'Paiement loc.',   color: '#0288D1', bg: '#E1F3FB' },
    withdrawal:      { label: 'Retrait',         color: '#C62828', bg: '#FFEBEE' },
    refund:          { label: 'Remboursement',   color: '#2E7D32', bg: '#E8F5E9' },
    promo:           { label: 'Promo',           color: '#7B1FA2', bg: '#F3E5F5' },
    transfer_in:     { label: 'Reçu',            color: '#1565C0', bg: '#DCEEFF' },
    transfer_out:    { label: 'Envoyé',          color: '#1565C0', bg: '#DCEEFF' },
};

function fmt(n) { return Number(n || 0).toLocaleString('fr-FR'); }
function fmtDate(d) {
    return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function WalletManagement() {
    const [wallets, setWallets]       = useState([]);
    const [stats, setStats]           = useState(null);
    const [total, setTotal]           = useState(0);
    const [loading, setLoading]       = useState(true);
    const [search, setSearch]         = useState('');
    const [cardFilter, setCardFilter] = useState('');
    const [page, setPage]             = useState(1);

    const [selected, setSelected]     = useState(null);
    const [txLoading, setTxLoading]   = useState(false);
    const [transactions, setTxs]      = useState([]);
    const [updatingCard, setUpdCard]  = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, limit: 30 };
            if (search)     params.search      = search;
            if (cardFilter) params.card_status = cardFilter;
            const res = await api.get('/admin/wallets', { params });
            setWallets(res.data.wallets);
            setTotal(res.data.total);
            setStats(res.data.stats);
        } finally { setLoading(false); }
    }, [page, search, cardFilter]);

    useEffect(() => { load(); }, [load]);

    const openWallet = async (w) => {
        setSelected(w);
        setTxLoading(true);
        try {
            const res = await api.get(`/admin/wallets/${w.id}/transactions`);
            setTxs(res.data.transactions);
        } finally { setTxLoading(false); }
    };

    const updateCardStatus = async (walletId, status) => {
        setUpdCard(true);
        try {
            await api.put(`/admin/wallets/${walletId}/card-status`, { status });
            setSelected(prev => ({ ...prev, physical_card_status: status }));
            load();
        } finally { setUpdCard(false); }
    };

    const pages = Math.ceil(total / 30);

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Portefeuilles</h1>
                    <p className="page-subtitle">Soldes, historique des transactions et gestion des cartes physiques Ombia</p>
                </div>
            </div>

            {/* Stats bar */}
            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
                    {[
                        { label: 'Total en portefeuilles', value: fmt(stats.totalBalance) + ' XAF', color: '#1565C0', bg: '#EEF4FF', sub: 'Solde cumulé de tous les utilisateurs' },
                        { label: 'Portefeuilles actifs',   value: fmt(stats.totalWallets),           color: '#2E7D32', bg: '#E8F5E9', sub: 'Utilisateurs avec un portefeuille créé' },
                        { label: 'Cartes en cours',        value: fmt(stats.pendingCards),            color: '#E65100', bg: '#FFF3E0', sub: 'Demandes de carte physique à traiter' },
                    ].map(s => (
                        <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '16px 20px' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{s.label}</div>
                            <div style={{ fontSize: 28, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
                            <div style={{ fontSize: 11, color: s.color, opacity: 0.7, marginTop: 4 }}>{s.sub}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                    className="form-input"
                    style={{ width: 240, fontSize: 13 }}
                    placeholder="🔍 Nom, email, téléphone..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
                <select className="form-input" style={{ width: 180, fontSize: 13 }} value={cardFilter} onChange={e => { setCardFilter(e.target.value); setPage(1); }}>
                    <option value="">Toutes les cartes</option>
                    {Object.entries(CARD_STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                    ))}
                </select>
                {(search || cardFilter) && (
                    <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => { setSearch(''); setCardFilter(''); setPage(1); }}>✕ Réinitialiser</button>
                )}
                <span style={{ fontSize: 12, color: '#888', marginLeft: 'auto' }}>{total} portefeuille{total !== 1 ? 's' : ''}</span>
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
                {/* Wallet table */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Utilisateur</th>
                                    <th>Solde</th>
                                    <th>N° carte</th>
                                    <th>Carte physique</th>
                                    <th>Statut</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && (
                                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>Chargement…</td></tr>
                                )}
                                {!loading && wallets.length === 0 && (
                                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>Aucun portefeuille trouvé</td></tr>
                                )}
                                {wallets.map(w => {
                                    const cs = CARD_STATUS_LABELS[w.physical_card_status] || CARD_STATUS_LABELS.none;
                                    const isSelected = selected?.id === w.id;
                                    return (
                                        <tr key={w.id}
                                            onClick={() => openWallet(w)}
                                            style={{ cursor: 'pointer', background: isSelected ? '#F0F7FF' : undefined }}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{w.user?.name || '—'}</div>
                                                <div style={{ fontSize: 11, color: '#888' }}>{w.user?.email}</div>
                                            </td>
                                            <td>
                                                <span style={{ fontWeight: 800, fontSize: 15, color: parseFloat(w.balance) > 0 ? '#1565C0' : '#aaa' }}>
                                                    {fmt(w.balance)} XAF
                                                </span>
                                            </td>
                                            <td style={{ fontFamily: 'monospace', fontSize: 13, letterSpacing: 1, color: '#555' }}>
                                                {w.card_number
                                                    ? w.card_number.slice(0, 4) + ' •••• •••• ' + w.card_number.slice(-4)
                                                    : <span style={{ color: '#ccc' }}>—</span>}
                                            </td>
                                            <td>
                                                <span style={{ background: cs.bg, color: cs.color, padding: '3px 10px', borderRadius: 8, fontWeight: 700, fontSize: 12 }}>
                                                    {cs.label}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{ background: w.is_active ? '#E8F5E9' : '#FFF3E0', color: w.is_active ? '#2E7D32' : '#E65100', padding: '3px 10px', borderRadius: 8, fontWeight: 700, fontSize: 12 }}>
                                                    {w.is_active ? 'Actif' : 'Bloqué'}
                                                </span>
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
                    <div style={{ width: 340, flexShrink: 0, background: '#fff', borderRadius: 14, border: '1.5px solid #E8EAF0', padding: '18px 20px', maxHeight: 700, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>{selected.user?.name}</div>
                                <div style={{ fontSize: 11, color: '#888' }}>{selected.user?.email}</div>
                            </div>
                            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#aaa', padding: 0 }}>×</button>
                        </div>

                        {/* Balance */}
                        <div style={{ background: '#EEF4FF', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#1565C0', marginBottom: 4 }}>SOLDE ACTUEL</div>
                            <div style={{ fontSize: 32, fontWeight: 900, color: '#1565C0' }}>{fmt(selected.balance)} <span style={{ fontSize: 14, fontWeight: 600 }}>XAF</span></div>
                            <div style={{ fontFamily: 'monospace', fontSize: 13, marginTop: 6, letterSpacing: 2, color: selected.card_number ? '#555' : '#bbb' }}>
                                {selected.card_number
                                    ? selected.card_number.match(/.{1,4}/g).join(' ')
                                    : '•••• •••• •••• ••••'}
                            </div>
                        </div>

                        {/* Card status manager */}
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>Statut carte physique</div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {Object.entries(CARD_STATUS_LABELS).map(([k, v]) => (
                                    <button
                                        key={k}
                                        disabled={updatingCard || selected.physical_card_status === k}
                                        onClick={() => updateCardStatus(selected.id, k)}
                                        style={{
                                            padding: '4px 10px', borderRadius: 8, border: '1.5px solid',
                                            borderColor: selected.physical_card_status === k ? v.color : '#ddd',
                                            background: selected.physical_card_status === k ? v.bg : '#fff',
                                            color: selected.physical_card_status === k ? v.color : '#666',
                                            fontSize: 11, fontWeight: 700,
                                            cursor: (updatingCard || selected.physical_card_status === k) ? 'default' : 'pointer',
                                            opacity: updatingCard ? 0.6 : 1,
                                        }}>
                                        {v.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Transactions */}
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>Dernières transactions</div>
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {txLoading && <div style={{ textAlign: 'center', color: '#aaa', padding: 20, fontSize: 12 }}>Chargement…</div>}
                            {!txLoading && transactions.length === 0 && (
                                <div style={{ textAlign: 'center', color: '#aaa', padding: 20, fontSize: 12 }}>Aucune transaction</div>
                            )}
                            {transactions.map(tx => {
                                const src = SOURCE_LABELS[tx.source] || { label: tx.source, color: '#555', bg: '#F5F5F5' };
                                const isCredit = tx.type === 'credit';
                                return (
                                    <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: '#FAFAFA', border: '1px solid #F0F0F0' }}>
                                        <div style={{ background: src.bg, color: src.color, padding: '3px 7px', borderRadius: 6, fontSize: 10, fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>
                                            {src.label}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 11, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description || '—'}</div>
                                            <div style={{ fontSize: 10, color: '#aaa' }}>{fmtDate(tx.created_at)}</div>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <div style={{ fontWeight: 800, fontSize: 13, color: isCredit ? '#2E7D32' : '#C62828' }}>
                                                {isCredit ? '+' : '−'}{fmt(tx.amount)} XAF
                                            </div>
                                            <div style={{ fontSize: 10, color: '#aaa' }}>→ {fmt(tx.balance_after)}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
