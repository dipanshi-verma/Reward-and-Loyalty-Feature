import React, { useState, useEffect, useCallback } from 'react';
import {
    Trophy, Users, DollarSign, Gift, Zap, Share2, LogOut, CheckCircle, XCircle, Gamepad, Clock, Settings, TrendingUp
} from 'lucide-react';

// --- Configuration ---
// Note: In a real Shopify app, this URL would point to your hosted backend API.
const API_BASE_URL = 'http://localhost:5000/api'; 
const TIER_THRESHOLDS = {
    Gold: 10000,
    Silver: 5000,
    Bronze: 1000,
};

// --- Helper Components ---

const RewardAlert = ({ message, type, onClose }) => {
    if (!message) return null;
    const Icon = type === 'success' ? CheckCircle : XCircle;
    const color = type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';

    return (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-xl ${color} flex items-center z-50`}>
            <Icon className="w-5 h-5 mr-3" />
            <span className="font-medium">{message}</span>
            <button onClick={onClose} className="ml-4 font-bold text-lg">&times;</button>
        </div>
    );
};

const Button = ({ children, onClick, className = '', disabled, type = 'button' }) => (
    <button
        onClick={onClick}
        type={type}
        disabled={disabled}
        className={`flex items-center justify-center px-4 py-2 font-semibold text-sm rounded-lg shadow-md transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
        {children}
    </button>
);


// --- Tic-Tac-Toe Game Logic ---

const calculateWinner = (squares) => {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6],
    ];
    for (let i = 0; i < lines.length; i++) {
        const [a, b, c] = lines[i];
        if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
            return squares[a];
        }
    }
    return null;
};

const Board = ({ squares, onClick }) => (
    <div className="grid grid-cols-3 w-64 h-64 mx-auto border border-gray-400">
        {squares.map((square, i) => (
            <button
                key={i}
                className="w-full h-full text-4xl font-extrabold flex items-center justify-center border border-gray-300 hover:bg-indigo-50 transition duration-150"
                onClick={() => onClick(i)}
                disabled={square !== null}
            >
                <span className={square === 'X' ? 'text-indigo-600' : 'text-red-600'}>
                    {square}
                </span>
            </button>
        ))}
    </div>
);

