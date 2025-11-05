import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  TrendingUp,
  DollarSign,
  Award,
  LogOut,
  CheckCircle,
  RefreshCw,
  Server,
  Loader2,
} from "lucide-react";

// FIX: Removed import.meta.env dependency as it caused a compilation error.
// Using the default fallback URL directly for the API connection.
const API_BASE_URL = "http://localhost:5000/api";

// --- Utility Components ---

const StatCard = ({ title, value, icon: Icon, colorClass }) => (
  <div className="bg-white p-5 rounded-xl shadow-lg flex items-center justify-between transition hover:shadow-xl border-t-4 border-yellow-500/50">
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className={`text-3xl font-bold mt-1 ${colorClass}`}>{value}</p>
    </div>
    <Icon className={`w-8 h-8 opacity-20 ${colorClass}`} />
  </div>
);

const Button = ({ onClick, disabled, children, className = "" }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center justify-center px-4 py-2 rounded-lg font-medium transition shadow-sm disabled:opacity-50 ${className}`}
  >
    {children}
  </button>
);

// --- Main Component ---

const MerchantDashboard = () => {
  // State for authentication (re-introduced for API-mode)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [merchantId, setMerchantId] = useState("");

  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [kpis, setKpis] = useState({});
  const [message, setMessage] = useState(
    "Please log in to view the dashboard."
  );

  // Helper function to fetch data from the REST API
  const fetchFromAPI = async (endpoint) => {
    // Added a simple retry mechanism with exponential backoff for robustness
    let lastError = null;
    for (let i = 0; i < 3; i++) {
      try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`);
        if (!res.ok) {
          throw new Error(
            `Failed to fetch ${endpoint} (Status: ${res.status} ${res.statusText})`
          );
        }
        const data = await res.json();
        if (!data.success) throw new Error(data.message || "API Error");
        return data;
      } catch (err) {
        lastError = err;
        // Wait before retrying (1s, 2s, 4s)
        if (i < 2) {
          console.warn(`Attempt ${i + 1} failed. Retrying in ${2 ** i}s...`);
          await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** i));
        }
      }
    }
    throw lastError; // Throw the last error if all retries fail
  };

  // Function to load all dashboard data
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setMessage("Fetching data from MongoDB server via REST API...");
    try {
      const [kpiRes, customersRes] = await Promise.all([
        // These endpoints match the Express router you provided
        fetchFromAPI("/admin/kpis"),
        fetchFromAPI("/admin/recent-activity"),
      ]);

      setKpis(kpiRes.kpis);
      // The API returns 'recentActivity', which contains the customer list
      setCustomers(customersRes.recentActivity);

      setMessage(
        `✅ Synced successfully. Loaded ${customersRes.recentActivity.length} recent activities.`
      );
    } catch (err) {
      console.error(err);
      setMessage(`❌ Error connecting to backend: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Effect to load dashboard on successful login
  useEffect(() => {
    if (isAuthenticated) loadDashboard();
  }, [isAuthenticated, loadDashboard]);

  // --- Login/Logout Logic (Restored) ---

  const handleLogin = () => {
    setLoading(true);
    // Hardcoded check based on original file for demonstration purposes
    if (merchantId.trim().toLowerCase() === "admin@loyaltycorp") {
      setIsAuthenticated(true);
      setMessage("✅ Login successful. Welcome, Admin!");
    } else {
      setMessage("❌ Invalid credentials. Use admin@loyaltycorp");
    }
    setMerchantId("");
    setLoading(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCustomers([]);
    setKpis({});
    setMessage("👋 Logged out successfully. Please log in again.");
  };

  // --- Values ---
  const totalCustomers = kpis.totalCustomers || 0;
  const totalPoints = kpis.totalPoints?.toLocaleString() || "0";
  const avgValue = kpis.avgCustomerValue
    ? `₹${kpis.avgCustomerValue.toFixed(2)}`
    : "₹0.00";
  const goldCustomers = kpis.goldTierCustomers || 0;

  // --- Login UI (Restored) ---

  if (!isAuthenticated)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-['Inter']">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md border-t-4 border-indigo-500">
          <h1 className="text-3xl font-bold text-center text-indigo-700">
            Merchant Login
          </h1>
          <p className="text-center text-gray-500 mb-4">
            Use ID: <strong>admin@loyaltycorp</strong>
          </p>
          <input
            type="text"
            value={merchantId}
            onChange={(e) => setMerchantId(e.target.value)}
            placeholder="Merchant ID (e.g., admin@loyaltycorp)"
            className="border border-gray-300 w-full p-3 rounded-lg mb-4 focus:ring-indigo-400 focus:border-indigo-400"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
          <Button
            onClick={handleLogin}
            disabled={loading}
            className="bg-indigo-600 text-white w-full py-3 hover:bg-indigo-700"
          >
            {loading ? "Logging In..." : "Login"}
          </Button>
          {message && (
            <p
              className={`mt-3 text-center text-sm rounded p-2 ${
                message.includes("❌")
                  ? "bg-red-100 text-red-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    );

  // --- Dashboard UI ---

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-['Inter']">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-center pb-4 border-b">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-indigo-700 mb-4 sm:mb-0">
            Loyalty Merchant Dashboard
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
              User ID:{" "}
              <strong className="ml-1 truncate max-w-[100px] sm:max-w-none">
                admin@loyaltycorp
              </strong>
            </span>
            <Button
              onClick={handleLogout}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              <LogOut className="w-4 h-4 mr-1" /> Log Out
            </Button>
            <Button
              onClick={loadDashboard}
              disabled={loading}
              className="bg-indigo-500 text-white hover:bg-indigo-600"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-1" />
              )}
              {loading ? "Syncing..." : "Manual Sync"}
            </Button>
          </div>
        </header>

        {/* Status Message */}
        {message && (
          <p
            className={`text-center text-sm p-3 rounded-lg shadow-sm ${
              message.includes("❌")
                ? "bg-red-100 text-red-700 border-l-4 border-red-500"
                : "bg-green-100 text-green-700 border-l-4 border-green-500"
            }`}
          >
            {message}
          </p>
        )}

        {/* <div className="flex items-center text-sm text-gray-500">
          <Server className="w-4 h-4 mr-2 text-indigo-400" />
          Data Source: **External REST API (MongoDB Backend)**
        </div> */}

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            title="Total Customers"
            value={totalCustomers.toLocaleString()}
            icon={Users}
            colorClass="text-indigo-600"
          />
          <StatCard
            title="Total Points"
            value={totalPoints}
            icon={Award}
            colorClass="text-yellow-600"
          />
          <StatCard
            title="Avg. Value"
            value={avgValue}
            icon={DollarSign}
            colorClass="text-green-600"
          />
          <StatCard
            title="Gold Tier"
            value={goldCustomers}
            icon={TrendingUp}
            colorClass="text-red-600"
          />
        </div>

        {/* Table */}
        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800 flex items-center">
            Recent Loyalty Activity
            {loading && (
              <Loader2 className="w-5 h-5 ml-3 animate-spin text-indigo-400" />
            )}
          </h2>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    "#",
                    "Customer",
                    "Tier",
                    "Points",
                    "Lifetime Spend (₹)",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-left whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.length > 0 ? (
                  customers.map((c, i) => (
                    <tr
                      key={c.customerId || i}
                      className="hover:bg-indigo-50/50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {i + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 truncate max-w-xs">
                        {c.name || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            c.currentTier === "Gold"
                              ? "bg-amber-100 text-amber-800"
                              : c.currentTier === "Silver"
                              ? "bg-gray-100 text-gray-800"
                              : "bg-teal-100 text-teal-800"
                          }`}
                        >
                          {c.currentTier || "Bronze"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-green-600 text-sm">
                        {(c.totalPoints || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-gray-700 text-sm">
                        ₹{(c.lifetimeSpend || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="5"
                      className="text-center py-8 text-gray-500 text-lg"
                    >
                      {loading
                        ? "Loading customer data..."
                        : "No customer data received from API."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MerchantDashboard;
