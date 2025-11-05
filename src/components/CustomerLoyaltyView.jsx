import React, { useEffect, useState, useCallback, useMemo } from "react";
import { RefreshCw, Target, LogOut } from "lucide-react";

// --- Configuration ---
const BACKEND_URL = "http://localhost:5000"; // Assuming your Express server runs on this port
const MAX_DAILY_ATTEMPTS = 2;
const MIN_REWARD = 10;
const MAX_REWARD = 50;
const MESSAGE_DISPLAY_TIME_MS = 5000; // 5 seconds
// --- End Configuration ---

// --- Utility: API Client for Express Backend ---
const apiClient = {
  // Standard fetch wrapper for POST requests
  post: async (url, data) => {
    const response = await fetch(`${BACKEND_URL}${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

    if (!response.ok) {
      // Throw the server's error message
      const error = new Error(responseData.message || "An API error occurred.");
      error.status = response.status;
      throw error;
    }
    return responseData;
  },

  // Standard fetch wrapper for GET requests
  get: async (url) => {
    const response = await fetch(`${BACKEND_URL}${url}`);

    const responseData = await response.json();

    if (!response.ok) {
      const error = new Error(responseData.message || "An API error occurred.");
      error.status = response.status;
      throw error;
    }
    return responseData;
  },
};
// --- END API Client ---

// --- Reusable UI Component ---
const Button = ({
  onClick,
  disabled,
  children,
  className = "",
  type = "button",
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center justify-center px-4 py-2 rounded-lg font-medium transition shadow-sm disabled:opacity-50 ${className}`}
  >
    {children}
  </button>
);

// --- CATCH GAME Component ---
// This component remains largely the same, but handleCatch calls onGameComplete which
// now triggers the API call in the main component.
const CatchGame = ({ onGameComplete, onCancel, attemptsLeft }) => {
  const [targetPosition, setTargetPosition] = useState({ top: 50, left: 50 });
  const [startTime, setStartTime] = useState(null);
  const [gameStatus, setGameStatus] = useState("ready"); // ready, playing, finished
  const [reward, setReward] = useState(0);

  // Function to move the target randomly
  const moveTarget = useCallback(() => {
    // Generate position between 10% and 90% of the container to keep it visible
    const newTop = Math.random() * 80 + 10;
    const newLeft = Math.random() * 80 + 10;
    setTargetPosition({ top: newTop, left: newLeft });
  }, []);

  // Game initialization
  const startGame = () => {
    if (attemptsLeft <= 0) return;
    setGameStatus("playing");
    setReward(0);
    moveTarget();
    setStartTime(Date.now());
  };

  // Game logic on target click (the "catch")
  const handleCatch = () => {
    if (gameStatus !== "playing") return;

    const reactionTime = Date.now() - startTime;
    let points = 0;

    // Award points based on speed (closer to 0ms is better, max reward for < 500ms)
    if (reactionTime < 500) {
      points = MAX_REWARD;
    } else if (reactionTime < 1500) {
      // Points decay from MAX to MIN between 0.5s and 1.5s
      const speedFactor = (1500 - reactionTime) / 1000;
      points = Math.round(MIN_REWARD + speedFactor * (MAX_REWARD - MIN_REWARD));
    } else {
      points = MIN_REWARD; // Minimum reward if reaction is slow
    }

    // Set the final reward and end the game state
    setReward(points);
    setGameStatus("finished");

    // Immediately send the result to the main component
    onGameComplete(points);
  };

  // Continuous movement while playing (and time limit)
  useEffect(() => {
    let interval;
    let timeout;

    if (gameStatus === "playing") {
      interval = setInterval(moveTarget, 1000); // Move every 1 second
      timeout = setTimeout(() => {
        // Time ran out
        if (gameStatus === "playing") {
          setGameStatus("finished");
          onGameComplete(0); // Award 0 points if time runs out
          setReward(0);
        }
      }, 5000); // Game duration 5 seconds (5 seconds to complete)

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
    return () => {
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, [gameStatus, moveTarget, onGameComplete]);

  if (gameStatus === "finished") {
    return (
      <div className="text-center p-8 bg-white rounded-xl shadow-inner mt-4">
        <h2 className="text-3xl font-bold mb-3 text-yellow-700">
          {reward > 0
            ? "SUCCESS! (Jeet Gaye!)"
            : "TRY AGAIN! (Dobara Koshish Karein)"}
        </h2>
        <p className="text-xl mb-6">
          {reward > 0 ? (
            <span>
              You earned:{" "}
              <span className="font-extrabold text-green-500">{reward}</span>{" "}
              Points!
            </span>
          ) : (
            <span className="text-red-500">
              Time ran out! You earned 0 points.
            </span>
          )}
        </p>
        <Button
          onClick={onCancel}
          className="bg-yellow-600 text-white hover:bg-yellow-700"
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg mt-6">
      <h2 className="text-xl font-semibold mb-3 flex items-center justify-between">
        Catch The Item Game
        <Button
          onClick={onCancel}
          className="bg-gray-200 text-gray-700 hover:bg-gray-300 px-3 py-1 text-sm"
        >
          Exit
        </Button>
      </h2>

      {attemptsLeft <= 0 && (
        <div className="text-red-600 font-medium mb-3">
          You have used all {MAX_DAILY_ATTEMPTS} attempts for today. Come back
          tomorrow!
        </div>
      )}

      {gameStatus === "ready" && (
        <div className="text-center">
          <p className="mb-4 text-gray-700">
            Catch the moving target as fast as you can. Points depend on speed!
            You have{" "}
            <span className="font-bold text-yellow-600">{attemptsLeft}</span>{" "}
            attempts left.
          </p>
          <Button
            onClick={startGame}
            disabled={attemptsLeft <= 0}
            className="bg-green-500 text-white hover:bg-green-600 transition duration-150"
          >
            Start Game (5 seconds)
          </Button>
        </div>
      )}

      {gameStatus === "playing" && (
        <div
          className="relative w-full h-64 border-2 border-yellow-300 bg-yellow-50 rounded-lg overflow-hidden"
          // This div is the container/canvas for the game
        >
          {/* The moving target */}
          <div
            onClick={handleCatch}
            style={{
              top: `${targetPosition.top}%`,
              left: `${targetPosition.left}%`,
            }}
            className="absolute p-3 rounded-full bg-red-500 shadow-xl cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-in-out hover:scale-110"
          >
            <Target className="w-5 h-5 text-white" />
          </div>
        </div>
      )}
    </div>
  );
};
// --- END CATCH GAME Component ---

const CustomerLoyaltyView = () => {
  const [customerIdInput, setCustomerIdInput] = useState("");
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showGame, setShowGame] = useState(false);

  // Use the profile ID if logged in, otherwise use the input for the login attempt
  const customerId = profile?._id || customerIdInput.toLowerCase().trim(); // Use MongoDB's _id if available

  const attemptsLeft = useMemo(() => {
    if (!profile) return 0;

    // Assuming the profile received from MongoDB has 'dailyGameAttempts' and 'lastGameDate'
    const now = new Date();
    const lastGameDate = profile.lastGameDate
      ? new Date(profile.lastGameDate)
      : new Date(0);
    const isNewDay = lastGameDate.toDateString() !== now.toDateString();

    if (isNewDay) {
      return MAX_DAILY_ATTEMPTS;
    }
    return MAX_DAILY_ATTEMPTS - (profile.dailyGameAttempts || 0);
  }, [profile]);

  // Function to handle automatic message hiding
  const showTimedMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => {
      setMessage("");
    }, MESSAGE_DISPLAY_TIME_MS);
  };

  // 🧠 Fetch loyalty profile (used for login/creation OR refreshing)
  const fetchProfile = async (idToFetch) => {
    if (!idToFetch) {
      showTimedMessage(
        "Enter your Customer ID (or Name/Email) to load your profile."
      );
      return;
    }

    const isLoginAttempt = !profile; // If no profile is loaded, this is a login attempt

    try {
      setLoading(true);

      let res;
      if (isLoginAttempt) {
        // 💡 INTEGRATION: Call the Express POST route for Login/Signup
        res = await apiClient.post("/api/customers/login", {
          identifier: idToFetch,
        });

        // Save the received profile data to state
        setProfile(res.data.customer);

        // This is a new customer if the message indicates creation
        const successMessage = res.message || "Profile loaded.";
        showTimedMessage(successMessage);
      } else {
        // 💡 INTEGRATION: Call the Express GET route to refresh the existing profile
        res = await apiClient.get(`/api/customers/${idToFetch}`);
        setProfile(res.data.customer);
        showTimedMessage("Profile refreshed.");
      }
    } catch (err) {
      console.error("Error loading loyalty profile:", err);
      // The error object thrown by apiClient contains the server message
      const errorMessage = `❌ Error loading loyalty profile: ${
        err.message || "Failed to connect to backend."
      }`;
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Refreshes the current profile using its MongoDB ID (_id)
  const refreshCurrentProfile = useCallback(async () => {
    if (profile?._id) {
      // Use the MongoDB _id for refreshing
      await fetchProfile(profile._id);
    }
  }, [profile]);

  const handleLoadProfile = () => {
    const input = customerIdInput.trim();
    if (input) {
      // Use the user input (email or ID) for the login attempt
      fetchProfile(input);
    } else {
      setMessage("Please enter a Customer ID or Name/Email to load.");
    }
  };

  // 🚪 Function: Handle Log Out
  const handleLogout = () => {
    setProfile(null); // Clear profile data
    setCustomerIdInput(""); // Clear the input field
    showTimedMessage(
      "👋 Successfully logged out. Enter your ID to load a profile."
    );
  };

  // 🎯 Handle game completion
  const handleGameComplete = async (pointsAwarded) => {
    setShowGame(false);

    if (!profile?._id)
      return showTimedMessage("Error: Please log in to play the game.");

    try {
      setLoading(true);
      // 💡 INTEGRATION FIX: Calling the customer-specific game action route now
      const res = await apiClient.post(
        `/api/customers/${profile._id}/game-action`,
        {
          // actionType is not strictly needed but can be passed for logging
          actionType: "catch_game",
          pointsAwarded,
        }
      );
      showTimedMessage(res.message);

      // Refresh the profile data after the game
      await refreshCurrentProfile();
    } catch (err) {
      console.error("Error recording game result:", err);
      const errorMessage =
        err.message || "❌ Error recording game result. Check console.";
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 🎁 Handle redemption
  const handleRedeem = async (rewardType) => {
    if (!profile?._id)
      return showTimedMessage("Please log in to redeem a reward.");

    const pointsNeeded = 500;

    try {
      setLoading(true);
      // 💡 INTEGRATION FIX: Calling the customer-specific redeem route now
      const res = await apiClient.post(`/api/customers/${profile._id}/redeem`, {
        rewardType,
        pointsNeeded,
      });
      showTimedMessage(res.message);

      // Refresh the profile data after redemption
      await refreshCurrentProfile();
    } catch (err) {
      console.error("Error redeeming reward:", err);
      const errorMessage =
        err.message || `❌ Error redeeming reward. Check console.`;
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // --- Render Game if showGame is true ---
  if (showGame) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-yellow-100 flex flex-col items-center justify-center p-8 font-['Inter']">
        <div className="max-w-lg w-full">
          <CatchGame
            onGameComplete={handleGameComplete}
            onCancel={() => setShowGame(false)}
            attemptsLeft={attemptsLeft}
          />
        </div>
      </div>
    );
  }

  // --- Render Dashboard / Login UI ---
  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-yellow-100 flex flex-col items-center justify-center p-8 font-['Inter']">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-6 space-y-4 border-t-4 border-yellow-500">
        {/* Header with Title and Logout button */}
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-3xl font-extrabold text-yellow-700">
            🏅 Customer Loyalty Program
          </h1>
          {profile && (
            <Button
              onClick={handleLogout}
              className="bg-red-500 text-white hover:bg-red-600 text-sm py-1 px-3 ml-4"
            >
              <LogOut className="w-4 h-4 mr-1" /> Log Out
            </Button>
          )}
        </div>

        <p className="text-center text-gray-500">
          View your points and rewards
        </p>

        {/* Input and Load Section */}
        {!profile && (
          <div className="flex items-center gap-2 pt-3 border-t">
            <input
              type="text"
              value={customerIdInput}
              onChange={(e) => setCustomerIdInput(e.target.value)}
              placeholder="Enter Customer ID (or Name/Email)"
              className="border border-gray-300 p-3 rounded-lg w-full focus:ring-yellow-400 focus:border-yellow-400 transition"
            />
            <button
              onClick={handleLoadProfile}
              disabled={loading}
              className="bg-yellow-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-yellow-700 transition disabled:opacity-50 flex-shrink-0"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                "Load"
              )}
            </button>
          </div>
        )}

        {loading && (
          <p className="text-gray-500 text-center py-4">Loading profile...</p>
        )}
        {message && (
          <p
            className={`text-center text-sm p-2 rounded ${
              message.includes("❌")
                ? "bg-red-100 text-red-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {message}
          </p>
        )}

        {profile && (
          <div className="space-y-4 pt-4 border-t border-gray-100">
            {/* Displaying MongoDB _id (for debugging/identification) */}
            <p className="text-xs text-gray-400 break-words">
              MongoDB ID: {profile._id}
            </p>

            <h2 className="text-xl font-semibold text-gray-800">
              Hi, {profile.name || "Loyal Customer"}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <p className="p-3 bg-yellow-50 rounded-lg">
                <strong>Tier:</strong>{" "}
                <span className="font-bold text-yellow-800">
                  {profile.currentTier}
                </span>
              </p>
              <p className="p-3 bg-green-50 rounded-lg">
                <strong>Total Points:</strong>{" "}
                <span className="font-bold text-green-800">
                  {profile.totalPoints?.toLocaleString() || 0}
                </span>
              </p>
            </div>
            <p className="text-sm text-gray-600">
              <strong>Lifetime Spend:</strong> ₹
              {profile.lifetimeSpend?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-gray-400">
              <strong>Member Since:</strong>{" "}
              {new Date(profile.enrollmentDate).toDateString()}
            </p>

            <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6 pt-4 border-t">
              <button
                onClick={() => setShowGame(true)}
                disabled={loading || attemptsLeft <= 0}
                className="flex items-center justify-center bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-3 rounded-lg shadow-lg font-medium transition disabled:opacity-50"
              >
                <Target className="w-5 h-5 mr-2" /> Play Catch Game (
                {attemptsLeft} left)
              </button>
              <button
                onClick={() => handleRedeem("coupon")}
                disabled={loading || profile.totalPoints < 500}
                className="flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg font-medium transition disabled:opacity-50"
              >
                🎟 Redeem 500 Pts Coupon
              </button>
              <button
                onClick={() => handleRedeem("upi")}
                disabled={loading || profile.totalPoints < 500}
                className="flex items-center justify-center bg-purple-500 hover:bg-purple-600 text-white px-4 py-3 rounded-lg shadow-lg font-medium transition disabled:opacity-50"
              >
                💰 Redeem 500 Pts UPI
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerLoyaltyView;
