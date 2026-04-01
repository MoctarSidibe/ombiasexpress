import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import './Rides.css';

// ─────────────────────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────────────────────

const QUEUE_STATUS = {
    pending:  { label: 'En attente',  color: '#E65100', bg: '#FFF3E0' },
    printing: { label: 'Impression',  color: '#1565C0', bg: '#E3F2FD' },
    shipped:  { label: 'Expédiée',    color: '#7B1FA2', bg: '#F3E5F5' },
    delivered:{ label: 'Livrée',      color: '#2E7D32', bg: '#E8F5E9' },
};

const PRINTER_FORMATS = [
    { key: 'json',    label: 'JSON',         desc: 'Evolis, custom SDK',       ext: '.json', mime: 'application/json' },
    { key: 'csv',     label: 'CSV',          desc: 'Zebra, HID, Datacard',     ext: '.csv',  mime: 'text/csv' },
    { key: 'zpl',     label: 'ZPL',          desc: 'Zebra ZXP Series',         ext: '.zpl',  mime: 'text/plain' },
    { key: 'browser', label: 'Imprimer',     desc: 'Tout imprimante (navigateur)', ext: null, mime: null },
];

// ─────────────────────────────────────────────────────────────────────────────
//  Card preview — exact replica of the mobile WalletScreen card
// ─────────────────────────────────────────────────────────────────────────────

