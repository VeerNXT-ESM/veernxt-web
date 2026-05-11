import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Settings, LogOut, User, Bell, Landmark } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <header className="glass-header">
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'between' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'inherit' }}>
            <div style={{ width: '32px', height: '32px', background: 'var(--ios-olive)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
              V
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: '700', letterSpacing: '-0.02em' }}>VeerNXT</span>
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <button style={{ background: 'none', border: 'none', color: 'var(--ios-text)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Bell size={20} />
          </button>
          
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              style={{ background: 'var(--ios-secondary)', border: 'none', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--ios-olive)' }}
            >
              <Menu size={20} />
            </button>

            {isMenuOpen && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', width: '200px', background: 'white', border: '1px solid #eee', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 100, overflow: 'hidden' }}>
                <div style={{ padding: '0.5rem' }}>
                  <button onClick={() => { navigate('/dashboard'); setIsMenuOpen(false); }} style={{ width: '100%', padding: '0.75rem', border: 'none', background: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--ios-text)' }}>
                    <User size={16} /> Dashboard
                  </button>
                  <button onClick={() => { navigate('/financial-guidance'); setIsMenuOpen(false); }} style={{ width: '100%', padding: '0.75rem', border: 'none', background: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--ios-text)' }}>
                    <Landmark size={16} /> Financial Guidance
                  </button>
                  <button onClick={() => { setIsMenuOpen(false); }} style={{ width: '100%', padding: '0.75rem', border: 'none', background: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--ios-text)' }}>
                    <Settings size={16} /> Settings
                  </button>
                  <div style={{ height: '1px', background: '#eee', margin: '0.5rem 0' }}></div>
                  <button onClick={() => { navigate('/privacy'); setIsMenuOpen(false); }} style={{ width: '100%', padding: '0.75rem', border: 'none', background: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--ios-text)' }}>
                    Privacy Policy
                  </button>
                  <button onClick={() => { navigate('/support'); setIsMenuOpen(false); }} style={{ width: '100%', padding: '0.75rem', border: 'none', background: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--ios-text)' }}>
                    Support
                  </button>
                  <button onClick={() => { navigate('/legal'); setIsMenuOpen(false); }} style={{ width: '100%', padding: '0.75rem', border: 'none', background: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--ios-text)' }}>
                    Legal
                  </button>
                  <div style={{ height: '1px', background: '#eee', margin: '0.5rem 0' }}></div>
                  <button onClick={handleLogout} style={{ width: '100%', padding: '0.75rem', border: 'none', background: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', color: '#ef4444' }}>
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
