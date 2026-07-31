import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export const PaymentPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // 1. Parse payment parameters from URL query string
    const keyId = searchParams.get('key_id');
    const orderId = searchParams.get('order_id');
    const amount = searchParams.get('amount');
    const name = searchParams.get('name') || 'VeerNXT User';
    const email = searchParams.get('email') || '';
    const contact = searchParams.get('contact') || '';
    const origin = searchParams.get('origin') || '*';

    const devtest = searchParams.get('devtest') === 'true';

    if (!keyId || !orderId || !amount) {
      setStatus('error');
      setErrorMsg('Missing required payment parameters.');
      return;
    }

    // 2. Dynamically load Razorpay Checkout Script
    const loadRazorpay = () => {
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
    };

    const initializeCheckout = async () => {
      const isLoaded = await loadRazorpay();
      if (!isLoaded) {
        setStatus('error');
        setErrorMsg('Failed to load payment gateway script.');
        return;
      }

      setStatus('active');

      const options = {
        key: keyId,
        amount: devtest ? 100 : amount,
        currency: 'INR',
        name: 'VeerNXT',
        description: 'Premium Plan Upgrade',
        order_id: orderId,
        handler: function (response) {
          setStatus('success');
          // Send response securely back to opening window
          if (window.opener) {
            window.opener.postMessage(
              {
                status: 'success',
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              },
              origin
            );
          }
          setTimeout(() => {
            window.close();
          }, 1500);
        },
        prefill: {
          name: name,
          email: email,
          contact: contact,
        },
        theme: {
          color: '#4b6b32', // Olive color theme
        },
        modal: {
          ondismiss: function () {
            setStatus('cancelled');
            if (window.opener) {
              window.opener.postMessage({ status: 'cancel' }, origin);
            }
            setTimeout(() => {
              window.close();
            }, 1000);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    };

    initializeCheckout();
  }, [searchParams]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#334155',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <div style={{
        background: 'white',
        padding: '3rem',
        borderRadius: '20px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
        maxWidth: '400px',
        width: '100%'
      }}>
        {status === 'loading' && (
          <>
            <div style={spinnerStyle}></div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '1.5rem 0 0.5rem' }}>Preparing Payment</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Loading secure checkout window...</p>
          </>
        )}

        {status === 'active' && (
          <>
            <div style={spinnerStyle}></div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '1.5rem 0 0.5rem' }}>Checkout Window Open</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Please complete your payment in the secure Razorpay overlay.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={successIconStyle}>✓</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '1.5rem 0 0.5rem', color: '#16a34a' }}>Payment Successful</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Updating account details, closing window...</p>
          </>
        )}

        {status === 'cancelled' && (
          <>
            <div style={warningIconStyle}>!</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '1.5rem 0 0.5rem', color: '#d97706' }}>Payment Cancelled</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Returning to application...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={errorIconStyle}>✕</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '1.5rem 0 0.5rem', color: '#dc2626' }}>Payment Error</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{errorMsg}</p>
            <button 
              onClick={() => window.close()} 
              style={{
                background: '#dc2626', color: 'white', border: 'none', 
                padding: '0.75rem 1.5rem', borderRadius: '10px', fontWeight: 600, 
                cursor: 'pointer'
              }}
            >
              Close Window
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// Styles for custom elements
const spinnerStyle = {
  width: '50px',
  height: '50px',
  border: '4px solid #f3f3f3',
  borderTop: '4px solid #4b6b32',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
  margin: '0 auto'
};

const successIconStyle = {
  width: '60px',
  height: '60px',
  borderRadius: '50%',
  background: '#f0fdf4',
  color: '#16a34a',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '2rem',
  fontWeight: 'bold',
  margin: '0 auto'
};

const warningIconStyle = {
  width: '60px',
  height: '60px',
  borderRadius: '50%',
  background: '#fffbeb',
  color: '#d97706',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '2rem',
  fontWeight: 'bold',
  margin: '0 auto'
};

const errorIconStyle = {
  width: '60px',
  height: '60px',
  borderRadius: '50%',
  background: '#fef2f2',
  color: '#dc2626',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.8rem',
  fontWeight: 'bold',
  margin: '0 auto'
};

// CSS keyframe spin injection
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.innerText = `@keyframes spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(styleSheet);
}
