import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Vehicles from './pages/Vehicles';
import Rides from './pages/Rides';
import RentalCars from './pages/RentalCars';
import RentalBookings from './pages/RentalBookings';
import Settings from './pages/Settings';
import Coupons from './pages/Coupons';
import WalletFeatures from './pages/WalletFeatures';
import CommissionRules from './pages/CommissionRules';
import CashbackSettings from './pages/CashbackSettings';
import DriverVerifications from './pages/DriverVerifications';
import CarVerifications from './pages/CarVerifications';
import MerchantVerifications from './pages/MerchantVerifications';
import FleetVerifications from './pages/FleetVerifications';
import CourierVerifications from './pages/CourierVerifications';
import StoreVerifications from './pages/StoreVerifications';
import CarListings from './pages/CarListings';
import Products from './pages/Products';
import Orders from './pages/Orders';
import CardPrinting from './pages/CardPrinting';
import Ratings from './pages/Ratings';
import Deliveries from './pages/Deliveries';
import Support from './pages/Support';
import Roles from './pages/Roles';
import Employees from './pages/Employees';
import Layout from './components/Layout';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        setIsAuthenticated(!!token);
        setLoading(false);
    }, []);

    if (loading) return <div>Loading...</div>;

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login setIsAuthenticated={setIsAuthenticated} />} />
                <Route path="/" element={isAuthenticated ? <Layout setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/login" replace />}>
                    <Route index element={<Dashboard />} />
                    <Route path="users" element={<Users />} />
                    <Route path="vehicles" element={<Vehicles />} />
                    <Route path="rides" element={<Rides />} />
                    <Route path="rental-cars" element={<RentalCars />} />
                    <Route path="rental-bookings" element={<RentalBookings />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="coupons" element={<Coupons />} />
                    <Route path="wallet-features" element={<WalletFeatures />} />
                    <Route path="commission-rules" element={<CommissionRules />} />
                    <Route path="cashback" element={<CashbackSettings />} />
                    <Route path="kyc/drivers"   element={<DriverVerifications />} />
                    <Route path="kyc/cars"      element={<CarVerifications />} />
                    <Route path="kyc/merchants" element={<MerchantVerifications />} />
                    <Route path="kyc/stores"    element={<StoreVerifications />} />
                    <Route path="kyc/fleet"     element={<FleetVerifications />} />
                    <Route path="kyc/couriers"  element={<CourierVerifications />} />
                    <Route path="car-listings" element={<CarListings />} />
                    <Route path="products"     element={<Products />} />
                    <Route path="orders"        element={<Orders />} />
                    <Route path="card-printing" element={<CardPrinting />} />
                    <Route path="ratings"       element={<Ratings />} />
                    <Route path="deliveries"    element={<Deliveries />} />
                    <Route path="support"       element={<Support />} />
                    <Route path="roles"         element={<Roles />} />
                    <Route path="employees"     element={<Employees />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
