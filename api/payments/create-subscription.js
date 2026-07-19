/**
 * POST /api/payments/create-subscription
 * 
 * Creates a Razorpay Order for any of the 6 pricing tiers.
 * 
 * Body: { userId, email, mobile, planId }
 */

import Razorpay from 'razorpay';

const PLAN_AMOUNTS = {
  SCORE_UNLOCK: 900,     // ₹9 in paise
  SCORE_CV: 1000,        // ₹10 in paise
  MONTHLY: 4900,         // ₹49 in paise
  ANNUAL: 29900,         // ₹299 in paise
  BIENNIAL: 39900,       // ₹399 in paise
  PREMIUM: 49900,        // ₹499 in paise
};

export default async function handler(req, res) {
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
