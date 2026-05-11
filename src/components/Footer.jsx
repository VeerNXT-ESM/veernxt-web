import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer style={{
      borderTop: '1px solid #e2e8f0',
      background: 'white',
      padding: '1.25rem 2rem',
      marginTop: 'auto'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ 
          fontSize: '0.85rem', 
          color: '#64748b',
          fontWeight: '500'
        }}>
          © 2026 VeerNXT. Veteran Works Private Limited. All Rights Reserved. Built with Discipline.
        </div>
        
        <div style={{ 
          display: 'flex', 
          gap: '1.5rem', 
          fontSize: '0.85rem',
          fontWeight: '600'
        }}>
          <Link to="/privacy" style={{ color: '#475569', textDecoration: 'none' }} className="hover-link">Privacy Policy</Link>
          <Link to="/support" style={{ color: '#475569', textDecoration: 'none' }} className="hover-link">Support</Link>
          <Link to="/legal" style={{ color: '#475569', textDecoration: 'none' }} className="hover-link">Legal</Link>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .hover-link:hover {
          color: var(--ios-olive) !important;
          text-decoration: underline !important;
        }
        @media (max-width: 768px) {
          footer > div {
            flex-direction: column;
            text-align: center;
          }
        }
      `}} />
    </footer>
  );
};

export default Footer;
