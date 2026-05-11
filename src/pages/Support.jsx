import React from 'react';
import { Mail, Phone, MapPin, ShieldCheck } from 'lucide-react';

const Support = () => {
  return (
    <div className="animate-fade-in" style={{ padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div className="ios-card" style={{ padding: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem', color: 'var(--ios-olive)' }}>Support & Contact</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', fontSize: '1.1rem' }}>
          We're here to help you on your second mission. If you have any questions regarding our platform, profiling engine, or preparation materials, please reach out to us.
        </p>

        <div style={{ display: 'grid', gap: '2rem' }}>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
            <div style={{ background: 'var(--ios-secondary)', padding: '1rem', borderRadius: '16px', color: 'var(--ios-olive)' }}>
              <Mail size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.25rem' }}>Email Us</h3>
              <p style={{ color: '#666' }}>Our support team typically responds within 24 hours.</p>
              <a href="mailto:support@veernxt.in" style={{ color: 'var(--ios-olive)', fontWeight: '700', textDecoration: 'none', fontSize: '1.1rem' }}>support@veernxt.in</a>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
            <div style={{ background: 'var(--ios-secondary)', padding: '1rem', borderRadius: '16px', color: 'var(--ios-olive)' }}>
              <Phone size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.25rem' }}>Call Us</h3>
              <p style={{ color: '#666' }}>Available Monday to Friday, 9:00 AM - 6:00 PM.</p>
              <a href="tel:+917889530025" style={{ color: 'var(--ios-olive)', fontWeight: '700', textDecoration: 'none', fontSize: '1.1rem' }}>+91-7889530025</a>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
            <div style={{ background: 'var(--ios-secondary)', padding: '1rem', borderRadius: '16px', color: 'var(--ios-olive)' }}>
              <MapPin size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.25rem' }}>Our Office</h3>
              <p style={{ color: '#666' }}>Registered office address for legal correspondence.</p>
              <p style={{ color: 'var(--ios-text)', fontWeight: '600', maxWidth: '300px' }}>
                225, 3rd C Cross Rd, Block 2, 3rd Stage, Basaveshwar Nagar, Bengaluru, Karnataka 560079
              </p>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '1rem', color: '#999' }}>
          <ShieldCheck size={20} />
          <span style={{ fontSize: '0.85rem' }}>Official Support Channel for Veteran Works Private Limited</span>
        </div>
      </div>
    </div>
  );
};

export default Support;
