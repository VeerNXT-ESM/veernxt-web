import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer style={{
      borderTop: '1px solid var(--border)',
      background: 'var(--surface)',
      padding: '1.25rem 2rem',
      marginTop: 'auto',
      transition: 'background-color 0.2s ease, border-color 0.2s ease',
    }}>
      <div style={{
        maxWidth: '100%',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ 
          fontSize: '0.85rem', 
          color: 'var(--text-secondary)',
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
          <Link to="/privacy" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }} className="hover-link">Privacy Policy</Link>
          <Link to="/support" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }} className="hover-link">Support</Link>
          <Link to="/legal" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }} className="hover-link">Legal</Link>
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
