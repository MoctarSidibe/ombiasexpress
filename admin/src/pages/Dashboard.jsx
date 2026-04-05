import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import {
    LineChart, Line, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
    ArrowsClockwise,
    Users, UserCheck, Taxi, CarSimple,
    RoadHorizon, CheckCircle, Timer, Clock, XCircle,
    Car, Key, CalendarCheck, Warehouse,
    ShoppingBag, ShoppingCart, Package, Truck,
    CurrencyCircleDollar, TrendUp, Wallet,
    IdentificationCard, Certificate, Storefront, Van,
    Warning, ArrowUpRight,
    ChartLine, ChartBar,
    Spinner, CreditCard, Broadcast, Printer,
} from '@phosphor-icons/react';
import './Dashboard.css';

// ── helpers ────────────────────────────────────────────────────────────────────

const xaf = (n) => Number(n || 0).toLocaleString('fr-FR') + ' XAF';
const num = (n) => Number(n || 0).toLocaleString('fr-FR');

const METHOD_META = {
    ombia_wallet: { label: 'Portefeuille Ombia', color: '#1565C0' },
    airtel_money: { label: 'Airtel Money',        color: '#E53935' },
    moov_money:   { label: 'Moov Money',          color: '#FB8C00' },
    bank_card:    { label: 'Carte bancaire',       color: '#43A047' },
    cash:         { label: 'Espèces',              color: '#8E24AA' },
    wallet:       { label: 'Portefeuille Ombia',   color: '#1565C0' },
    card:         { label: 'Carte bancaire',       color: '#43A047' },
};

// ── reusable pieces ────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, label, color }) {
    return (
        <div className="section-hd">
            <div className="section-hd-icon" style={{ background: color + '18' }}>
                <Icon size={16} color={color} weight="fill" />
            </div>
            <span className="section-hd-label" style={{ color }}>{label}</span>
            <div className="section-hd-line" />
        </div>
    );
}

function SummaryCard({ icon: Icon, label, value, sub, trend, trendUp, accent }) {
    return (
        <div className="summary-card">
            <div className="summary-icon" style={{ background: accent + '15' }}>
                <Icon size={22} color={accent} weight="fill" />
            </div>
            <div className="summary-body">
                <p className="summary-label">{label}</p>
                <p className="summary-value">{value}</p>
                {sub && <p className="summary-sub">{sub}</p>}
                {trend && (
                    <div className="summary-trend" style={{ color: trendUp ? '#16A34A' : '#9AA3B0' }}>
                        {trendUp && <ArrowUpRight size={12} weight="bold" />}
                        <span>{trend}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, iconBg, iconColor, label, value, sub }) {
    return (
        <div className="stat-card">
            <div className="stat-card-header">
                <p className="stat-label">{label}</p>
                <div className="stat-icon" style={{ background: iconBg }}>
                    <Icon size={15} color={iconColor} weight="fill" />
                </div>
            </div>
            <p className="stat-value">{value}</p>
            {sub && <p className="stat-sub">{sub}</p>}
        </div>
    );
}

function KycCard({ icon: Icon, label, count, path, color }) {
    return (
        <Link to={path} className="kyc-card">
            <div className="kyc-card-icon" style={{ background: color + '15' }}>
                <Icon size={20} color={color} weight="fill" />
            </div>
            <div style={{ flex: 1 }}>
                <p className="kyc-card-label">{label}</p>
                <p className="kyc-card-count" style={{ color: count > 0 ? color : '#C8D0D8' }}>
                    {count}
                </p>
            </div>
            {count > 0 && (
                <div className="kyc-pulse" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
            )}
        </Link>
    );
}

// ── custom tooltip ──────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label, formatter }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: '#fff', border: '1px solid #F0F2F5', borderRadius: 10, padding: '8px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }}>
            <p style={{ fontWeight: 700, color: '#0F1D2E', margin: '0 0 4px' }}>{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color, margin: 0 }}>
                    {formatter ? formatter(p.value) : p.value}
                </p>
            ))}
        </div>
    );
};

// ── main ────────────────────────────────────────────────────────────────────────

