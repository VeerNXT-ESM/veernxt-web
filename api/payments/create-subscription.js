/**
 * POST /api/payments/create-subscription
 * 
 * Creates a Razorpay Subscription for the PREMIUM tier (₹99/month).
 * The plan is created on-the-fly if it doesn't exist yet.
 * 
 * Body: { userId: "supabase-user-id", email: "user@email.com", mobile: "919876543210" }
 */

import Razorpay from 'razorpay';

const PREMIUM_PLAN = {
  period: 'monthly',
  interval: 1,
  item: {
    name: 'VeerNXT Premium',
    amount: 9900, // ₹99 in paise
    currency: 'INR',
    description: 'VeerNXT Premium — Priority Job Alerts, Mock Tests, 1:1 Guidance',
  },
};

// Cache plan_id across invocations (Vercel keeps warm instances for ~5 min)
let cachedPlanId = null;

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
  const { userId, email, mobile } = req.body || {};

  try {
    // 1. Ensure plan exists
    let planId = cachedPlanId;
    if (!planId) {
      // Try to find existing plan, or create one
      try {
        const plans = await instance.plans.all({ count: 10 });
        const existing = plans.items?.find(
          (p) => p.item?.name === 'VeerNXT Premium' && p.item?.amount === 9900
        );
        if (existing) {
          planId = existing.id;
        }
      } catch (e) {
        // plans.all may fail, just create fresh
      }

      if (!planId) {
        const plan = await instance.plans.create(PREMIUM_PLAN);
        planId = plan.id;
      }
      cachedPlanId = planId;
    }

    // 2. Create subscription
    const subscription = await instance.subscriptions.create({
      plan_id: planId,
      total_count: 12, // 12 billing cycles
      customer_notify: 1,
      quantity: 1,
      notes: {
        userId: userId || 'unknown',
        email: email || '',
        mobile: mobile || '',
        tier: 'PREMIUM',
      },
    });

    return res.status(200).json({
      ok: true,
      subscriptionId: subscription.id,
      planId: planId,
      amount: 9900,
      currency: 'INR',
      key_id: keyId, // Frontend needs this for Razorpay Checkout
    });
  } catch (err) {
    console.error('Razorpay create-subscription error:', err);
    return res.status(500).json({ ok: false, error: err.error?.description || err.message });
  }
}