function OmbiaCard({ name, cardNumber, nfcEncoded }) {
    const W = 360, H = 216;
    const cn = (cardNumber || '').padEnd(16, '•');
    const groups = cn.match(/.{1,4}/g) || ['••••', '••••', '••••', '••••'];

    return (
        <div style={{
            width: W, height: H,
            backgroundColor: '#1A2E48',
            borderRadius: 20,
            padding: 20,
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '1px solid rgba(255,167,38,0.3)',
            boxShadow: '0 8px 32px rgba(255,167,38,0.15)',
            flexShrink: 0,
        }}>
            {/* Decorative circles (match mobile cardCircle1 / cardCircle2 / cardCircle3) */}
            <div style={{ position:'absolute', width: H*1.1, height: H*1.1, borderRadius: '50%', background:'rgba(255,167,38,0.05)', top: -H*0.5, right: -H*0.3, pointerEvents:'none' }} />
            <div style={{ position:'absolute', width: H*0.7, height: H*0.7, borderRadius: '50%', background:'rgba(255,167,38,0.06)', bottom: -H*0.25, left: -H*0.1, pointerEvents:'none' }} />
            <div style={{ position:'absolute', width: 80, height: 80, borderRadius: '50%', background:'rgba(255,255,255,0.03)', top: '30%', left: '40%', pointerEvents:'none' }} />

            {/* Row 1: Brand + icons */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', position:'relative', zIndex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
                    {/* Logo image (same as mobile virtual card) */}
                    <img
                        src="/logo.png"
                        alt="Ombia"
                        style={{ width: 44, height: 44, objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
                        onError={e => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                        }}
                    />
                    {/* Fallback if logo not found */}
                    <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,167,38,0.18)', display:'none', alignItems:'center', justifyContent:'center' }}>
                        <span style={{ color:'#FFA726', fontWeight:900, fontSize:14 }}>O</span>
                    </div>
                    <div>
                        <div style={{ color:'#fff', fontSize:15, fontWeight:900, letterSpacing:2 }}>OMBIA</div>
                        <div style={{ color:'rgba(255,167,38,0.85)', fontSize:8, fontWeight:700, letterSpacing:3 }}>EXPRESS</div>
                    </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    {/* QR icon */}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" opacity="0.38">
                        <rect x="2" y="2" width="9" height="9" rx="1.5" stroke="white" strokeWidth="1.5"/>
                        <rect x="5" y="5" width="3" height="3" fill="white"/>
                        <rect x="13" y="2" width="9" height="9" rx="1.5" stroke="white" strokeWidth="1.5"/>
                        <rect x="16" y="5" width="3" height="3" fill="white"/>
                        <rect x="2" y="13" width="9" height="9" rx="1.5" stroke="white" strokeWidth="1.5"/>
                        <rect x="5" y="16" width="3" height="3" fill="white"/>
                        <rect x="13" y="16" width="3" height="3" fill="white"/>
                        <rect x="16" y="13" width="3" height="3" fill="white"/>
                        <rect x="19" y="16" width="3" height="3" fill="white"/>
                        <rect x="16" y="19" width="3" height="3" fill="white"/>
                    </svg>
                    {/* NFC icon */}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2C10.5 2 9.5 3 9.5 4.5V19.5C9.5 21 10.5 22 12 22" stroke={nfcEncoded ? '#FFA726' : 'rgba(255,255,255,0.35)'} strokeWidth="2" strokeLinecap="round"/>
                        <path d="M15.5 7C17 8.2 18 10 18 12C18 14 17 15.8 15.5 17" stroke={nfcEncoded ? '#FFA726' : 'rgba(255,255,255,0.35)'} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
                        <path d="M18.5 4.5C21 6.5 22.5 9 22.5 12C22.5 15 21 17.5 18.5 19.5" stroke={nfcEncoded ? '#FFA726' : 'rgba(255,255,255,0.2)'} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
                    </svg>
                </div>
            </div>

            {/* Row 2: NFC icon + card number */}
            <div style={{ display:'flex', alignItems:'center', gap:14, position:'relative', zIndex:1 }}>
                {/* Orange NFC icon (replaces SIM chip) */}
                <div style={{ width:38, height:38, borderRadius:'50%', background:'rgba(255,167,38,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, border:'1.5px solid rgba(255,167,38,0.35)' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2C10.5 2 9.5 3 9.5 4.5V19.5C9.5 21 10.5 22 12 22" stroke="#FFA726" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M15.5 7C17 8.2 18 10 18 12C18 14 17 15.8 15.5 17" stroke="#FFA726" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
                        <path d="M18.5 4.5C21 6.5 22.5 9 22.5 12C22.5 15 21 17.5 18.5 19.5" stroke="rgba(255,167,38,0.5)" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
                    </svg>
                </div>
                {/* Card number */}
                <div style={{ color:'rgba(255,255,255,0.88)', fontSize:15, letterSpacing:3, fontFamily:"'Courier New', monospace", fontWeight:600 }}>
                    {groups.join('  ')}
                </div>
            </div>

            {/* Row 3: Holder + network circles */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', position:'relative', zIndex:1 }}>
                <div>
                    <div style={{ color:'rgba(255,255,255,0.4)', fontSize:7, letterSpacing:1.5, marginBottom:2 }}>TITULAIRE</div>
                    <div style={{ color:'#fff', fontSize:11, fontWeight:700, letterSpacing:1 }}>
                        {(name || 'NOM TITULAIRE').toUpperCase().slice(0, 24)}
                    </div>
                </div>
                {/* Logo bottom-right (same as mobile virtual card) */}
                <img
                    src="/logo.png"
                    alt=""
                    style={{ width:40, height:40, objectFit:'contain', opacity:0.85, filter:'brightness(0) invert(1)' }}
                    onError={e => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                    }}
                />
                {/* Fallback circles if logo missing */}
                <div style={{ display:'none', alignItems:'center' }}>
                    <div style={{ width:24, height:24, borderRadius:'50%', background:'#FFA726', opacity:0.85, marginRight:-8 }} />
                    <div style={{ width:24, height:24, borderRadius:'50%', background:'#E53935', opacity:0.85 }} />
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Browser print card (injected into a print iframe)
// ─────────────────────────────────────────────────────────────────────────────

function printCard(card) {
    const cn = (card.card_number || '').match(/.{1,4}/g)?.join('  ') || '•••• •••• •••• ••••';
    const name = (card.delivery_meta?.full_name || card.user?.name || '').toUpperCase();
    const html = `<!DOCTYPE html><html><head><style>
        @page{size:85.6mm 53.98mm;margin:0}
        body{margin:0;padding:0;background:#fff}
        .card{
            width:85.6mm;height:53.98mm;
            background:linear-gradient(135deg,#1A2E48,#0D1B2A);
            border-radius:4mm;padding:5mm;
            display:flex;flex-direction:column;justify-content:space-between;
            font-family:'Arial',sans-serif;color:#fff;
            border:0.3mm solid rgba(255,167,38,0.4);box-sizing:border-box;
        }
        .brand{font-size:4mm;font-weight:900;letter-spacing:.5mm}
        .sub{font-size:2mm;color:rgba(255,167,38,.85);letter-spacing:.8mm}
        .nfc-chip{width:9mm;height:9mm;border-radius:50%;background:rgba(255,167,38,0.15);border:0.4mm solid rgba(255,167,38,0.4);display:inline-flex;align-items:center;justify-content:center}
        .num{font-size:3.5mm;letter-spacing:.6mm;font-family:monospace;color:rgba(255,255,255,.88)}
        .holder-label{font-size:1.8mm;color:rgba(255,255,255,.4);letter-spacing:.4mm}
        .holder{font-size:2.8mm;font-weight:700;letter-spacing:.3mm}
        .nfc-row{display:flex;align-items:center;gap:2mm;font-size:1.8mm;color:rgba(255,167,38,.8)}
    </style></head><body>
    <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center">
            <div><div class="brand">OMBIA</div><div class="sub">EXPRESS</div></div>
            <div class="nfc-row">NFC &bull; QR</div>
        </div>
        <div style="display:flex;align-items:center;gap:4mm">
            <div class="nfc-chip"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2C10.5 2 9.5 3 9.5 4.5V19.5C9.5 21 10.5 22 12 22" stroke="#FFA726" stroke-width="2" stroke-linecap="round"/><path d="M15.5 7C17 8.2 18 10 18 12C18 14 17 15.8 15.5 17" stroke="#FFA726" stroke-width="1.8" stroke-linecap="round"/><path d="M18.5 4.5C21 6.5 22.5 9 22.5 12C22.5 15 21 17.5 18.5 19.5" stroke="rgba(255,167,38,0.5)" stroke-width="1.8" stroke-linecap="round"/></svg></div>
            <div class="num">${cn}</div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end">
            <div><div class="holder-label">TITULAIRE</div><div class="holder">${name.slice(0,22)}</div></div>
            <img src="/logo.png" style="width:10mm;height:10mm;object-fit:contain;opacity:.85;filter:brightness(0) invert(1)" onerror="this.style.display='none'" />
        </div>
    </div>
    <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),1000)}</script>
    </body></html>`;
    const w = window.open('', '_blank', 'width=400,height=300');
    w.document.write(html);
    w.document.close();
}

// ─────────────────────────────────────────────────────────────────────────────
//  Generate print content in various formats
// ─────────────────────────────────────────────────────────────────────────────

function generateContent(format, job) {
    const cn  = job.card.card_number;
    const cnF = cn.match(/.{1,4}/g)?.join(' ') || cn;
    const uid = job.card.nfc_uid || '';
    const name = job.card.holder_name;
    const ndefData = JSON.stringify({ uid, card: cn, uid_user: job.delivery?.user_id || '' });

    if (format === 'json') {
        return JSON.stringify(job, null, 2);
    }
    if (format === 'csv') {
        const header = 'job_id,holder_name,card_number,card_number_formatted,nfc_uid,ndef_data,delivery_name,delivery_phone,delivery_address';
        const row = [
            job.job_id, name, cn, cnF, uid, `"${ndefData}"`,
            job.delivery?.full_name || '', job.delivery?.phone || '', job.delivery?.address || '',
        ].join(',');
        return header + '\n' + row;
    }
    if (format === 'zpl') {
        // ZPL II for Zebra ZXP Series (CR-80 card, 150 dpi)
        return `^XA
^PR3
^FO30,30^A0N,40,40^FD${name.slice(0, 22)}^FS
^FO30,80^A0N,28,28^FD${cnF}^FS
^FO30,120^A0N,20,20^FDOMBIA EXPRESS^FS
^FO30,150^A0N,18,18^FDNFC UID: ${uid || 'NON ENCODE'}^FS
^RFID^FD${ndefData}^FS
^XZ`;
    }
    return '';
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function CardPrinting() {
    const [cards,        setCards]       = useState([]);
    const [stats,        setStats]       = useState({ pending:0, printing:0, shipped:0, delivered:0 });
    const [loading,      setLoading]     = useState(true);
    const [queueFilter,  setQueueFilter] = useState('');

    const [selected,     setSelected]   = useState(null);
    const [nfcInput,     setNfcInput]   = useState('');
    const [nfcLoading,   setNfcLoading] = useState(false);
    const [nfcError,     setNfcError]   = useState('');
    const [genLoading,   setGenLoading] = useState(false);

    const [checked,      setChecked]    = useState(new Set());
    const [printLoading, setPrintLoading]= useState(false);
    const [statusLoading,setStatusLoading]= useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (queueFilter) params.status = queueFilter;
            else params.status = 'all'; // show all including delivered
            const res = await api.get('/admin/wallets/card-queue', { params });
            setCards(res.data.cards || []);
            setStats(res.data.stats || { pending:0, printing:0, shipped:0 });
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [queueFilter]);

    useEffect(() => { load(); }, [load]);

    const openCard = (card) => {
        setSelected(card);
        setNfcInput(card.nfc_card_uid || '');
        setNfcError('');
    };

    // ── NFC assign ──────────────────────────────────────────────────────────
    const assignNfc = async () => {
        if (!nfcInput.trim()) { setNfcError('Saisir un UID NFC'); return; }
        setNfcLoading(true); setNfcError('');
        try {
            const res = await api.put(`/admin/wallets/${selected.id}/assign-nfc`, {
                nfc_card_uid: nfcInput.trim(),
                advance_status: selected.physical_card_status === 'pending',
            });
            const updated = { ...selected, nfc_card_uid: nfcInput.trim(), physical_card_status: res.data.wallet.physical_card_status };
            setSelected(updated);
            setCards(prev => prev.map(c => c.id === selected.id ? { ...c, nfc_card_uid: nfcInput.trim() } : c));
        } catch (e) { setNfcError(e.response?.data?.error || 'Erreur NFC'); }
        finally { setNfcLoading(false); }
    };

    // ── Auto-generate NFC UID ───────────────────────────────────────────────
    const generateNfc = async () => {
        setGenLoading(true); setNfcError('');
        try {
            const res = await api.post(`/admin/wallets/${selected.id}/generate-nfc`);
            const uid = res.data.nfc_card_uid;
            setNfcInput(uid);
            const updated = { ...selected, nfc_card_uid: uid };
            setSelected(updated);
            setCards(prev => prev.map(c => c.id === selected.id ? { ...c, nfc_card_uid: uid } : c));
        } catch (e) { setNfcError(e.response?.data?.error || 'Erreur génération'); }
        finally { setGenLoading(false); }
    };

    // ── Status update ───────────────────────────────────────────────────────
    const setStatus = async (walletId, status) => {
        setStatusLoading(true);
        try {
            await api.put(`/admin/wallets/${walletId}/card-status`, { status });
            if (selected?.id === walletId) setSelected(prev => ({ ...prev, physical_card_status: status }));
            setCards(prev => prev.map(c => c.id === walletId ? { ...c, physical_card_status: status } : c));
        } finally { setStatusLoading(false); }
    };

    // ── Print single card ───────────────────────────────────────────────────
    const printSingle = async (card, format) => {
        setPrintLoading(true);
        try {
            const res = await api.get(`/admin/wallets/${card.id}/print-data`);
            const job = res.data.print_job;
            if (format === 'browser') {
                printCard(card);
            } else {
                const content = generateContent(format, job);
                const fmt = PRINTER_FORMATS.find(f => f.key === format);
                const blob = new Blob([content], { type: fmt.mime });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `${job.job_id}${fmt.ext}`; a.click();
                URL.revokeObjectURL(url);
            }
            if (card.physical_card_status === 'pending') await setStatus(card.id, 'printing');
        } finally { setPrintLoading(false); }
    };

    // ── Batch print ─────────────────────────────────────────────────────────
    const batchPrint = async (format) => {
        const ids = checked.size > 0
            ? [...checked]
            : cards.filter(c => c.physical_card_status === 'pending').map(c => c.id);
        if (!ids.length) { alert('Aucune carte en attente'); return; }
        setPrintLoading(true);
        try {
            const res = await api.post('/admin/wallets/batch-print', { wallet_ids: ids });
            const batch = res.data.batch;
            if (format === 'browser') {
                ids.forEach(id => { const c = cards.find(x => x.id === id); if (c) printCard(c); });
            } else {
                const fmt = PRINTER_FORMATS.find(f => f.key === format);
                const content = format === 'json'
                    ? JSON.stringify(batch, null, 2)
                    : format === 'csv'
                        ? 'job_id,holder_name,card_number,nfc_uid\n' + batch.jobs.map(j => `${j.job_id},${j.holder_name},${j.card_number},${j.nfc_uid||''}`).join('\n')
                        : batch.jobs.map(j => `^XA\n^FO30,30^A0N,40,40^FD${j.holder_name}^FS\n^FO30,80^A0N,28,28^FD${(j.card_number||'').match(/.{1,4}/g)?.join(' ')}^FS\n^RFID^FD${j.nfc_uid||''}^FS\n^XZ`).join('\n\n');
                const blob = new Blob([content], { type: fmt.mime });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `${batch.batch_id}${fmt.ext}`; a.click();
                URL.revokeObjectURL(url);
            }
            setChecked(new Set());
            load();
        } finally { setPrintLoading(false); }
    };

    const toggleCheck = (id, e) => { e.stopPropagation(); setChecked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
    const toggleAll  = ()        => setChecked(prev => prev.size === cards.length ? new Set() : new Set(cards.map(c => c.id)));
    const pendingCount = cards.filter(c => c.physical_card_status === 'pending').length;

    return (
        <div className="page" style={{ display:'flex', flexDirection:'column', height:'100%' }}>

            {/* ── Header ── */}
            <div className="page-header" style={{ flexShrink:0 }}>
                <div>
                    <h1 className="page-title">Impression de Cartes NFC</h1>
                    <p className="page-subtitle">File de production · Encodage NFC universel · Multi-imprimante</p>
                </div>
                <button className="btn-secondary" onClick={load} style={{ alignSelf:'center' }}>↻ Actualiser</button>
            </div>

            {/* ── Stats row ── */}
            <div style={{ display:'flex', gap:10, marginBottom:16, flexShrink:0 }}>
                {[
                    { key:'', label:'Toutes', value: cards.length, color:'#1C2E4A', bg:'#F0F4FF' },
                    { key:'pending',  label:'En attente',  value:stats.pending  || 0, color:'#E65100', bg:'#FFF3E0' },
                    { key:'printing', label:'Impression',  value:stats.printing || 0, color:'#1565C0', bg:'#E3F2FD' },
                    { key:'shipped',  label:'Expédiées',   value:stats.shipped  || 0, color:'#7B1FA2', bg:'#F3E5F5' },
                    { key:'delivered',label:'Livrées',     value:stats.delivered||0,  color:'#2E7D32', bg:'#E8F5E9' },
                ].map(s => (
                    <div
                        key={s.key}
                        onClick={() => setQueueFilter(prev => prev === s.key ? '' : s.key)}
                        style={{
                            flex:1, textAlign:'center',
                            background: queueFilter === s.key ? s.bg : '#FAFAFA',
                            border: `1.5px solid ${queueFilter === s.key ? s.color : '#E8EAF0'}`,
                            borderRadius:10, padding:'10px 8px', cursor:'pointer',
                        }}>
                        <div style={{ fontSize:22, fontWeight:900, color:s.color, lineHeight:1 }}>{s.value}</div>
                        <div style={{ fontSize:10, color:s.color, marginTop:2, fontWeight:600 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* ── Batch toolbar ── */}
            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12, flexWrap:'wrap', flexShrink:0 }}>
                <span style={{ fontSize:12, fontWeight:600, color:'#555' }}>
                    {checked.size > 0 ? `${checked.size} sélectionnée(s)` : `${pendingCount} en attente`}
                </span>
                <span style={{ color:'#ddd' }}>|</span>
                {PRINTER_FORMATS.map(f => (
                    <button
                        key={f.key}
                        className="btn-secondary"
                        style={{ fontSize:11, padding:'5px 10px' }}
                        disabled={printLoading || pendingCount === 0}
                        onClick={() => batchPrint(f.key)}
                        title={f.desc}>
                        {f.key === 'browser' ? '🖨' : '⬇'} {f.label} {f.key !== 'browser' ? `(lot)` : ''}
                    </button>
                ))}
                {checked.size > 0 && (
                    <button className="btn-secondary" style={{ fontSize:11 }} onClick={() => setChecked(new Set())}>✕ Désélect.</button>
                )}
            </div>

            {/* ── Main split ── */}
            <div style={{ display:'flex', gap:16, flex:1, minHeight:0 }}>

                {/* LEFT — queue table */}
                <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column' }}>
                    <div className="table-container" style={{ flex:1, overflow:'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width:32 }}>
                                        <input type="checkbox"
                                            checked={checked.size === cards.length && cards.length > 0}
                                            onChange={toggleAll} />
                                    </th>
                                    <th>Titulaire</th>
                                    <th>N° carte</th>
                                    <th>NFC</th>
                                    <th>Statut</th>
                                    <th>Imprimer</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && <tr><td colSpan={6} style={{ textAlign:'center', padding:32, color:'#aaa' }}>Chargement…</td></tr>}
                                {!loading && cards.length === 0 && (
                                    <tr><td colSpan={6} style={{ textAlign:'center', padding:32, color:'#aaa' }}>
                                        Aucune carte{queueFilter ? ` (statut : ${QUEUE_STATUS[queueFilter]?.label})` : ' en production'}
                                    </td></tr>
                                )}
                                {cards.map(card => {
                                    const qs = QUEUE_STATUS[card.physical_card_status] || QUEUE_STATUS.pending;
                                    const isActive = selected?.id === card.id;
                                    return (
                                        <tr key={card.id}
                                            onClick={() => openCard(card)}
                                            style={{ cursor:'pointer', background: isActive ? '#EBF4FF' : checked.has(card.id) ? '#FFFBF0' : undefined }}>
                                            <td onClick={e => toggleCheck(card.id, e)}>
                                                <input type="checkbox" checked={checked.has(card.id)} onChange={() => {}} />
                                            </td>
                                            <td>
                                                <div style={{ fontWeight:700, fontSize:13 }}>{card.user?.name || '—'}</div>
                                                <div style={{ fontSize:11, color:'#888' }}>{card.user?.phone}</div>
                                            </td>
                                            <td style={{ fontFamily:'monospace', fontSize:12, letterSpacing:1.5, color:'#1565C0' }}>
                                                {card.card_number
                                                    ? card.card_number.slice(0,4) + ' •••• •••• ' + card.card_number.slice(-4)
                                                    : <span style={{ color:'#ccc' }}>—</span>}
                                            </td>
                                            <td>
                                                {card.nfc_card_uid
                                                    ? <span style={{ color:'#00897B', fontWeight:700, fontSize:11 }}>✓ NFC</span>
                                                    : <span style={{ color:'#FFB300', fontWeight:600, fontSize:11 }}>⚡ À encoder</span>}
                                            </td>
                                            <td>
                                                <span style={{ background:qs.bg, color:qs.color, padding:'2px 8px', borderRadius:6, fontWeight:700, fontSize:11 }}>
                                                    {qs.label}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display:'flex', gap:4 }}>
                                                    <button
                                                        className="btn-secondary btn-sm"
                                                        style={{ fontSize:10, padding:'3px 7px' }}
                                                        disabled={printLoading}
                                                        onClick={e => { e.stopPropagation(); printSingle(card, 'json'); }}
                                                        title="Télécharger JSON">JSON</button>
                                                    <button
                                                        className="btn-secondary btn-sm"
                                                        style={{ fontSize:10, padding:'3px 7px' }}
                                                        disabled={printLoading}
                                                        onClick={e => { e.stopPropagation(); printSingle(card, 'browser'); }}
                                                        title="Imprimer">🖨</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* RIGHT — detail panel */}
                {selected ? (
                    <div style={{
                        width:420, flexShrink:0,
                        display:'flex', flexDirection:'column', gap:12,
                        overflowY:'auto', maxHeight:'100%',
                    }}>
                        {/* Header */}
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                            <div>
                                <div style={{ fontWeight:700, fontSize:15 }}>{selected.user?.name}</div>
                                <div style={{ fontSize:11, color:'#888' }}>{selected.user?.email}</div>
                            </div>
                            <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#aaa', lineHeight:1 }}>×</button>
                        </div>

                        {/* ── Card preview ── */}
                        <div>
                            <div style={{ fontSize:10, fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>Aperçu carte</div>
                            <OmbiaCard
                                name={selected.delivery_meta?.full_name || selected.user?.name}
                                cardNumber={selected.card_number}
                                nfcEncoded={!!selected.nfc_card_uid}
                            />
                        </div>

                        {/* ── NFC encoder ── */}
                        <div style={{ background:'#F8FFFE', border:'1.5px solid #B2DFDB', borderRadius:12, padding:'14px 16px' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                                <div style={{ fontWeight:700, fontSize:13, color:'#00695C' }}>
                                    {selected.nfc_card_uid ? '✓ NFC Encodé' : '⚡ Encoder NFC'}
                                </div>
                                <button
                                    onClick={generateNfc}
                                    disabled={genLoading}
                                    style={{
                                        background:'#00897B', color:'#fff', border:'none',
                                        borderRadius:7, padding:'4px 10px', fontSize:11,
                                        fontWeight:700, cursor:'pointer', opacity: genLoading ? 0.6 : 1,
                                    }}>
                                    {genLoading ? '…' : '⚙ Générer UID'}
                                </button>
                            </div>

                            <div style={{ fontSize:11, color:'#555', marginBottom:8 }}>
                                Compatible ISO 14443-A · MIFARE · NTAG · NXP — tout encodeur NFC
                            </div>

                            <input
                                className="form-input"
                                style={{ fontSize:12, fontFamily:'monospace', marginBottom:6 }}
                                placeholder="04:XX:XX:XX:XX:XX:XX — ou auto-générer →"
                                value={nfcInput}
                                onChange={e => { setNfcInput(e.target.value); setNfcError(''); }}
                            />
                            {nfcError && <div style={{ color:'#C62828', fontSize:11, marginBottom:6 }}>{nfcError}</div>}
                            <button className="btn-approve" style={{ width:'100%' }} onClick={assignNfc} disabled={nfcLoading || !nfcInput.trim()}>
                                {nfcLoading ? '…' : selected.nfc_card_uid ? '↻ Mettre à jour UID' : '⚡ Assigner UID NFC'}
                            </button>

                            {/* NDEF payload */}
                            {selected.nfc_card_uid && (
                                <div style={{ marginTop:10, background:'rgba(0,105,92,0.07)', borderRadius:8, padding:'8px 10px' }}>
                                    <div style={{ fontSize:9, fontWeight:700, color:'#00695C', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>Données NDEF à écrire (ISO/IEC 14443-A)</div>
                                    <div style={{ fontFamily:'monospace', fontSize:10, color:'#333', wordBreak:'break-all', lineHeight:1.6 }}>
                                        {JSON.stringify({ uid: selected.nfc_card_uid, card: selected.card_number, uid_user: selected.user_id })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Print formats ── */}
                        <div style={{ background:'#F8F9FB', border:'1px solid #E8EAF0', borderRadius:12, padding:'14px 16px' }}>
                            <div style={{ fontWeight:700, fontSize:13, color:'#1C2E4A', marginBottom:10 }}>Formats d'impression</div>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                                {PRINTER_FORMATS.map(f => (
                                    <button
                                        key={f.key}
                                        onClick={() => printSingle(selected, f.key)}
                                        disabled={printLoading}
                                        style={{
                                            border:'1.5px solid #E8EAF0', borderRadius:9, padding:'10px 8px',
                                            background:'#fff', cursor:'pointer', textAlign:'left',
                                            opacity: printLoading ? 0.6 : 1,
                                        }}>
                                        <div style={{ fontWeight:700, fontSize:12, color:'#1C2E4A', marginBottom:2 }}>
                                            {f.key === 'browser' ? '🖨' : '⬇'} {f.label}
                                        </div>
                                        <div style={{ fontSize:10, color:'#888' }}>{f.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ── Status pipeline ── */}
                        <div style={{ background:'#fff', border:'1px solid #E8EAF0', borderRadius:12, padding:'14px 16px' }}>
                            <div style={{ fontWeight:700, fontSize:13, color:'#1C2E4A', marginBottom:10 }}>Pipeline de production</div>
                            <div style={{ display:'flex', gap:0, alignItems:'center' }}>
                                {Object.entries(QUEUE_STATUS).map(([k, v], i, arr) => {
                                    const active = selected.physical_card_status === k;
                                    return (
                                        <div key={k} style={{ display:'flex', alignItems:'center', flex: i < arr.length-1 ? 1 : 'unset' }}>
                                            <button
                                                onClick={() => setStatus(selected.id, k)}
                                                disabled={statusLoading || active}
                                                style={{
                                                    border: active ? `2px solid ${v.color}` : '1.5px solid #E8EAF0',
                                                    borderRadius:8, padding:'6px 10px',
                                                    background: active ? v.bg : '#fff',
                                                    color: active ? v.color : '#888',
                                                    fontSize:11, fontWeight: active ? 800 : 500,
                                                    cursor: active ? 'default' : 'pointer',
                                                    whiteSpace:'nowrap',
                                                }}>
                                                {v.label}
                                            </button>
                                            {i < arr.length-1 && <div style={{ flex:1, height:1.5, background:'#E8EAF0', minWidth:6 }} />}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── Delivery info ── */}
                        {selected.delivery_meta && (
                            <div style={{ background:'#fff', border:'1px solid #E8EAF0', borderRadius:12, padding:'14px 16px' }}>
                                <div style={{ fontWeight:700, fontSize:13, color:'#1C2E4A', marginBottom:8 }}>Livraison</div>
                                {[
                                    ['Nom',       selected.delivery_meta.full_name],
                                    ['Téléphone', selected.delivery_meta.phone],
                                    ['Adresse',   selected.delivery_meta.address],
                                ].filter(([, v]) => v).map(([l, v]) => (
                                    <div key={l} style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                                        <span style={{ color:'#888' }}>{l}</span>
                                        <span style={{ fontWeight:600 }}>{v}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{
                        width:420, flexShrink:0,
                        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                        border:'2px dashed #E8EAF0', borderRadius:14, color:'#C8D0D8',
                    }}>
                        <div style={{ fontSize:40, marginBottom:8 }}>💳</div>
                        <div style={{ fontSize:14, fontWeight:600 }}>Sélectionner une carte</div>
                        <div style={{ fontSize:12, marginTop:4 }}>pour voir l'aperçu et encoder le NFC</div>
                    </div>
                )}
            </div>
        </div>
    );
}
