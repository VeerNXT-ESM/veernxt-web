/**
 * POST /api/payments/verify-payment
 * 
 * Verifies Razorpay payment signature and updates user subscription in Supabase.
 * 
 * Body: {
 *   razorpay_payment_id,
 *   razorpay_subscription_id,
 *   razorpay_signature,
 *   userId
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
    razorpay_signature,
    userId,
  } = req.body || {};

  if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
    return res.status(400).json({ ok: false, error: 'Missing payment verification fields' });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return res.status(500).json({ ok: false, error: 'Razorpay not configured' });
  }

  // 1. Verify signature
  const expectedSignature = createHmac('sha256', keySecret)
    .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
    .digest('hex');

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

        const { error } = await supabase
          .from('user_profiles')
          .update({
            subscription_tier: 'PREMIUM',
            subscription_id: razorpay_subscription_id,
            payment_id: razorpay_payment_id,
            subscription_started_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (error) {
          console.error('Supabase update error:', error);
          // Don't fail the payment verification over a DB write error
        }
      }
    } catch (dbErr) {
      console.error('DB update exception:', dbErr);
    }
  }

  return res.status(200).json({
    ok: true,
    message: 'Payment verified successfully',
    tier: 'PREMIUM',
  });
}