function Dashboard() {
    const [stats,     setStats]     = useState(null);
    const [ecom,      setEcom]      = useState(null);
    const [loading,   setLoading]   = useState(true);
    const [error,     setError]     = useState(null);
    const [refreshing,setRefreshing]= useState(false);
    const [now,       setNow]       = useState(new Date());

    useEffect(() => {
        load();
        const di = setInterval(() => load(true), 30000);
        const ci = setInterval(() => setNow(new Date()), 60000);
        return () => { clearInterval(di); clearInterval(ci); };
    }, []);

    const load = async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        setError(null);
        try {
            const [r, rO, rP] = await Promise.all([
                api.get('/admin/stats'),
                api.get('/admin/orders',   { params: { limit: 1 } }).catch(() => ({ data: {} })),
                api.get('/admin/products', { params: { limit: 1 } }).catch(() => ({ data: {} })),
            ]);
            setStats(r.data);
            setEcom({ orders: rO.data.stats || {}, products: rP.data.stats || {} });
        } catch (e) {
            console.error('Dashboard load error:', e);
            const status = e.response?.status;
            const msg    = e.response?.data?.error || e.message || 'Erreur inconnue';
            setError(status ? `${status} — ${msg}` : msg);
        }
        finally { setLoading(false); setRefreshing(false); }
    };

    if (loading) return (
        <div className="dash-loading">
            <Spinner size={22} color="#9AA3B0" style={{ animation: 'spin 1s linear infinite' }} />
            Chargement…
        </div>
    );
    if (error || !stats) return (
        <div className="dash-loading" style={{ flexDirection: 'column', gap: 10 }}>
            <span style={{ color: '#E53935', fontWeight: 700 }}>Erreur de chargement</span>
            {error && <span style={{ color: '#6B7280', fontSize: 13 }}>{error}</span>}
            <button onClick={() => load()} style={{ marginTop: 8, padding: '8px 20px', background: '#1565C0', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Réessayer</button>
        </div>
    );

    const totalPendingKyc = stats.kyc?.total || 0;
    const completionRate  = stats.rides.total > 0 ? ((stats.rides.completed / stats.rides.total) * 100).toFixed(1) : '0';

    // Merge payment methods
    const paymentData = (() => {
        const m = {};
        (stats.revenue.byPaymentMethod || []).forEach(row => {
            let k = row.payment_method;
            if (k === 'wallet') k = 'ombia_wallet';
            if (k === 'card')   k = 'bank_card';
            if (!m[k]) m[k] = { key: k, ...(METHOD_META[k] || { label: k, color: '#888' }), total: 0, count: 0 };
            m[k].total += parseFloat(row.total || 0);
            m[k].count += parseInt(row.count  || 0);
        });
        return Object.values(m).sort((a, b) => b.total - a.total);
    })();

    const chartRides = (stats.rides.perDay || []).map(r => ({
        date:  new Date(r.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        count: parseInt(r.count || 0),
    }));

    const totalEcomOrders = ['pending','confirmed','ready','delivered','cancelled']
        .reduce((s, k) => s + (ecom?.orders?.[k] || 0), 0);

    return (
        <div className="dashboard">

            {/* ── Header ── */}
            <div className="dash-header">
                <div className="dash-brand-row">
                    <div>
                        <div className="dash-title-row">
                            <h1 className="dash-title">
                                Tableau de bord&nbsp;<span className="dash-brand-ombia">Ombia</span><span className="dash-brand-express"> Express</span>
                            </h1>
                            {refreshing && <ArrowsClockwise size={16} color="#9AA3B0" style={{ animation: 'spin 1s linear infinite' }} />}
                        </div>
                        <p className="dash-sub">
                            <span className="live-dot" />
                            Mis à jour toutes les 30 s &nbsp;·&nbsp;
                            {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                </div>
                <div className="header-badges">
                    {totalPendingKyc > 0 && (
                        <Link to="/kyc/drivers" className="kyc-alert-banner">
                            <Warning size={14} weight="fill" />
                            {totalPendingKyc} KYC en attente
                            <div className="kyc-alert-dot" />
                        </Link>
                    )}
                    {stats.rides.active > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 700, color: '#1D4ED8' }}>
                            <RoadHorizon size={14} weight="fill" />
                            {stats.rides.active} courses en direct
                        </div>
                    )}
                </div>
            </div>

            {/* ── Summary strip (4 key KPIs) ── */}
            <div className="summary-strip">
                <SummaryCard
                    icon={CurrencyCircleDollar}
                    label="Revenus plateforme"
                    value={xaf(stats.revenue.total)}
                    trend={`+${xaf(stats.revenue.today)} aujourd'hui`}
                    trendUp={stats.revenue.today > 0}
                    accent="#16A34A"
                />
                <SummaryCard
                    icon={Users}
                    label="Utilisateurs"
                    value={num(stats.users.total)}
                    sub={`${stats.users.drivers} chauffeurs · ${stats.users.onlineDrivers} en ligne`}
                    accent="#1D4ED8"
                />
                <SummaryCard
                    icon={RoadHorizon}
                    label="Courses totales"
                    value={num(stats.rides.total)}
                    sub={`${stats.rides.active} actives · ${completionRate}% complétion`}
                    trend={`${stats.rides.today} aujourd'hui`}
                    trendUp={stats.rides.today > 0}
                    accent="#0284C7"
                />
                <SummaryCard
                    icon={ShoppingCart}
                    label="Commandes e-commerce"
                    value={num(totalEcomOrders)}
                    sub={`${ecom?.orders?.pending || 0} en attente · ${ecom?.orders?.delivered || 0} livrées`}
                    trend={ecom?.orders?.total_revenue > 0 ? xaf(ecom.orders.total_revenue) + ' générés' : null}
                    trendUp={true}
                    accent="#7C3AED"
                />
            </div>

            {/* ══ RIDE SHARING ══ */}
            <SectionHeader icon={Taxi} label="Ride Sharing" color="#0284C7" />
            <div className="kpi-grid-5">
                <StatCard icon={RoadHorizon}   iconBg="#EFF6FF" iconColor="#1D4ED8" label="Courses totales"    value={num(stats.rides.total)}    sub={`${stats.rides.today} aujourd'hui`} />
                <StatCard icon={CheckCircle}   iconBg="#F0FDF4" iconColor="#16A34A" label="Complétées"         value={num(stats.rides.completed)} sub={`${completionRate}% du total`} />
                <StatCard icon={Timer}         iconBg="#FFF7ED" iconColor="#EA580C" label="Actives maintenant" value={stats.rides.active}         sub={`${stats.users.onlineDrivers} chauffeurs en ligne`} />
                <StatCard icon={UserCheck}     iconBg="#EFF6FF" iconColor="#1D4ED8" label="Chauffeurs enreg."  value={num(stats.users.drivers)}   sub={`${stats.vehicles.total} véhicules`} />
                <StatCard icon={CurrencyCircleDollar} iconBg="#F0FDF4" iconColor="#16A34A" label="Commission courses" value={xaf(stats.revenue.rideCommission)} sub={`+${xaf(stats.revenue.todayRideCommission)} auj.`} />
            </div>

            {/* ══ CAR RENTAL ══ */}
            <SectionHeader icon={Key} label="Location de Véhicules" color="#EA580C" />
            <div className="kpi-grid-4">
                <StatCard icon={Car}          iconBg="#FFF7ED" iconColor="#EA580C" label="Véhicules listés"    value={num(stats.rentals?.total || 0)}         sub={`${stats.rentals?.available || 0} disponibles`} />
                <StatCard icon={CalendarCheck} iconBg="#FFF7ED" iconColor="#EA580C" label="Réservations totales" value={num(stats.rentals?.totalBookings || 0)} sub={`${stats.rentals?.activeBookings || 0} actives`} />
                <StatCard icon={Warehouse}    iconBg="#FFF7ED" iconColor="#EA580C" label="Actives maintenant"  value={stats.rentals?.activeBookings || 0}     sub="Locations en cours" />
                <StatCard icon={TrendUp}      iconBg="#F0FDF4" iconColor="#16A34A" label="Commission location" value={xaf(stats.revenue.rentalCommission)}    sub={`+${xaf(stats.revenue.todayRentalCommission)} auj.`} />
            </div>

            {/* ══ LIVRAISONS ══ */}
            <SectionHeader icon={Package} label="Livraisons" color="#0D9488" />
            <div className="kpi-grid-5">
                <StatCard icon={Package}      iconBg="#CCFBF1" iconColor="#0D9488" label="Livraisons totales"   value={num(stats.deliveries?.total || 0)}     sub={`${stats.deliveries?.today || 0} aujourd'hui`} />
                <StatCard icon={Clock}        iconBg="#FFF7ED" iconColor="#EA580C" label="En attente"           value={num(stats.deliveries?.pending || 0)}   sub="Aucun coursier assigné" />
                <StatCard icon={Timer}        iconBg="#EFF6FF" iconColor="#1D4ED8" label="En cours"             value={num(stats.deliveries?.active || 0)}    sub="Acceptées ou récupérées" />
                <StatCard icon={CheckCircle}  iconBg="#F0FDF4" iconColor="#16A34A" label="Livrées"              value={num(stats.deliveries?.completed || 0)} sub={`${stats.deliveries?.cancelled || 0} annulées`} />
                <StatCard icon={CurrencyCircleDollar} iconBg="#F0FDF4" iconColor="#16A34A" label="Revenu livraisons" value={xaf(stats.deliveries?.revenue || 0)} sub={`+${xaf(stats.deliveries?.todayRevenue || 0)} auj.`} />
            </div>

            {/* ══ E-COMMERCE & MARCHÉS ══ */}
            <SectionHeader icon={ShoppingBag} label="E-commerce & Marchés" color="#7C3AED" />
            <div className="kpi-grid-5">
                <StatCard icon={ShoppingBag}  iconBg="#F5F3FF" iconColor="#7C3AED" label="Produits actifs"     value={num(ecom?.products?.active || 0)}        sub={`${ecom?.products?.paused || 0} pausés`} />
                <StatCard icon={ShoppingCart} iconBg="#F5F3FF" iconColor="#7C3AED" label="Commandes totales"   value={num(totalEcomOrders)}                    sub={`${ecom?.orders?.pending || 0} en attente`} />
                <StatCard icon={Package}      iconBg="#FFF7ED" iconColor="#D97706" label="En préparation"      value={num((ecom?.orders?.confirmed || 0) + (ecom?.orders?.ready || 0))} sub={`${ecom?.orders?.ready || 0} prêtes`} />
                <StatCard icon={Truck}        iconBg="#F0FDF4" iconColor="#16A34A" label="Livrées"             value={num(ecom?.orders?.delivered || 0)}       sub={`${ecom?.orders?.cancelled || 0} annulées`} />
                <StatCard icon={CurrencyCircleDollar} iconBg="#F0FDF4" iconColor="#16A34A" label="Revenu e-commerce" value={xaf(ecom?.orders?.total_revenue || 0)} sub="Commandes livrées" />
            </div>

            {/* ══ KYC ══ */}
            <SectionHeader
                icon={Certificate}
                label="Vérifications KYC en attente"
                color={totalPendingKyc > 0 ? '#DC2626' : '#16A34A'}
            />
            <div className="kyc-grid">
                <KycCard icon={IdentificationCard} label="Chauffeurs"       count={stats.kyc?.pendingDrivers   || 0} path="/kyc/drivers"   color="#1D4ED8" />
                <KycCard icon={CarSimple}           label="Véhicules en loc" count={stats.kyc?.pendingCars      || 0} path="/kyc/cars"      color="#EA580C" />
                <KycCard icon={Storefront}          label="Marchands"        count={stats.kyc?.pendingMerchants || 0} path="/kyc/merchants" color="#0D9488" />
                <KycCard icon={Van}                 label="Flotte Ombia"     count={stats.kyc?.pendingFleet     || 0} path="/kyc/fleet"     color="#D97706" />
            </div>

            {/* ══ WALLETS & NFC CARDS ══ */}
            <SectionHeader icon={CreditCard} label="Portefeuilles & Cartes NFC" color="#00695C" />
            <div className="kpi-grid-5">
                <StatCard
                    icon={Wallet}
                    iconBg="#E0F2F1" iconColor="#00695C"
                    label="Solde total portefeuilles"
                    value={xaf(stats.wallets?.totalBalance || 0)}
                    sub={`${num(stats.wallets?.total || 0)} portefeuilles actifs`}
                />
                <StatCard
                    icon={CreditCard}
                    iconBg="#FFF3E0" iconColor="#E65100"
                    label="Cartes en attente"
                    value={num(stats.wallets?.pendingCards || 0)}
                    sub="Commandes à traiter"
                />
                <StatCard
                    icon={Printer}
                    iconBg="#E3F2FD" iconColor="#1565C0"
                    label="En cours d'impression"
                    value={num(stats.wallets?.printingCards || 0)}
                    sub={`${num(stats.wallets?.shippedCards || 0)} expédiées`}
                />
                <StatCard
                    icon={Broadcast}
                    iconBg="#E8F5E9" iconColor="#2E7D32"
                    label="Cartes livrées"
                    value={num(stats.wallets?.deliveredCards || 0)}
                    sub="NFC actives chez clients"
                />
                <Link to="/card-printing" style={{ textDecoration:'none' }}>
                    <div className="stat-card" style={{ border:'2px dashed #E65100', background:'#FFF3E0', cursor:'pointer' }}>
                        <div className="stat-card-header">
                            <p className="stat-label" style={{ color:'#E65100' }}>File d'impression</p>
                            <div className="stat-icon" style={{ background:'rgba(230,81,0,0.12)' }}>
                                <Printer size={15} color="#E65100" weight="fill" />
                            </div>
                        </div>
                        <p className="stat-value" style={{ color:'#E65100' }}>{num(stats.wallets?.inProduction || 0)}</p>
                        <p className="stat-sub" style={{ color:'#E65100', fontWeight:700 }}>→ Gérer les cartes</p>
                    </div>
                </Link>
            </div>

            {/* ══ CHARTS ══ */}
            <SectionHeader icon={ChartLine} label="Activité & Revenus" color="#1C2E4A" />
            <div className="charts-row">

                {/* Line chart – rides per day */}
                <div className="chart-card">
                    <div className="chart-header">
                        <div>
                            <p className="chart-title">Courses — 7 derniers jours</p>
                            <p className="chart-sub">Évolution quotidienne</p>
                        </div>
                        <ChartLine size={18} color="#9AA3B0" />
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={chartRides} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#B0B8C1' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#B0B8C1' }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip formatter={v => `${v} course${v > 1 ? 's' : ''}`} />} />
                            <Line
                                type="monotone" dataKey="count" stroke="#0284C7" strokeWidth={2.5}
                                dot={{ r: 4, fill: '#0284C7', strokeWidth: 0 }}
                                activeDot={{ r: 6, fill: '#0284C7', strokeWidth: 2, stroke: '#fff' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Payment methods breakdown */}
                <div className="chart-card">
                    <div className="chart-header">
                        <div>
                            <p className="chart-title">Paiements par méthode</p>
                            <p className="chart-sub">Revenus cumulés (XAF)</p>
                        </div>
                        <Wallet size={18} color="#9AA3B0" weight="fill" />
                    </div>
                    {paymentData.length === 0 ? (
                        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C8D0D8', fontSize: 13 }}>
                            Aucune transaction
                        </div>
                    ) : (
                        <>
                            <ResponsiveContainer width="100%" height={160}>
                                <BarChart data={paymentData} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" />
                                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#B0B8C1' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: '#B0B8C1' }} axisLine={false} tickLine={false} tickFormatter={v => v > 999 ? `${(v/1000).toFixed(0)}k` : v} />
                                    <Tooltip content={<CustomTooltip formatter={v => xaf(v)} />} />
                                    <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={40}>
                                        {paymentData.map(e => <Cell key={e.key} fill={e.color} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                            <div className="pay-list" style={{ marginTop: 14 }}>
                                {paymentData.map(d => (
                                    <div key={d.key} className="pay-row">
                                        <div className="pay-dot" style={{ background: d.color }} />
                                        <span className="pay-method">{d.label}</span>
                                        <span className="pay-amount">{xaf(d.total)}</span>
                                        <span className="pay-count">{d.count}x</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

            </div>

            <div style={{ height: 32 }} />
        </div>
    );
}

export default Dashboard;
