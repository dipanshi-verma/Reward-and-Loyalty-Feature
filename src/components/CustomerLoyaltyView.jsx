// src/components/CustomerLoyaltyView.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { RefreshCw, Target, LogOut } from "lucide-react";

// === CONFIG ===
const BACKEND_URL = "http://localhost:5000";
const MAX_DAILY_ATTEMPTS = 2;
const MIN_REWARD = 10;
const MAX_REWARD = 50;
const MESSAGE_DISPLAY_TIME_MS = 5000;

// === Generic API Client ===
const apiClient = {
  post: async (url, data) => {
    const res = await fetch(`${BACKEND_URL}${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "API Error");
    return json;
  },
  get: async (url) => {
    const res = await fetch(`${BACKEND_URL}${url}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "API Error");
    return json;
  },
};

// === Reusable Button ===
const Button = ({ onClick, disabled, children, className = "" }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center justify-center px-4 py-2 rounded-lg font-medium transition shadow-sm disabled:opacity-50 ${className}`}
  >
    {children}
  </button>
);

// === Catch Game Component ===
const CatchGame = ({ onGameComplete, onCancel, attemptsLeft }) => {
  const [targetPos, setTargetPos] = useState({ top: 50, left: 50 });
  const [status, setStatus] = useState("ready");
  const [start, setStart] = useState(null);
  const [reward, setReward] = useState(0);

  const moveTarget = useCallback(() => {
    setTargetPos({
      top: Math.random() * 80 + 10,
      left: Math.random() * 80 + 10,
    });
  }, []);

  const startGame = () => {
    if (attemptsLeft <= 0) return;
    setStatus("playing");
    moveTarget();
    setStart(Date.now());
  };

  const handleCatch = () => {
    if (status !== "playing") return;
    const time = Date.now() - start;
    let points = 0;

    if (time < 500) points = MAX_REWARD;
    else if (time < 1500) {
      const speed = (1500 - time) / 1000;
      points = Math.round(MIN_REWARD + speed * (MAX_REWARD - MIN_REWARD));
    } else points = MIN_REWARD;

    setReward(points);
    setStatus("finished");
    onGameComplete(points);
  };

  useEffect(() => {
    if (status !== "playing") return;
    const interval = setInterval(moveTarget, 1000);
    const timeout = setTimeout(() => {
      if (status === "playing") {
        setStatus("finished");
        setReward(0);
        onGameComplete(0);
      }
    }, 5000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [status, moveTarget, onGameComplete]);

  if (status === "finished") {
    return (
      <div className="text-center p-8 bg-white rounded-xl shadow-inner mt-4">
        <h2 className="text-3xl font-bold mb-3 text-yellow-700">
          {reward > 0 ? "🎉 You Won!" : "😅 Try Again!"}
        </h2>
        <p className="text-xl mb-6">
          {reward > 0 ? (
            <span>
              You earned{" "}
              <span className="font-extrabold text-green-500">{reward}</span>{" "}
              points!
            </span>
          ) : (
            <span className="text-red-500">You earned 0 points.</span>
          )}
        </p>
        <Button
          onClick={onCancel}
          className="bg-yellow-600 text-white hover:bg-yellow-700"
        >
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg mt-6">
      <h2 className="text-xl font-semibold mb-3 flex justify-between">
        Catch The Target
        <Button
          onClick={onCancel}
          className="bg-gray-200 text-gray-700 hover:bg-gray-300 px-3 py-1 text-sm"
        >
          Exit
        </Button>
      </h2>

      {attemptsLeft <= 0 ? (
        <div className="text-red-600 font-medium">
          You’ve used all {MAX_DAILY_ATTEMPTS} attempts. Come back tomorrow!
        </div>
      ) : (
        <div className="text-center">
          {status === "ready" ? (
            <>
              <p className="mb-4 text-gray-700">
                Catch the moving target as fast as possible! Attempts left:{" "}
                <b>{attemptsLeft}</b>
              </p>
              <Button
                onClick={startGame}
                className="bg-green-500 text-white hover:bg-green-600"
              >
                Start Game
              </Button>
            </>
          ) : (
            <div className="relative w-full h-64 border-2 border-yellow-300 bg-yellow-50 rounded-lg overflow-hidden">
              <div
                onClick={handleCatch}
                style={{
                  top: `${targetPos.top}%`,
                  left: `${targetPos.left}%`,
                }}
                className="absolute p-3 rounded-full bg-red-500 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 hover:scale-110"
              >
                <Target className="w-5 h-5 text-white" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// === MAIN COMPONENT ===
const CustomerLoyaltyView = () => {
  const [input, setInput] = useState("");
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showGame, setShowGame] = useState(false);

  const attemptsLeft = useMemo(() => {
    if (!profile) return 0;
    const now = new Date();
    const lastDate = profile.lastGamePlayed
  ? new Date(profile.lastGamePlayed)
  : new Date(0);

    const isNewDay = now.toDateString() !== lastDate.toDateString();
    return isNewDay
      ? MAX_DAILY_ATTEMPTS
      : MAX_DAILY_ATTEMPTS - (profile.dailyGameAttempts || 0);
  }, [profile]);

  const timedMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), MESSAGE_DISPLAY_TIME_MS);
  };

  const fetchProfile = async (identifier) => {
    if (!identifier) return timedMessage("Enter your name or email.");
    try {
      setLoading(true);
      const res = await apiClient.post("/api/customers/login", {
        identifier,
      });
      setProfile(res.customer || res.data?.customer || res);
      timedMessage(res.message || "Profile loaded!");
    } catch (err) {
      timedMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (!profile?._id) return;
    try {
      const res = await apiClient.get(`/api/customers/${profile._id}`);
      setProfile(res.customer);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGameComplete = async (points) => {
    setShowGame(false);
    if (!profile?._id) return timedMessage("Login first!");
    try {
      setLoading(true);
      const res = await apiClient.post(
        `/api/customers/${profile._id}/game-action`,
        { pointsAwarded: points }
      );
      timedMessage(res.message);
      await refreshProfile();
    } catch (err) {
      timedMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (type) => {
    if (!profile?._id) return timedMessage("Login first!");
    try {
      setLoading(true);
      const res = await apiClient.post(`/api/customers/${profile._id}/redeem`, {
        rewardType: type,
        pointsNeeded: 500,
      });
      timedMessage(res.message);
      await refreshProfile();
    } catch (err) {
      timedMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setProfile(null);
    setInput("");
    timedMessage("👋 Logged out.");
  };

  if (showGame)
    return (
      <div className="min-h-screen bg-yellow-50 flex justify-center items-center p-8">
        <div className="max-w-lg w-full">
          <CatchGame
            onGameComplete={handleGameComplete}
            onCancel={() => setShowGame(false)}
            attemptsLeft={attemptsLeft}
          />
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-yellow-50 flex justify-center items-center p-8">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-6 border-t-4 border-yellow-500">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-3xl font-bold text-yellow-700">
            🏅 Loyalty Program
          </h1>
          {profile && (
            <Button
              onClick={handleLogout}
              className="bg-red-500 text-white hover:bg-red-600 text-sm"
            >
              <LogOut className="w-4 h-4 mr-1" /> Log Out
            </Button>
          )}
        </div>

        {!profile && (
          <div className="flex gap-2 border-t pt-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter Name or Email"
              className="border border-gray-300 p-3 rounded-lg w-full focus:ring-yellow-400"
            />
            <Button
              onClick={() => fetchProfile(input)}
              disabled={loading}
              className="bg-yellow-600 text-white hover:bg-yellow-700"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Load"}
            </Button>
          </div>
        )}

        {message && (
          <p
            className={`text-center text-sm mt-3 p-2 rounded ${
              message.includes("❌")
                ? "bg-red-100 text-red-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {message}
          </p>
        )}

        {profile && (
          <div className="pt-4 border-t mt-4 space-y-3">
            <h2 className="text-xl font-semibold text-gray-800">
              Welcome, {profile.name}
            </h2>
            <p className="text-sm text-gray-600">
              Total Points:{" "}
              <b className="text-green-700">{profile.totalPoints || 0}</b>
            </p>
            <p className="text-sm text-gray-600">
              Tier: <b>{profile.currentTier}</b>
            </p>
            <p className="text-xs text-gray-400">
              Member since:{" "}
              {new Date(profile.enrollmentDate).toLocaleDateString()}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <Button
                onClick={() => setShowGame(true)}
                disabled={attemptsLeft <= 0}
                className="bg-indigo-500 text-white hover:bg-indigo-600"
              >
                <Target className="w-4 h-4 mr-2" /> Play Game ({attemptsLeft})
              </Button>
              <Button
                onClick={() => handleRedeem("coupon")}
                disabled={profile.totalPoints < 500}
                className="bg-blue-500 text-white hover:bg-blue-600"
              >
                🎟 Redeem Coupon
              </Button>
              <Button
                onClick={() => handleRedeem("upi")}
                disabled={profile.totalPoints < 500}
                className="bg-purple-500 text-white hover:bg-purple-600"
              >
                💰 Redeem UPI
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerLoyaltyView;