const TicTacToe = ({ onGameComplete, customerId, lastPlayDate }) => {
    const [history, setHistory] = useState([Array(9).fill(null)]);
    const [stepNumber, setStepNumber] = useState(0);
    const [status, setStatus] = useState('Next player: X');
    const [rewardStatus, setRewardStatus] = useState(null);
    
    const currentSquares = history[stepNumber];
    const winner = calculateWinner(currentSquares);
    const isDraw = stepNumber === 9 && !winner;

    // Check if player has already played today
    const hasPlayedToday = lastPlayDate && new Date(lastPlayDate).toDateString() === new Date().toDateString();

    const handleClick = useCallback(async (i) => {
        if (winner || isDraw || currentSquares[i] || hasPlayedToday) {
            return;
        }

        // 1. Player's Move (X)
        const newHistory = history.slice(0, stepNumber + 1);
        const squares = [...currentSquares];
        squares[i] = 'X';
        
        const nextStepNumber = newHistory.length;
        setHistory([...newHistory, squares]);
        setStepNumber(nextStepNumber);

        const newWinner = calculateWinner(squares);
        const newDraw = nextStepNumber === 9 && !newWinner;

        if (newWinner) {
            setStatus(`Winner: ${newWinner}`);
            return;
        }
        if (newDraw) {
            setStatus('Game is a Draw!');
            return;
        }
        
        // 2. Computer's Move (O)
        if (nextStepNumber < 9) {
            // Delay AI move for better UX
            setTimeout(() => {
                const aiSquares = [...squares];
                const availableMoves = aiSquares.map((val, index) => val === null ? index : null).filter(val => val !== null);
                
                if (availableMoves.length > 0) {
                    const randomMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
                    aiSquares[randomMove] = 'O';
                    
                    const aiWinner = calculateWinner(aiSquares);
                    
                    setHistory(prevHistory => [...prevHistory, aiSquares]);
                    setStepNumber(prevStep => {
                        const newStep = prevStep + 1;
                        
                        if (aiWinner) {
                            setStatus(`Winner: ${aiWinner}`);
                        } else if (availableMoves.length === 1 && newStep === 9) { 
                             setStatus('Game is a Draw!');
                        } else {
                            setStatus('Next player: X');
                        }
                        return newStep;
                    });
                }
            }, 500);
        }
    }, [currentSquares, history, stepNumber, winner, isDraw, hasPlayedToday]);

    // Handle Reward when game is finished
    useEffect(() => {
        const finalWinner = calculateWinner(currentSquares);
        const finalDraw = stepNumber === 9 && !finalWinner;
        
        if (finalWinner || finalDraw) {
            if (hasPlayedToday) return; // Only grant reward once per day

            // Call API to grant daily reward
            const grantReward = async () => {
                setRewardStatus('Granting daily reward...');
                try {
                    const token = localStorage.getItem('userToken'); // Get token for auth
                    const response = await fetch(`${API_BASE_URL}/loyalty/daily-reward`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`, // Added Authorization
                        },
                        body: JSON.stringify({ customerId }),
                    });
                    const data = await response.json();

                    if (response.ok) {
                        setRewardStatus(null);
                        onGameComplete(data.profileData, `Daily reward granted: ${data.pointsAwarded} points!`, 'success');
                    } else {
                         setRewardStatus(null);
                         const message = data.message || 'Failed to claim reward.';
                         onGameComplete(null, message, 'error');
                    }
                } catch (e) {
                    setRewardStatus(null);
                    onGameComplete(null, 'Network error while claiming reward.', 'error');
                }
            };

            if ((finalWinner || finalDraw) && !hasPlayedToday) {
                 grantReward();
            }
        }
    }, [currentSquares, stepNumber, hasPlayedToday, customerId, onGameComplete]);

    const resetGame = () => {
        setHistory([Array(9).fill(null)]);
        setStepNumber(0);
        setStatus('Next player: X');
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg space-y-4 max-w-sm mx-auto">
            <h3 className="text-xl font-bold text-center text-indigo-700">Daily Tic-Tac-Toe Reward</h3>
            <p className="text-center text-gray-500 text-sm">Play one game per day to earn dynamic points!</p>
            
            <div className={`p-3 rounded-lg text-center font-semibold ${hasPlayedToday ? 'bg-yellow-100 text-yellow-800' : 'bg-indigo-100 text-indigo-800'}`}>
                {hasPlayedToday ? 'Daily reward claimed! Play again tomorrow.' : status}
            </div>
            {rewardStatus && <p className="text-center text-sm text-green-600 font-medium">{rewardStatus}</p>}

            <Board squares={currentSquares} onClick={handleClick} />

            <button onClick={resetGame} className="w-full text-indigo-600 font-semibold hover:text-indigo-800 transition duration-150 flex items-center justify-center">
                <Clock className="w-4 h-4 mr-1" /> Start New Game
            </button>
        </div>
    );
};


// --- Merchant Dashboard Component ---
const MerchantDashboard = ({ onLogout, onUpdate }) => {
    const [points, setPoints] = useState(50); // Default placeholder
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Fetch initial points setting here in a real app
    
    const handleSetReward = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const token = localStorage.getItem('userToken'); // Get token for auth
            const response = await fetch(`${API_BASE_URL}/loyalty/set-daily-reward`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`, // Added Authorization
                },
                body: JSON.stringify({ points }),
            });
            const data = await response.json();

            if (response.ok) {
                setMessage(data.message);
                onUpdate(null, data.message, 'success');
            } else {
                setMessage(data.message || 'Failed to set reward.');
                onUpdate(null, data.message || 'Failed to set reward.', 'error');
            }
        } catch (e) {
            setMessage('Network error: Could not connect to server.');
            onUpdate(null, 'Network error: Could not connect to server.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 font-['Inter']">
            <header className="mb-8 border-b pb-4 flex justify-between items-center">
                <h1 className="text-3xl font-extrabold text-gray-900 flex items-center">
                    <Settings className="w-8 h-8 mr-2 text-red-600" />
                    Merchant Admin Panel
                </h1>
                <Button onClick={onLogout} className="bg-red-500 text-white hover:bg-red-600 text-xs">
                    <LogOut className="w-4 h-4 mr-1" /> Logout
                </Button>
            </header>

            <div className="max-w-xl mx-auto bg-white p-8 rounded-xl shadow-2xl border border-gray-200">
                <h2 className="text-2xl font-bold text-red-700 mb-6 flex items-center">
                    <TrendingUp className="w-6 h-6 mr-2" /> Daily Reward Configuration
                </h2>
                <p className="text-gray-600 mb-6">
                    Set the number of points customers receive for playing the Daily Tic-Tac-Toe game.
                </p>

                <form className="space-y-6" onSubmit={handleSetReward}>
                    <div>
                        <label htmlFor="rewardPoints" className="block text-sm font-medium text-gray-700">
                            Points per Daily Game Win/Draw
                        </label>
                        <input
                            id="rewardPoints"
                            type="number"
                            required
                            min="1"
                            value={points}
                            onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
                            className="mt-1 w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500 text-lg"
                        />
                    </div>
                    
                    <Button
                        type="submit"
                        disabled={loading || points <= 0}
                        className="w-full bg-red-600 text-white hover:bg-red-700"
                    >
                        {loading ? 'Saving...' : `Set Reward to ${points} Points`}
                    </Button>
                </form>

                {message && <div className="mt-6 p-3 bg-red-50 rounded-lg text-sm text-red-700">{message}</div>}
            </div>
        </div>
    );
};


// --- Customer Dashboard Component ---

const CustomerDashboard = ({ customer, onLogout, onReward }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(false);

    // Default values if customer or its properties are null/undefined (THE FIX)
    const safeCustomer = customer || {};
    const totalPoints = safeCustomer.totalPoints || 0;
    const lifetimeSpend = safeCustomer.lifetimeSpend || 0;
    const currentTier = safeCustomer.currentTier || 'Bronze';
    const referralCode = safeCustomer.referralCode || 'N/A';
    
    // Refresh function to update points after actions
    const refreshCustomerData = useCallback(async (data = null, message = null, type = 'success') => {
        
        // 1. If profileData or newProfile is returned from an action endpoint, use it directly
        const updatedProfile = data?.profileData || data?.newProfile;
        
        if (updatedProfile) {
             onReward(updatedProfile, message, type);
             return;
        }

        // 2. Perform a full refresh 
        if (!safeCustomer.customerId) {
            console.error("Cannot refresh: Customer ID is missing.");
            onReward(safeCustomer, 'Error: Could not retrieve customer ID.', 'error');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('userToken'); // Get token for auth
            const response = await fetch(`${API_BASE_URL}/loyalty/${safeCustomer.customerId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`, // Added Authorization
                }
            });
            if (response.ok) {
                const refreshedData = await response.json();
                onReward(refreshedData, message, type); 
            } else {
                 const errorData = await response.json();
                 onReward(safeCustomer, errorData.message || 'Failed to refresh data.', 'error');
            }
        } catch (e) {
            onReward(safeCustomer, 'Network error during data refresh.', 'error');
        } finally {
            setLoading(false);
        }
    }, [safeCustomer, onReward]);

    // --- NEW: WhatsApp Sharing Logic ---
    const handleShareWhatsApp = () => {
        const appLink = 'http://localhost:3000'; // Replace with your actual app URL
        const shareText = encodeURIComponent(
            `🎁 Earn free points! Join my loyalty program using my referral code: *${referralCode}*. Register here: ${appLink}`
        );
        
        const whatsappUrl = `https://wa.me/?text=${shareText}`;
        window.open(whatsappUrl, '_blank'); 
        
        onReward(customer, 'WhatsApp share link opened!', 'success');
    };
    // --- END: WhatsApp Sharing Logic ---

    // Redemptions View (Placeholder Logic)
    const RedemptionView = () => {
        const [message, setMessage] = useState('');
        const pointsNeeded = 1000;

        const handleRedeem = async () => {
            setMessage('Processing redemption...');
            try {
                const token = localStorage.getItem('userToken'); // Get token for auth
                const response = await fetch(`${API_BASE_URL}/loyalty/redeem`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`, // Added Authorization
                    },
                    body: JSON.stringify({ 
                        customerId: safeCustomer.customerId, 
                        pointsNeeded: pointsNeeded
                    }),
                });
                const data = await response.json();

                if (response.ok) {
                    setMessage(`Success! Code: ${data.details.code}. Used ${data.pointsUsed} pts.`);
                    refreshCustomerData(data); // Use the data from redemption for immediate update
                } else {
                    setMessage(data.message || 'Redemption failed.');
                }
            } catch (e) {
                setMessage('Network error during redemption.');
            }
        };

        return (
            <div className="bg-white p-6 rounded-xl shadow-lg space-y-4 max-w-lg mx-auto">
                <h3 className="text-xl font-bold text-indigo-700 flex items-center"><Gift className="w-5 h-5 mr-2" /> Redeem Rewards</h3>
                <p className="text-gray-600">You have **{totalPoints.toLocaleString()}** points available.</p>
                
                <div className="p-4 border border-indigo-200 rounded-lg">
                    <p className="font-semibold">Get ₹100 Off Coupon</p>
                    <p className="text-sm text-gray-500">Requires {pointsNeeded} Points</p>
                    <div className="mt-3 flex space-x-2">
                        <input
                            type="text"
                            value={pointsNeeded}
                            disabled
                            className="p-2 border border-gray-300 rounded-lg w-20 text-right bg-gray-50 font-mono"
                        />
                        <Button 
                            onClick={handleRedeem}
                            disabled={totalPoints < pointsNeeded}
                            className={`bg-indigo-600 text-white ${totalPoints < pointsNeeded ? 'opacity-50' : 'hover:bg-indigo-700'}`}
                        >
                            Redeem Now
                        </Button>
                    </div>
                </div>

                {message && <div className="p-3 bg-gray-100 rounded-lg text-sm">{message}</div>}
            </div>
        );
    };

    // Main Content Renderer - The logic here is now SAFE against undefined data
    const renderContent = () => {
        // If critical data is still missing (e.g., from a failed login attempt)
        if (!safeCustomer.customerId) {
            return (
                <div className="text-center p-10 bg-white rounded-xl shadow-lg">
                    <XCircle className="w-10 h-10 mx-auto text-red-500 mb-4"/>
                    <h3 className="text-xl font-semibold">Authentication Error</h3>
                    <p className="text-gray-600">Please log in again to load your profile data correctly.</p>
                </div>
            );
        }

        // Calculate remaining spend to the next (Gold) tier. Assumes Gold is the highest.
        const spendRemaining = TIER_THRESHOLDS.Gold - lifetimeSpend;
        const formattedSpendRemaining = spendRemaining > 0 ? spendRemaining.toLocaleString() : '0';

        switch (activeTab) {
            case 'game':
                return (
                    <TicTacToe 
                        customerId={safeCustomer.customerId}
                        lastPlayDate={safeCustomer.lastPlayDate} 
                        onGameComplete={refreshCustomerData}
                    />
                );
            case 'redeem':
                return <RedemptionView />;
            case 'dashboard':
            default:
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Points Card */}
                            <div className="p-6 rounded-xl shadow-lg bg-indigo-600 text-white border border-indigo-700">
                                <p className="text-sm font-light opacity-80">Your Loyalty Points</p>
                                <p className="text-5xl font-extrabold mt-1">{totalPoints.toLocaleString()}</p>
                                <p className="text-sm mt-2 flex items-center opacity-90">
                                    <Trophy className="w-4 h-4 mr-1" />
                                    {`Current Tier: ${currentTier}`}
                                </p>
                            </div>
                            
                            {/* Tier Card */}
                            <div className="p-6 rounded-xl shadow-lg bg-white border border-gray-200">
                                <p className="text-sm font-medium text-gray-500">Lifetime Spend</p>
                                <p className="text-4xl font-extrabold mt-1 text-gray-900">₹{lifetimeSpend.toLocaleString()}</p>
                                <p className="text-sm text-gray-600 mt-2">
                                     {currentTier === 'Gold' 
                                        ? 'You are at the top tier! VIP perks apply.' 
                                        : `Spend ₹${formattedSpendRemaining} more for Gold!`}
                                </p>
                            </div>
                        </div>

                        {/* Referral Link Card */}
                        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-yellow-500">
                            <h3 className="text-xl font-bold text-yellow-700 flex items-center"><Share2 className="w-5 h-5 mr-2" /> Share & Earn</h3>
                            <p className="text-gray-600 mt-2">Share your unique code to earn bonus points when friends register!</p>
                            <div className="mt-4 flex space-x-3 items-center">
                                <code className="bg-gray-100 p-2 rounded-lg font-mono text-indigo-600 text-base select-all">
                                    {referralCode}
                                </code>
                                <Button className="bg-green-500 text-white hover:bg-green-600" onClick={handleShareWhatsApp}>
                                    Share on WhatsApp
                                </Button>
                                <Button className="bg-gray-200 text-gray-800 hover:bg-gray-300" onClick={() => {
                                    // Copy functionality
                                    const code = referralCode;
                                    const el = document.createElement('textarea');
                                    el.value = code;
                                    document.body.appendChild(el);
                                    el.select();
                                    // Use execCommand for broader compatibility in sandboxed environments
                                    document.execCommand('copy'); 
                                    document.body.removeChild(el);
                                    onReward(safeCustomer, 'Referral code copied!', 'success');
                                }}>
                                    Copy Code
                                </Button>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    const navItemClass = (tab) => 
        `px-4 py-2 font-semibold text-sm rounded-lg transition-colors duration-200 ${
            activeTab === tab 
            ? 'bg-indigo-600 text-white shadow-lg' 
            : 'text-gray-600 hover:bg-gray-100'
        }`;

    return (
        <div className="min-h-screen bg-gray-50 p-6 font-['Inter']">
            <header className="mb-6 border-b pb-4 flex justify-between items-center">
                <h1 className="text-3xl font-extrabold text-gray-900 flex items-center">
                    <Zap className="w-8 h-8 mr-2 text-indigo-600" />
                    Loyalty Rewards
                </h1>
                <div className="flex items-center space-x-4">
                    <p className="text-sm text-gray-600">Welcome, {safeCustomer.email || 'Guest'}</p>
                    <Button onClick={onLogout} className="bg-red-500 text-white hover:bg-red-600 text-xs">
                        <LogOut className="w-4 h-4 mr-1" /> Logout
                    </Button>
                </div>
            </header>

            {/* --- Navigation --- */}
            <div className="flex space-x-2 mb-8 bg-white p-2 rounded-xl shadow-md border border-gray-100 max-w-fit">
                <button onClick={() => setActiveTab('dashboard')} className={navItemClass('dashboard')}>
                    <Trophy className="w-5 h-5 mr-1 inline" /> Dashboard
                </button>
                <button onClick={() => setActiveTab('game')} className={navItemClass('game')}>
                    <Gamepad className="w-5 h-5 mr-1 inline" /> Daily Game
                </button>
                <button onClick={() => setActiveTab('redeem')} className={navItemClass('redeem')}>
                    <Gift className="w-5 h-5 mr-1 inline" /> Redeem
                </button>
            </div>

            {/* --- Content Renderer --- */}
            {loading ? <p className="text-indigo-600">Loading data...</p> : renderContent()}
            
        </div>
    );
};


// --- Authentication Component (Modified for Role Selection) ---

const AuthForm = ({ onLoginSuccess, onReward, onMerchantLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [referredByCode, setReferredByCode] = useState('');
    const [secretKey, setSecretKey] = useState(''); // Added for Merchant Registration
    const [isMerchantMode, setIsMerchantMode] = useState(false); 
    const [loading, setLoading] = useState(false);
    const [alertMessage, setAlertMessage] = useState(null);
    const [alertType, setAlertType] = useState('error');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setAlertMessage(null);
        
        const endpoint = isLogin ? 'login' : 'register';
        
        // Prepare body based on mode
        const requestBody = isLogin 
            ? { email, password }
            : { 
                email, 
                password, 
                referredByCode: referredByCode || undefined, // Send only if present
                role: isMerchantMode ? 'merchant' : 'customer', // Send role
                secretKey: isMerchantMode ? secretKey : undefined, // Send secret only for merchant reg
            };

        try {
            const response = await fetch(`${API_BASE_URL}/auth/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody), 
            });
            const data = await response.json();

            if (response.ok) {
                if (data.profileData && data.token) {
                    
                    // Store token for subsequent API calls
                    localStorage.setItem('userToken', data.token);
                    localStorage.setItem('userRole', data.profileData.role);

                    onReward(data.profileData, `${isLogin ? 'Welcome back!' : 'Registration successful!'}`, 'success'); 
                    
                    // Use the ACTUAL role from the profileData
                    if (data.profileData.role === 'merchant') {
                        onMerchantLogin(data.profileData);
                    } else {
                        onLoginSuccess(data.profileData);
                    }
                    
                } else {
                    setAlertMessage('Authentication successful, but session data is incomplete.');
                    setAlertType('error');
                }
                
            } else {
                setAlertMessage(data.message || `Authentication failed.`);
                setAlertType('error');
            }
        } catch (error) {
            setAlertMessage('A network error occurred. Please ensure the backend is running on port 5000.');
            setAlertType('error');
            console.error('Auth Error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <RewardAlert message={alertMessage} type={alertType} onClose={() => setAlertMessage(null)} />
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-['Inter']">
                <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl space-y-6">
                    <div className="text-center">
                        <h2 className="text-3xl font-extrabold text-gray-900">
                            {isLogin ? (isMerchantMode ? 'Merchant Login' : 'Customer Login') : 'Create Account'}
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            {isLogin ? "Access your dashboard" : "Start earning rewards now!"}
                        </p>
                    </div>

                    {/* Role Switcher */}
                    <div className="flex justify-center space-x-4">
                         <button 
                            onClick={() => setIsMerchantMode(false)}
                            className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${!isMerchantMode ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}
                         >
                            Customer
                         </button>
                         <button 
                            onClick={() => setIsMerchantMode(true)}
                            className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${isMerchantMode ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}
                         >
                            Merchant
                         </button>
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>

                        {!isLogin && !isMerchantMode && ( // Only show referral code for customer registration
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Referral Code (Optional)</label>
                                <input
                                    type="text"
                                    value={referredByCode}
                                    onChange={(e) => setReferredByCode(e.target.value)}
                                    className="mt-1 w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Enter friend's code"
                                />
                            </div>
                        )}
                        
                        {!isLogin && isMerchantMode && ( // Only show secret key for merchant registration
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Merchant Secret Key</label>
                                <input
                                    type="password"
                                    required
                                    value={secretKey}
                                    onChange={(e) => setSecretKey(e.target.value)}
                                    className="mt-1 w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500"
                                    placeholder="Secret Key for Merchant Access"
                                />
                            </div>
                        )}
                        

                        <Button
                            type="submit"
                            disabled={loading}
                            className={`w-full ${isMerchantMode ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white`}
                        >
                            {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
                        </Button>
                    </form>

                    <p className="text-center text-sm">
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setAlertMessage(null);
                                setPassword(''); // Clear password on switch
                            }}
                            className="text-indigo-600 hover:text-indigo-800 font-medium transition duration-150"
                        >
                            {isLogin ? "Need an account? Sign up." : "Already have an account? Log in."}
                        </button>
                    </p>
                </div>
            </div>
        </>
    );
};

// --- Main App Component ---

const LoyaltyApp = () => {
    // State to hold user profile data and the global alert message
    const [userProfile, setUserProfile] = useState(null);
    const [role, setRole] = useState(null); // 'customer' or 'merchant'
    const [alert, setAlert] = useState({ message: null, type: 'success' });
    const [isLoading, setIsLoading] = useState(true);

    const checkStoredAuth = useCallback(() => {
        const token = localStorage.getItem('userToken');
        const storedRole = localStorage.getItem('userRole');

        if (token && storedRole) {
            // In a real app, you would validate the token here.
            // For this simulation, we proceed to fetch the profile.
            fetchUserProfile(token, storedRole);
        } else {
            setIsLoading(false);
        }
    }, []);

    const fetchUserProfile = async (token, storedRole) => {
        try {
            const endpoint = storedRole === 'merchant' ? 'merchant/profile' : 'customer/profile';
            const response = await fetch(`${API_BASE_URL}/auth/${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setUserProfile(data.profileData);
                setRole(storedRole);
            } else {
                handleLogout(); // Token invalid or expired
            }
        } catch (e) {
            console.error("Profile fetch failed:", e);
            handleLogout();
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Simulates the Single Sign-On check when the app loads inside Shopify
        checkStoredAuth();
    }, [checkStoredAuth]);

    const handleUpdateProfile = (newProfileData, message, type) => {
        if (newProfileData) {
            setUserProfile(newProfileData);
        }
        setAlert({ message, type });
    };

    const handleLoginSuccess = (profile) => {
        setUserProfile(profile);
        setRole(profile.role);
    };

    const handleMerchantLogin = (profile) => {
        setUserProfile(profile);
        setRole('merchant');
    };
    
    const handleLogout = () => {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userRole');
        setUserProfile(null);
        setRole(null);
        setAlert({ message: 'You have been logged out.', type: 'success' });
        setIsLoading(false);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
                <p className="ml-4 text-gray-600">Loading Session...</p>
            </div>
        );
    }

    let content;
    if (userProfile && role === 'merchant') {
        content = <MerchantDashboard onLogout={handleLogout} onUpdate={handleUpdateProfile} />;
    } else if (userProfile && role === 'customer') {
        content = <CustomerDashboard customer={userProfile} onLogout={handleLogout} onReward={handleUpdateProfile} />;
    } else {
        content = <AuthForm 
            onLoginSuccess={handleLoginSuccess} 
            onReward={handleUpdateProfile}
            onMerchantLogin={handleMerchantLogin}
        />;
    }

    return (
        <div className="App min-h-screen">
            <RewardAlert 
                message={alert.message} 
                type={alert.type} 
                onClose={() => setAlert({ message: null, type: 'success' })} 
            />
            {content}
        </div>
    );
};

export default LoyaltyApp;
