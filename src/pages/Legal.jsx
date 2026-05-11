import React from 'react';

const Legal = () => {
  return (
    <div className="animate-fade-in" style={{ padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div className="ios-card" style={{ padding: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '2rem', color: 'var(--ios-olive)' }}>Legal & Terms</h1>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', color: '#444', lineHeight: '1.6' }}>
          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#111', marginBottom: '1rem' }}>1. Agreement to Terms</h2>
            <p>By accessing or using VeerNXT, you agree to be bound by these Terms and Conditions. These terms constitute a legally binding agreement between you and <strong>Veteran Works Private Limited</strong>.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#111', marginBottom: '1rem' }}>2. Intellectual Property</h2>
            <p>The content on VeerNXT, including the profiling engine algorithms, textbooks, practice papers, and software, is owned by or licensed to Veteran Works Private Limited and is protected by copyright and other intellectual property laws.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#111', marginBottom: '1rem' }}>3. User Conduct</h2>
            <p>Users are expected to provide accurate information during profiling. Any attempt to manipulate the system, scrape content, or bypass security measures (including our secure document readers) will result in immediate termination of access and potential legal action.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#111', marginBottom: '1rem' }}>4. Payment Terms</h2>
            <p>Access to premium study materials and advanced profiling reports may require payment. All transactions are processed through secure gateways (Razorpay). Refund policies for specific digital products are detailed at the time of purchase.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#111', marginBottom: '1rem' }}>5. Limitation of Liability</h2>
            <p>Veteran Works Private Limited shall not be liable for any indirect, incidental, special, consequential or punitive damages resulting from your use of or inability to use the service.</p>
          </section>

          <section style={{ borderTop: '1px solid #eee', paddingTop: '2rem', marginTop: '2rem' }}>
            <p style={{ fontWeight: '700', color: '#111' }}>Veteran Works Private Limited</p>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>CIN: [Corporate Identification Number]</p>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>Registered Office: 225, 3rd C Cross Rd, Block 2, 3rd Stage, Basaveshwar Nagar, Bengaluru, Karnataka 560079</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Legal;
