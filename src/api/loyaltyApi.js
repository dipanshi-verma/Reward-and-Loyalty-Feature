// src/api/loyaltyApi.js
import apiClient from './apiClient';

/**
 * High-level API wrapper for Loyalty & Referral program.
 * Uses REST endpoints matching your spec.
 *
 * Example endpoints:
 * POST /members/enroll
 * GET  /members/:id/balance
 * POST /events/purchase
 * POST /rewards/redeem
 * GET  /referral/:memberId/link
 * POST /referral/track
 */

export const enrollMember = (payload) => apiClient.post('/members/enroll', payload);

export const getMemberBalance = (memberId) => apiClient.get(`/members/${memberId}/balance`);

export const submitPurchaseEvent = (payload) => apiClient.post('/events/purchase', payload);

export const redeemReward = (payload) => apiClient.post('/rewards/redeem', payload);

export const getReferralLink = (memberId) => apiClient.get(`/referral/${memberId}/link`);

export const trackReferral = (payload) => apiClient.post('/referral/track', payload);

// Additional convenience helpers
export const getMemberProfile = () => apiClient.get('/members/me'); // if backend supports /me
export const setDailyReward = (customerId) => apiClient.post('/loyalty/set-daily-reward', { customerId });
