/**
 * POST /api/payments/verify-payment
 * 
 * Verifies Razorpay payment signature and updates user subscription in Supabase.
 * 
 * Body: {
 *   razorpay_payment_id,
 *   razorpay_subscription_id,
 *   razorpay_order_id,
 *   razorpay_signature,
 *   userId,
 *   planId
 * }
 */

import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const {
    razorpay_payment_id,
    razorpay_subscription_id,
    razorpay_order_id,
    razorpay_signature,
    userId,
    planId,
  } = req.body || {};

  if (!razorpay_payment_id || (!razorpay_subscription_id && !razorpay_order_id) || !razorpay_signature) {
    return res.status(400).json({ ok: false, error: 'Missing payment verification fields' });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return res.status(500).json({ ok: false, error: 'Razorpay not configured' });
  }

  // 1. Verify signature
  let expectedSignature;
  if (razorpay_subscription_id) {
    expectedSignature = createHmac('sha256', keySecret)
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest('hex');
  } else {
    expectedSignature = createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
  }

  if (expectedSignature !== razorpay_signature) {
    console.error('Payment signature mismatch');
    return res.status(400).json({ ok: false, error: 'Payment verification failed — invalid signature' });
  }

  // 2. Update user subscription in Supabase
  if (userId) {
    try {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && serviceKey) {
        const supabase = createClient(supabaseUrl, serviceKey);

        // Calculate subscription expiry
        let expiresAt = null;
        const now = new Date();
        if (planId === 'MONTHLY') {
          expiresAt = new Date(now.setMonth(now.getMonth() + 1)).toISOString();
        } else if (planId === 'ANNUAL') {
          expiresAt = new Date(now.setFullYear(now.getFullYear() + 1)).toISOString();
        } else if (planId === 'BIENNIAL' || planId === 'PREMIUM') {
          expiresAt = new Date(now.setFullYear(now.getFullYear() + 2)).toISOString();
        }

        const updatePayload = {
          subscription_tier: planId || 'FREE',
          subscription_id: razorpay_subscription_id || razorpay_order_id || null,
          payment_id: razorpay_payment_id,
          subscription_started_at: new Date().toISOString(),
          subscription_expires_at: expiresAt,
        };

        const { error } = await supabase
          .from('user_profiles')
          .update(updatePayload)
          .eq('id', userId);

        if (error) {
          console.error('Supabase update error:', error);
          return res.status(500).json({ ok: false, error: `Database update failed: ${error.message}` });
        }
      }
    } catch (dbErr) {
      console.error('DB update exception:', dbErr);
      return res.status(500).json({ ok: false, error: 'Database connection failed' });
    }
  }

  return res.status(200).json({
    ok: true,
    message: 'Payment verified successfully',
    tier: planId || 'FREE',
  });
}
