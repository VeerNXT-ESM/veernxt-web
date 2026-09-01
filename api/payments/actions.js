import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';

/**
 * /api/payments/actions
 *
 * Combines what used to be two separate serverless functions
 * (create-subscription.js, verify-payment.js) into one, purely to stay
 * under Vercel Hobby's 12-function-per-deployment cap. External URLs are
 * unchanged -- vercel.json rewrites /api/payments/create-subscription and
 * /api/payments/verify-payment to this file with a `fn` query param, so
 * client call sites (Subscribe.jsx, useInlineUnlock.js) need no changes.
 * Underlying behavior of each handler is unchanged, just relocated.
 */

const PLAN_AMOUNTS = {
  MONTHLY: 4900,         // ₹49 in paise
  ANNUAL: 29900,         // ₹299 in paise
  BIENNIAL: 39900,       // ₹399 in paise
  PREMIUM: 49900,        // ₹499 in paise
};

async function handleCreateSubscription(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return res.status(500).json({ ok: false, error: 'Razorpay not configured on server' });
  }

  const instance = new Razorpay({ key_id: keyId, key_secret: keySecret });
  const { userId, email, mobile, planId } = req.body || {};

  if (!planId || !PLAN_AMOUNTS[planId]) {
    return res.status(400).json({ ok: false, error: 'Invalid or missing planId' });
  }

  let planAmount = PLAN_AMOUNTS[planId];
  if (process.env.DEVTEST === 'true') {
    planAmount = 100; // Force ₹1 (100 paise) for testing
  }

  try {
    // Create a Razorpay Order (works domain-wide and simplifies setup)
    const order = await instance.orders.create({
      amount: planAmount,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      notes: {
        userId: userId || 'unknown',
        email: email || '',
        mobile: mobile || '',
        planId: planId,
      },
    });

    return res.status(200).json({
      ok: true,
      orderId: order.id,
      amount: planAmount,
      currency: 'INR',
      key_id: keyId,
      planId: planId,
    });
  } catch (err) {
    console.error('Razorpay create order error:', err);
    return res.status(500).json({ ok: false, error: err.error?.description || err.message });
  }
}

async function handleVerifyPayment(req, res) {
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

  // CV_ADDON is a checkout SKU (the ₹1 post-unlock bonus), not a real tier —
  // it upgrades the user to the SCORE_CV tier that already exists.
  const tierToPersist = planId === 'CV_ADDON' ? 'SCORE_CV' : (planId || 'FREE');

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
          subscription_tier: tierToPersist,
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
    tier: tierToPersist,
  });
}

export default async function handler(req, res) {
  const { fn } = req.query || {};
  if (fn === 'create-subscription') return handleCreateSubscription(req, res);
  if (fn === 'verify-payment') return handleVerifyPayment(req, res);
  return res.status(404).json({ ok: false, error: 'Unknown payments endpoint.' });
}
