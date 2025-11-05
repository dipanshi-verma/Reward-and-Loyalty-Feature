// src/components/CustomerRewardsDashboard.jsx
import React, { useEffect, useState } from 'react';
import { getMemberBalance, redeemReward } from '../api/loyaltyApi';
import { setAccessToken } from '../api/apiClient'; // if you need to set token after login

const CustomerRewardsDashboard = ({ memberId }) => {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!memberId) return;
    setLoading(true);
    getMemberBalance(memberId)
      .then((data) => setBalance(data))
      .catch((err) => setError(err.normalized?.message || err.message))
      .finally(() => setLoading(false));
  }, [memberId]);

  const onRedeem = async (rewardId) => {
    setRedeemLoading(true);
    try {
      const res = await redeemReward({ memberId, rewardId });
      // handle success (maybe update balance)
      setBalance((prev) => ({ ...prev, current_points_balance: (prev.current_points_balance || 0) - res.pointsUsed }));
    } catch (err) {
      setError(err.normalized?.message || err.message);
    } finally {
      setRedeemLoading(false);
    }
  };

  if (!memberId) return <div>Please log in to view rewards.</div>;
  if (loading) return <div>Loading points...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;

  return (
    <div>
      <h3>Your Points: {balance?.current_points_balance ?? 0}</h3>
      {/* render rewards and call onRedeem */}
    </div>
  );
};

export default CustomerRewardsDashboard;
