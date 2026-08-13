import { useCallback, useRef, useState } from 'react';

/**
 * In-place Razorpay checkout — used by ProfilingResults.jsx so the ₹9
 * VeerScore unlock (and the ₹1 CV add-on bump right after it) happen without
 * leaving the results page. Unlike Subscribe.jsx (which opens a child /pay
 * popup and waits for a postMessage, because it doesn't own a page the
 * checkout modal can render over), this page owns the whole window, so it
 * can load the Razorpay script and open the modal directly — same
 * options/handler shape src/components/PaymentPage.jsx already uses.
 *
 * Calls the same two existing endpoints Subscribe.jsx uses
 * (/api/payments/create-subscription, /api/payments/verify-payment) —
 * no payment logic is duplicated, only the delivery mechanism differs.
 */
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function useInlineUnlock({ userId, email, mobile, fullName }) {
  const [statusByPlan, setStatusByPlan] = useState({});
  const [errorByPlan, setErrorByPlan] = useState({});
  const identity = useRef({ userId, email, mobile, fullName });
  identity.current = { userId, email, mobile, fullName };

  const purchase = useCallback((planId) => {
    return new Promise((resolve) => {
      const finish = (ok, tier) => {
        setStatusByPlan((s) => ({ ...s, [planId]: ok ? 'success' : 'error' }));
        resolve({ ok, tier });
      };

      const run = async () => {
        setStatusByPlan((s) => ({ ...s, [planId]: 'processing' }));
        setErrorByPlan((e) => ({ ...e, [planId]: null }));

        try {
          const { userId: uid, email: em, mobile: mo, fullName: fn } = identity.current;

          const orderRes = await fetch('/api/payments/create-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: uid, email: em, mobile: mo, planId }),
          });
          const orderData = await orderRes.json();
          if (!orderData.ok) throw new Error(orderData.error || 'Failed to start payment.');

          const scriptLoaded = await loadRazorpayScript();
          if (!scriptLoaded) throw new Error('Failed to load payment gateway.');

          const options = {
            key: orderData.key_id,
            amount: orderData.amount,
            currency: orderData.currency || 'INR',
            name: 'VeerNXT',
            description: planId === 'CV_ADDON' ? 'CV Generation Add-on' : 'VeerScore Unlock',
            order_id: orderData.orderId,
            prefill: { name: fn || 'VeerNXT User', email: em || '', contact: mo || '' },
            theme: { color: '#4b6b32' },
            handler: async (response) => {
              try {
                const verifyRes = await fetch('/api/payments/verify-payment', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature,
                    userId: uid,
                    planId,
                  }),
                });
                const verifyData = await verifyRes.json();
                if (!verifyData.ok) throw new Error(verifyData.error || 'Payment verification failed.');
                finish(true, verifyData.tier);
              } catch (err) {
                setErrorByPlan((e) => ({ ...e, [planId]: err.message }));
                finish(false, null);
              }
            },
            modal: {
              ondismiss: () => {
                setStatusByPlan((s) => ({ ...s, [planId]: 'idle' }));
                resolve({ ok: false, cancelled: true });
              },
            },
          };

          new window.Razorpay(options).open();
        } catch (err) {
          setErrorByPlan((e) => ({ ...e, [planId]: err.message }));
          finish(false, null);
        }
      };

      run();
    });
  }, []);

  return {
    purchase,
    statusFor: (planId) => statusByPlan[planId] || 'idle',
    errorFor: (planId) => errorByPlan[planId] || null,
  };
}
