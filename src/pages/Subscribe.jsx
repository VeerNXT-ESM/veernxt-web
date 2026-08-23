import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PLAN_DETAILS, TIERS, getEffectiveTier, isTierAtLeast } from '../lib/subscriptionAccess';
import { Crown, Check, Zap, Shield, BookOpen, Users, ArrowRight, Lock, FileText, Award, Sparkles } from 'lucide-react';

const Subscribe = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentTier, setCurrentTier] = useState('FREE');
  const [expiresAt, setExpiresAt] = useState(null);
  const [session, setSession] = useState(null);

  // Check if user was redirected from profiling or a locked feature
  const fromProfiling = searchParams.get('from') === 'profiling';
  const highlightPlan = searchParams.get('plan') || null;
  const redirectedFrom = location.state?.from || null;
  const resourceName = location.state?.resourceName || null;

  // Dynamically load Razorpay locally on mount (for local testing)
  useEffect(() => {
    const loadLocalRazorpay = () => {
      if (window.Razorpay) return;
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      document.body.appendChild(script);
    };
    loadLocalRazorpay();
  }, []);

  useEffect(() => {
    const checkSubscription = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      if (currentSession?.user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('subscription_tier, subscription_expires_at')
          .eq('id', currentSession.user.id)
          .maybeSingle();
        if (profile) {
          const effective = getEffectiveTier(profile.subscription_tier, profile.subscription_expires_at);
          setCurrentTier(effective);
          setExpiresAt(profile.subscription_expires_at);
        }
      }
    };
    checkSubscription();
  }, []);

  // Secure message listener to receive response from popup window in production
  useEffect(() => {
    const handlePaymentMessage = async (event) => {
      const allowedOrigins = ['https://veernxt.in', 'http://veernxt.in'];
      
      // For local testing, allow messages from the local VeerNXT portal (port 3000)
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        allowedOrigins.push('http://localhost:3000');
        allowedOrigins.push('http://127.0.0.1:3000');
      }

      if (!allowedOrigins.includes(event.origin) && event.origin !== window.location.origin) {
        return;
      }

      if (event.data && event.data.status === 'success') {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = event.data;
        
        setLoading(true);
        try {
          const res = await fetch('/api/payments/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_payment_id,
              razorpay_order_id,
              razorpay_signature,
              userId: session?.user?.id,
              planId: selectedPlan,
            }),
          });
          
          const result = await res.json();
          if (result.ok) {
            alert('🎉 Plan activated successfully!');
            navigate(redirectedFrom || '/dashboard');
          } else {
            alert(`Payment verification failed: ${result.error}`);
          }
        } catch (err) {
          console.error('Error verifying payment:', err);
          alert('Failed to verify payment status. Please contact support.');
        } finally {
          setLoading(false);
          setSelectedPlan(null);
        }
      } else if (event.data && event.data.status === 'cancel') {
        setLoading(false);
        setSelectedPlan(null);
        alert('Payment cancelled.');
      }
    };

    window.addEventListener('message', handlePaymentMessage);
    return () => window.removeEventListener('message', handlePaymentMessage);
  }, [session, selectedPlan, redirectedFrom, navigate]);

  const launchCheckoutPopup = (paymentData, email, mobile, fullName) => {
    // Determine the base URL of the VeerNXT portal (same origin)
    const targetPortalBase = window.location.origin;
    
    const isDevTest = paymentData.amount === 100;
    const payUrl = `${targetPortalBase}/pay?key_id=${paymentData.key_id}&order_id=${paymentData.orderId}&amount=${paymentData.amount}&name=${encodeURIComponent(fullName)}&email=${encodeURIComponent(email)}&contact=${encodeURIComponent(mobile)}&origin=${encodeURIComponent(window.location.origin)}${isDevTest ? '&devtest=true' : ''}`;
    
    // Open centered popup
    const width = 500;
    const height = 650;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    window.open(
      payUrl,
      'VeerNXTPayment',
      `width=${width},height=${height},top=${top},left=${left},status=no,resizable=yes`
    );
  };

  const handleSelectPlan = async (planId) => {
    if (isTierAtLeast(currentTier, planId)) return; // Already has this tier or higher
    setSelectedPlan(planId);
    setLoading(true);

    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', session?.user?.id)
        .single();
      
      const fullName = profile?.full_name || 'VeerNXT User';
      const email = session?.user?.email || '';
      const mobile = session?.user?.user_metadata?.mobile || '';

      const response = await fetch('/api/payments/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session?.user?.id,
          email,
          mobile,
          planId,
        }),
      });

      const paymentData = await response.json();

      if (!paymentData.ok) {
        throw new Error(paymentData.error || 'Failed to initiate payment.');
      }

      // Always launch checkout inside the popup bridge on the target domain
      launchCheckoutPopup(paymentData, email, mobile, fullName);
    } catch (err) {
      console.error('Error starting checkout:', err);
      alert(`Error starting payment: ${err.message}`);
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  const handleSkip = () => {
    navigate(redirectedFrom || '/dashboard');
  };

  const isCurrentOrHigher = (planId) => isTierAtLeast(currentTier, planId);

  // Icons for features
  const featureIcon = (text) => {
    if (text.toLowerCase().includes('veerscore') || text.toLowerCase().includes('score')) return Award;
    if (text.toLowerCase().includes('cv') || text.toLowerCase().includes('resume') || text.toLowerCase().includes('profile')) return FileText;
    if (text.toLowerCase().includes('exam') || text.toLowerCase().includes('mock') || text.toLowerCase().includes('test')) return Zap;
    if (text.toLowerCase().includes('mentor') || text.toLowerCase().includes('session') || text.toLowerCase().includes('guidance')) return Users;
    if (text.toLowerCase().includes('study') || text.toLowerCase().includes('guide') || text.toLowerCase().includes('library') || text.toLowerCase().includes('material')) return BookOpen;
    if (text.toLowerCase().includes('save')) return Sparkles;
    return Check;
  };

  const subscriptionPlans = PLAN_DETAILS.filter(p => p.type === 'subscription');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1F3A2E 100%)',
      padding: '3rem 1.5rem',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
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
            {fromProfiling ? 'Your Profile is Ready!' : 'Unlock Your Potential'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.05rem', maxWidth: '560px', margin: '0 auto' }}>
            {fromProfiling
              ? 'Unlock your VeerScore and personalised exam recommendations to kickstart your transition.'
              : resourceName
                ? `"${resourceName}" requires a paid plan. Choose one below.`
                : 'Start free or choose a plan for the complete VeerNXT experience.'}
          </p>
        </div>

        {/* Current Plan Badge */}
        {currentTier !== TIERS.FREE && (
          <div style={{
            textAlign: 'center', marginBottom: '2rem',
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
              background: 'rgba(75, 107, 50, 0.15)', padding: '0.75rem 1.5rem',
              borderRadius: '14px', border: '1px solid rgba(75, 107, 50, 0.3)',
            }}>
              <Shield size={18} style={{ color: '#8BB85C' }} />
              <span style={{ color: '#8BB85C', fontSize: '0.9rem', fontWeight: 700 }}>
                Current Plan: {PLAN_DETAILS.find(p => p.id === currentTier)?.name || currentTier}
              </span>
              {expiresAt && (
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                  · Expires {new Date(expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        )}

        {/* SUBSCRIPTION PLANS */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem', textAlign: 'center' }}>
            SUBSCRIPTION PLANS
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            {subscriptionPlans.map((plan) => {
              const isOwned = isCurrentOrHigher(plan.id);
              const isHighlighted = highlightPlan === plan.id || plan.badge === 'BEST VALUE';
              return (
                <div key={plan.id} style={{
                  background: isHighlighted
                    ? 'linear-gradient(135deg, rgba(75, 107, 50, 0.2) 0%, rgba(75, 107, 50, 0.08) 100%)'
                    : 'rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(20px)',
                  border: isHighlighted ? '2px solid rgba(75, 107, 50, 0.4)' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '20px',
                  padding: '2rem 1.75rem',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  opacity: isOwned ? 0.7 : 1,
                  boxShadow: isHighlighted ? '0 20px 60px rgba(75, 107, 50, 0.15)' : 'none',
                }}>
                  {plan.badge && (
                    <div style={{
                      position: 'absolute', top: '-12px', right: '20px',
                      background: plan.badge === 'INCLUDES MENTORSHIP'
                        ? 'linear-gradient(135deg, #6B46C1, #8B5CF6)'
                        : 'linear-gradient(135deg, #4B6B32, #6B9B42)',
                      padding: '0.3rem 0.9rem', borderRadius: '100px',
                      fontSize: '0.65rem', fontWeight: 800, color: 'white',
                      letterSpacing: '0.05em', boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    }}>
                      {plan.badge}
                    </div>
                  )}

                  <h3 style={{ color: 'white', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>{plan.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: 'white', fontSize: '2.5rem', fontWeight: 800 }}>{plan.priceLabel}</span>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>{plan.durationLabel}</span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', marginBottom: '1.5rem' }}>{plan.duration}</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginBottom: '2rem' }}>
                    {plan.features.map((feat, i) => {
                      const Icon = featureIcon(feat);
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{
                            width: '24px', height: '24px', borderRadius: '6px',
                            background: plan.id === 'PREMIUM' ? 'rgba(107, 70, 193, 0.15)' : 'rgba(75, 107, 50, 0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            <Icon size={12} style={{ color: plan.id === 'PREMIUM' ? '#A78BFA' : '#8BB85C' }} />
                          </div>
                          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.82rem', fontWeight: 500 }}>{feat}</span>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={loading || isOwned}
                    style={{
                      width: '100%', padding: '0.8rem', borderRadius: '12px',
                      border: isOwned ? '1px solid rgba(75, 107, 50, 0.3)' : 'none',
                      background: isOwned
                        ? 'transparent'
                        : plan.id === 'PREMIUM'
                          ? 'linear-gradient(135deg, #6B46C1, #8B5CF6)'
                          : 'linear-gradient(135deg, #4B6B32, #6B9B42)',
                      color: 'white', fontSize: '0.9rem', fontWeight: 700,
                      cursor: isOwned ? 'default' : 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      boxShadow: !isOwned ? '0 6px 20px rgba(0,0,0,0.2)' : 'none',
                    }}
                  >
                    {isOwned
                      ? (currentTier === plan.id ? 'Current Plan ✓' : 'Included ✓')
                      : (loading && selectedPlan === plan.id ? 'Processing...' : <>Subscribe <ArrowRight size={16} /></>)
                    }
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Free Tier Info */}
        <div style={{
          maxWidth: '600px', margin: '2rem auto 0',
          background: 'rgba(255,255,255,0.04)', borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem 2rem',
        }}>
          <h3 style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem' }}>
            🆓 Free Tier Includes
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
            {[
              'Career Profiling Engine',
              'Personalised CV / Resume',
              'Introductory Resources',
              'Full Guidebooks',
              '1 Free Mock Test',
              'Live Job Board',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Check size={14} style={{ color: '#8BB85C', flexShrink: 0 }} />
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: 500 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Skip link */}
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button onClick={handleSkip}
            style={{
              background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem',
              cursor: 'pointer', fontWeight: 600,
              textDecoration: 'underline',
            }}>
            {fromProfiling ? 'Skip for now — continue to Dashboard' : 'Back to Dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Subscribe;
