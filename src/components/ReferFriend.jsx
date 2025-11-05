// src/components/ReferFriend.jsx
import React, { useState } from 'react';
import { getReferralLink } from '../api/loyaltyApi';

const ReferFriend = ({ memberId }) => {
  const [link, setLink] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchLink = async () => {
    setLoading(true);
    try {
      const data = await getReferralLink(memberId);
      // backend should return { referralLink: 'https://...' }
      setLink(data.referralLink || data.link);
    } catch (err) {
      alert("Failed to generate referral link: " + (err.normalized?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={fetchLink} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Referral Link'}
      </button>
      {link && (
        <div>
          <input readOnly value={link} />
          <button onClick={() => navigator.clipboard.writeText(link)}>Copy</button>
        </div>
      )}
    </div>
  );
};

export default ReferFriend;
