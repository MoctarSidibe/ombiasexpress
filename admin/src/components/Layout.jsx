import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
    ChartPieSlice, Users, Truck, RoadHorizon,
    Car, ShoppingBag, ShoppingCart, Key, ClipboardText,
    Tag, Wallet, Gear, IdentificationCard,
    Storefront, Van, Percent, Gift, SignOut, CreditCard, Package, Star, Headset,
    Shield, UsersFour, List, X,
} from '@phosphor-icons/react';
import { can, isSuperAdmin, getAdminUser } from '../permissions';
import { adminLogout } from '../api';
import './Layout.css';

function Layout({ setIsAuthenticated }) {
    const navigate  = useNavigate();
    const location  = useLocation();
    const adminUser = getAdminUser();
    const superAdmin = isSuperAdmin();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = async () => {
        await adminLogout();
        setIsAuthenticated(false);
        navigate('/login');
    };

    const closeSidebar = () => setSidebarOpen(false);

    const isActive = (path) =>
        path === '/'
            ? location.pathname === '/'
            : location.pathname === path || location.pathname.startsWith(path + '/');

    const NavLink = ({ to, icon: Icon, label, perm }) => {
        if (perm && !can(perm)) return null;
        return (
            <Link to={to} className={isActive(to) ? 'nav-link active' : 'nav-link'} onClick={closeSidebar}>
                <Icon size={17} weight={isActive(to) ? 'fill' : 'regular'} />
                <span>{label}</span>
            </Link>
        );
    };

    return (
        <div className="layout">
            {/* Mobile topbar */}
            <div className="mobile-topbar">
                <button className="hamburger" onClick={() => setSidebarOpen(o => !o)}>
                    {sidebarOpen ? <X size={22} /> : <List size={22} />}
                </button>
                <img src="/logo.png" alt="Ombia" className="mobile-logo" />
                <span className="mobile-title">Ombia Express</span>
            </div>

            {/* Overlay */}
            {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}

            <nav className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-brand">
                        <div className="sidebar-logo-wrap">
                            {/* Pulse rings */}
                            <div className="pulse-ring pulse-ring-1" />
                            <div className="pulse-ring pulse-ring-2" />
                            <div className="pulse-ring pulse-ring-3" />
                            <img src="/logo.png" alt="Ombia" className="sidebar-logo-img" />
                        </div>
                        <p>Panneau d'administration</p>
                    </div>
                </div>

                {/* Staff identity badge */}
                {!superAdmin && adminUser?.staffData && (
                    <div style={{ margin: '0 12px 12px', padding: '10px 12px', background: (adminUser.staffData.role_color || '#1565C0') + '14', borderRadius: 10, border: `1px solid ${adminUser.staffData.role_color || '#1565C0'}30` }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: adminUser.staffData.role_color || '#1565C0', textTransform: 'uppercase', letterSpacing: 0.5 }}>{adminUser.staffData.role_name}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginTop: 2 }}>{adminUser.name}</div>
                        {adminUser.staffData.department && <div style={{ fontSize: 11, color: '#9CA3AF' }}>{adminUser.staffData.department}</div>}
                    </div>
                )}

                <div className="nav-section">
                    <p className="nav-section-label">GÉNÉRAL</p>
                    <NavLink to="/" icon={ChartPieSlice} label="Tableau de bord" perm="dashboard" />
                    <NavLink to="/users" icon={Users} label="Utilisateurs" perm="users" />
                    <NavLink to="/vehicles" icon={Truck} label="Véhicules" perm="rides" />
                    <NavLink to="/ratings" icon={Star} label="Évaluations" perm="ratings" />
                </div>

                <div className="nav-section">
                    <p className="nav-section-label">SERVICES</p>
                    <NavLink to="/rides" icon={RoadHorizon} label="Courses" perm="rides" />
                    <NavLink to="/rental-cars" icon={Key} label="Location voitures" perm="rentals" />
                    <NavLink to="/rental-bookings" icon={ClipboardText} label="Réservations location" perm="rentals" />
                    <NavLink to="/deliveries" icon={Package} label="Livraisons" perm="deliveries" />
                </div>

                <div className="nav-section">
                    <p className="nav-section-label">MARCHÉ</p>
                    <NavLink to="/car-listings" icon={Car} label="Annonces Auto" perm="car_listings" />
                    <NavLink to="/products" icon={ShoppingBag} label="Produits" perm="products" />
                    <NavLink to="/orders" icon={ShoppingCart} label="Commandes" perm="orders" />
                </div>

                <div className="nav-section">
                    <p className="nav-section-label">VÉRIFICATIONS KYC</p>
                    <NavLink to="/kyc/drivers"   icon={IdentificationCard} label="Chauffeurs"     perm="kyc" />
                    <NavLink to="/kyc/cars"      icon={Car}              label="Véhicules"     perm="kyc" />
                    <NavLink to="/kyc/merchants" icon={Storefront}       label="Marchands"     perm="kyc" />
                    <NavLink to="/kyc/stores"    icon={ShoppingBag}      label="Boutiques"     perm="kyc" />
                    <NavLink to="/kyc/fleet"     icon={Van}              label="Flotte Ombia"  perm="kyc" />
                    <NavLink to="/kyc/couriers"  icon={Package}          label="Coursiers"     perm="kyc" />
                </div>

                <div className="nav-section">
                    <p className="nav-section-label">SUPPORT</p>
                    <NavLink to="/support" icon={Headset} label="Support client" perm="support" />
                </div>

                <div className="nav-section">
                    <p className="nav-section-label">FINANCE</p>
                    <NavLink to="/wallet-features" icon={Wallet} label="Portefeuilles" perm="wallet" />
                    <NavLink to="/card-printing"  icon={CreditCard} label="Impression Cartes" perm="card_printing" />
                    <NavLink to="/coupons" icon={Tag} label="Coupons" perm="coupons" />
                    <NavLink to="/commission-rules" icon={Percent} label="Commissions" perm="commissions" />
                    <NavLink to="/cashback" icon={Gift} label="Cashback & Points" perm="cashback" />
                </div>

                <div className="nav-section">
                    <p className="nav-section-label">SYSTÈME</p>
                    <NavLink to="/settings" icon={Gear} label="Paramètres" perm="settings" />
                    {superAdmin && <NavLink to="/employees" icon={UsersFour} label="Employés" />}
                    {superAdmin && <NavLink to="/roles" icon={Shield} label="Rôles & Permissions" />}
                </div>

                <button onClick={handleLogout} className="logout-button">
                    <SignOut size={17} />
                    <span>Déconnexion</span>
                </button>
            </nav>

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}

export default Layout;
