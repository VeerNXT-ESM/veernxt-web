import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Crown, Check, Zap, Shield, BookOpen, Bell, Users, Star, ArrowRight } from 'lucide-react';

const Subscribe = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedTier, setSelectedTier] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentTier, setCurrentTier] = useState('FREE');

  // Check if user was redirected here from a premium resource
  const redirectedFrom = location.state?.from || null;
  const resourceName = location.state?.resourceName || null;

  useEffect(() => {
    const checkSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('subscription_tier')
          .eq('id', session.user.id)
          .single();
        if (profile?.subscription_tier === 'PREMIUM') {
          setCurrentTier('PREMIUM');
        }
      }
    };
    checkSubscription();
  }, []);

  const handleSelectFree = () => {
    if (redirectedFrom) {
      navigate(redirectedFrom);
    } else {
      navigate('/dashboard');
    }
  };

  const handleSelectPremium = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch('/api/payments/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session?.user?.id,
          email: session?.user?.email,
          mobile: session?.user?.user_metadata?.mobile,
        }),
      });
      const data = await res.json();

      if (!data.ok) {
        alert('Error creating subscription: ' + (data.error || 'Unknown error'));
        setLoading(false);
        return;
      }

      // Load Razorpay Checkout
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        const options = {
          key: data.key_id,
          subscription_id: data.subscriptionId,
          name: 'VeerNXT',
          description: 'Premium Subscription — ₹99/month',
          image: '/logo.png',
          handler: async (response) => {
            // Verify payment on backend
            try {
              const verifyRes = await fetch('/api/payments/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_subscription_id: response.razorpay_subscription_id,
                  razorpay_signature: response.razorpay_signature,
                  userId: session?.user?.id,
                }),
              });
              const verifyData = await verifyRes.json();
              if (verifyData.ok) {
                setCurrentTier('PREMIUM');
                alert('🎉 Welcome to VeerNXT Premium!');
                navigate(redirectedFrom || '/dashboard');
              } else {
                alert('Payment verification failed. Contact support@veernxt.in');
              }
            } catch (err) {
              alert('Error verifying payment. Please contact support.');
            }
          },
          prefill: {
            email: session?.user?.email || '',
            contact: session?.user?.user_metadata?.mobile || '',
          },
          theme: { color: '#4B6B32' },
          modal: {
            ondismiss: () => setLoading(false),
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      };
      document.body.appendChild(script);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const features = {
    free: [
      { icon: Shield, text: 'Career Profiling Engine' },
      { icon: Star, text: 'Personalised Dashboard' },
      { icon: BookOpen, text: 'Basic Learning Resources' },
      { icon: Bell, text: 'Live Job Board' },
    ],
    premium: [
      { icon: Shield, text: 'Everything in Free' },
      { icon: Zap, text: 'Premium Mock Tests & Solutions' },
      { icon: Bell, text: 'Priority Job Alerts' },
      { icon: Users, text: '1:1 Career Guidance Sessions' },
      { icon: BookOpen, text: 'Full Study Material Library' },
      { icon: Crown, text: 'Financial Planning Tools' },
    ],
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1F3A2E 100%)',
      padding: '3rem 1.5rem',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(75, 107, 50, 0.2)', padding: '0.5rem 1.25rem',
            borderRadius: '100px', marginBottom: '1.5rem',
            border: '1px solid rgba(75, 107, 50, 0.3)',
          }}>
            <Crown size={16} style={{ color: '#8BB85C' }} />
            <span style={{ color: '#8BB85C', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em' }}>CHOOSE YOUR PLAN</span>
          </div>

          <h1 style={{ color: 'white', fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.03em' }}>
            Unlock Your Potential
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.05rem', maxWidth: '500px', margin: '0 auto' }}>
            {resourceName
              ? `"${resourceName}" is a Premium resource. Upgrade to access it.`
              : 'Start free or go premium for the complete VeerNXT experience.'}
          </p>
        </div>

        {/* Tier Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>

          {/* FREE Card */}
          <div style={{
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '24px',
            padding: '2.5rem 2rem',
            transition: 'all 0.3s ease',
            position: 'relative',
          }}>
            <h3 style={{ color: 'white', fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>Free</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '2rem' }}>
              <span style={{ color: 'white', fontSize: '3rem', fontWeight: 800 }}>₹0</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>/forever</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
              {features.free.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <f.icon size={14} style={{ color: 'rgba(255,255,255,0.6)' }} />
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', fontWeight: 500 }}>{f.text}</span>
                </div>
              ))}
            </div>

            <button onClick={handleSelectFree}
              disabled={currentTier === 'PREMIUM'}
              style={{
                width: '100%', padding: '0.9rem', borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.2)', background: 'transparent',
                color: 'white', fontSize: '0.95rem', fontWeight: 700,
                cursor: currentTier === 'PREMIUM' ? 'default' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: currentTier === 'PREMIUM' ? 0.5 : 1,
              }}>
              {currentTier === 'FREE' ? 'Continue with Free' : 'Current: Premium ✓'}
            </button>
          </div>

          {/* PREMIUM Card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(75, 107, 50, 0.2) 0%, rgba(75, 107, 50, 0.08) 100%)',
            backdropFilter: 'blur(20px)',
            border: '2px solid rgba(75, 107, 50, 0.4)',
            borderRadius: '24px',
            padding: '2.5rem 2rem',
            transition: 'all 0.3s ease',
            position: 'relative',
            boxShadow: '0 20px 60px rgba(75, 107, 50, 0.15)',
          }}>
            {/* Badge */}
            <div style={{
              position: 'absolute', top: '-12px', right: '24px',
              background: 'linear-gradient(135deg, #4B6B32, #6B9B42)',
              padding: '0.35rem 1rem', borderRadius: '100px',
              fontSize: '0.7rem', fontWeight: 800, color: 'white',
              letterSpacing: '0.05em', boxShadow: '0 4px 12px rgba(75, 107, 50, 0.3)',
            }}>
              RECOMMENDED
            </div>

            <h3 style={{ color: 'white', fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>Premium</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '0.5rem' }}>
              <span style={{ color: 'white', fontSize: '3rem', fontWeight: 800 }}>₹99</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>/month</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginBottom: '2rem' }}>Cancel anytime</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
              {features.premium.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(75, 107, 50, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <f.icon size={14} style={{ color: '#8BB85C' }} />
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', fontWeight: 500 }}>{f.text}</span>
                </div>
              ))}
            </div>

            <button onClick={handleSelectPremium}
              disabled={loading || currentTier === 'PREMIUM'}
              style={{
                width: '100%', padding: '0.9rem', borderRadius: '14px',
                border: 'none',
                background: currentTier === 'PREMIUM'
                  ? 'rgba(75, 107, 50, 0.3)'
                  : 'linear-gradient(135deg, #4B6B32, #6B9B42)',
                color: 'white', fontSize: '0.95rem', fontWeight: 700,
                cursor: loading || currentTier === 'PREMIUM' ? 'default' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                boxShadow: currentTier !== 'PREMIUM' ? '0 8px 24px rgba(75, 107, 50, 0.3)' : 'none',
              }}>
              {currentTier === 'PREMIUM' ? 'Active Premium ✓' : (loading ? 'Processing...' : <>Subscribe Now <ArrowRight size={18} /></>)}
            </button>
          </div>
        </div>

        {/* Skip link */}
        {!resourceName && currentTier !== 'PREMIUM' && (
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button onClick={() => navigate('/dashboard')}
              style={{
                background: 'none', border: 'none',
                color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem',
                cursor: 'pointer', fontWeight: 600,
                textDecoration: 'underline',
              }}>
              Skip for now — continue with Free
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Subscribe;
