import React, { useState } from 'react';
import { Home, Zap, Settings, Users, LogOut } from 'lucide-react'; 

// FIX: Assuming all dashboard components are located inside a 'components' subdirectory.
import CustomerRewardsDashboard from './components/CustomerRewardsDashboard'; 
import MerchantAdminDashboard from './components/MerchantAdminDashboard'; 
import CustomerLoyaltyView from './components/CustomerLoyaltyView'; 

// Define states for different views
const VIEW_STATES = {
    HOME: 'home',
    CUSTOMER_LOGIN: 'customer_login',
    CUSTOMER_DASHBOARD: 'customer_dashboard',
    MERCHANT_DASHBOARD: 'merchant_dashboard',
};

const AppEntry = () => {
    // Current application view state (home, login, customer_dashboard, merchant_dashboard)
    const [view, setView] = useState(VIEW_STATES.HOME); 
    // State to hold the currently logged-in user (customer or mock merchant)
    const [currentUser, setCurrentUser] = useState(null); 

    // Function to handle successful customer login (from CustomerLoyaltyView)
    const handleLoginSuccess = (user) => {
        setCurrentUser(user);
        setView(VIEW_STATES.CUSTOMER_DASHBOARD);
    };

    // Function to handle logout/go back to home
    const handleLogout = () => {
        setCurrentUser(null);
        setView(VIEW_STATES.HOME);
    };

    // Mock access for merchant role, skipping the separate merchant login for now
    const handleMerchantAccess = () => {
        const mockMerchant = { 
            id: 'admin001', 
            name: 'Merchant Admin', 
            role: 'merchant' 
        };
        // Ensure state is set before changing view
        setCurrentUser(mockMerchant); 
        setView(VIEW_STATES.MERCHANT_DASHBOARD);
    };

    const renderContent = () => {
        const userRole = currentUser?.role ?? null;

        switch (view) {
            case VIEW_STATES.CUSTOMER_LOGIN:
                // Pass the success handler to the login component
                return <CustomerLoyaltyView onLoginSuccess={handleLoginSuccess} onBack={handleLogout} />;

            case VIEW_STATES.CUSTOMER_DASHBOARD:
                // Pass the authenticated user object to the dashboard
                return <CustomerRewardsDashboard user={currentUser} onLogout={handleLogout} />;
                
            case VIEW_STATES.MERCHANT_DASHBOARD:
                // Pass the user's role and logout handler for RBAC check
                return (
                    <MerchantAdminDashboard 
                        currentUserRole={userRole} 
                        onLogout={handleLogout}
                    />
                );

            case VIEW_STATES.HOME:
            default:
                return (
                    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-['Inter']">
                        <div className="w-full max-w-lg bg-white p-10 rounded-xl shadow-2xl space-y-8 text-center">
                            <h1 className="text-4xl font-extrabold text-gray-900 flex items-center justify-center">
                                <Zap className="w-10 h-10 mr-3 text-indigo-600" />
                                Localized Loyalty Platform 
                            </h1>
                            <p className="text-gray-600 text-lg">
                                Please select your role to access the application interface.
                            </p>

                            <div className="space-y-4 pt-4">
                                <button
                                    onClick={() => setView(VIEW_STATES.CUSTOMER_LOGIN)}
                                    className="w-full flex items-center justify-center px-6 py-4 bg-indigo-600 text-white rounded-lg shadow-lg hover:bg-indigo-700 transition duration-150 text-xl font-semibold"
                                >
                                    <Users className="w-6 h-6 mr-3" />
                                    Customer Loyalty App 
                                </button>
                                <button
                                    onClick={handleMerchantAccess}
                                    className="w-full flex items-center justify-center px-6 py-4 bg-gray-700 text-white rounded-lg shadow-lg hover:bg-gray-800 transition duration-150 text-xl font-semibold"
                                >
                                    <Settings className="w-6 h-6 mr-3" />
                                    Merchant Admin Dashboard 
                                </button>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="font-['Inter']">
            {/* Show Go Home button only if not on the main home screen */}
            {view !== VIEW_STATES.HOME && (
                <button
                    onClick={handleLogout}
                    className="fixed top-4 left-4 z-50 flex items-center px-4 py-2 bg-white text-gray-800 rounded-full shadow-md hover:bg-gray-100 transition duration-150 text-sm font-medium shadow-lg"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    {view === VIEW_STATES.CUSTOMER_LOGIN ? 'Go Back ' : 'Logout '}
                </button>
            )}
            {renderContent()}
        </div>
    );
};

export default AppEntry;
