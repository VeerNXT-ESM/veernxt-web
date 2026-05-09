import React, { useState } from 'react';
import { Landmark, TrendingUp, Briefcase, GraduationCap, ArrowRight, CheckCircle, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const MOCK_SCHEMES = [
  {
    id: 1,
    title: "Agniveer Skill Loan Scheme",
    category: "Loans",
    icon: <Briefcase size={24} />,
    description: "Specialized low-interest loan for Agniveers transitioning to civilian careers, focusing on skill development and vocational training.",
    amount: "Up to ₹5 Lakhs",
    interest: "6.5% p.a.",
    features: ["Zero Processing Fee", "No Collateral Required", "Flexible Repayment up to 5 Years"]
  },
  {
    id: 2,
    title: "Start-up India Seed Fund",
    category: "Business",
    icon: <TrendingUp size={24} />,
    description: "Financial assistance to startups for proof of concept, prototype development, product trials, and market entry.",
    amount: "Up to ₹20 Lakhs",
    interest: "Grant / Equity",
    features: ["Incubator Support", "Mentorship Programs", "Fast-track Approval"]
  },
  {
    id: 3,
    title: "Ex-Servicemen Education Loan",
    category: "Education",
    icon: <GraduationCap size={24} />,
    description: "Dedicated education loan scheme for dependents of ex-servicemen pursuing higher education in recognized institutions.",
    amount: "Up to ₹15 Lakhs",
    interest: "7.0% p.a.",
    features: ["Interest Subsidy", "Covers Tuition & Hostel", "Extended Moratorium Period"]
  },
  {
    id: 4,
    title: "PM Mudra Yojana (PMMY)",
    category: "Business",
    icon: <Landmark size={24} />,
    description: "Funding support for micro-enterprises and small businesses. Ideal for candidates looking to start their own venture post-service.",
    amount: "Up to ₹10 Lakhs",
    interest: "Varies by Bank",
    features: ["Shishu, Kishore, Tarun Tiers", "Mudra Card Provided", "Collateral Free"]
  }
];

const FinancialGuidance = () => {
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', 'Loans', 'Business', 'Education'];

  const filteredSchemes = activeCategory === 'All' 
    ? MOCK_SCHEMES 
    : MOCK_SCHEMES.filter(s => s.category === activeCategory);

  return (
    <div className="financial-wrapper">
      {/* Premium Hero Section */}
      <div className="financial-hero">
        <div className="hero-content animate-fade-in">
          <div className="badge">Partner Network</div>
          <h1>Financial Guidance & Support</h1>
          <p>Explore curated financial schemes, low-interest loans, and startup grants specifically tailored for candidates and transitioning service members.</p>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-num">12+</span>
              <span className="stat-label">Active Schemes</span>
            </div>
            <div className="stat">
              <span className="stat-num">₹0</span>
              <span className="stat-label">Consultation Fee</span>
            </div>
            <div className="stat">
              <span className="stat-num">24/7</span>
              <span className="stat-label">Expert Support</span>
            </div>
          </div>
        </div>
      </div>

      <div className="financial-container">
        {/* Trust Banner */}
        <div className="trust-banner animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <ShieldCheck size={24} color="var(--ios-olive)" />
          <div className="trust-text">
            <strong>Official Financial Partner Integration Coming Soon</strong>
            <span>We are finalizing our partnership with top financial institutions to process these applications seamlessly through our platform.</span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs animate-fade-in" style={{ animationDelay: '0.2s' }}>
          {categories.map(cat => (
            <button 
              key={cat}
              className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Schemes Grid */}
        <div className="schemes-grid">
          {filteredSchemes.map((scheme, idx) => (
            <div key={scheme.id} className="ios-card scheme-card animate-fade-in" style={{ animationDelay: `${0.3 + idx * 0.1}s` }}>
              <div className="scheme-header">
                <div className="scheme-icon">
                  {scheme.icon}
                </div>
                <span className="scheme-category">{scheme.category}</span>
              </div>
              
              <h3 className="scheme-title">{scheme.title}</h3>
              <p className="scheme-desc">{scheme.description}</p>
              
              <div className="scheme-metrics">
                <div className="metric">
                  <span className="metric-label">Max Amount</span>
                  <span className="metric-value">{scheme.amount}</span>
                </div>
                <div className="metric-divider"></div>
                <div className="metric">
                  <span className="metric-label">Interest/Type</span>
                  <span className="metric-value" style={{ color: 'var(--ios-olive)' }}>{scheme.interest}</span>
                </div>
              </div>

              <ul className="scheme-features">
                {scheme.features.map((feature, i) => (
                  <li key={i}><CheckCircle size={14} color="var(--ios-olive)" /> {feature}</li>
                ))}
              </ul>

              <button className="btn-primary scheme-btn" onClick={() => alert('Application portal opening soon in partnership with our financial provider.')}>
                Check Eligibility <ArrowRight size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .financial-wrapper {
          min-height: 100vh;
          background-color: var(--ios-bg);
          padding-bottom: 4rem;
        }

        .financial-hero {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          padding: 5rem 2rem;
          color: white;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .financial-hero::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: radial-gradient(circle at 50% 0%, rgba(75, 107, 50, 0.4) 0%, transparent 70%);
        }

        .hero-content {
          max-width: 800px;
          margin: 0 auto;
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .badge {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 0.5rem 1rem;
          border-radius: 100px;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 1.5rem;
          color: #fbbf24;
        }

        .financial-hero h1 {
          font-size: 3rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          margin-bottom: 1rem;
          color: white;
        }

        .financial-hero p {
          font-size: 1.15rem;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 3rem;
          max-width: 600px;
        }

        .hero-stats {
          display: flex;
          gap: 3rem;
          justify-content: center;
        }

        .stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .stat-num {
          font-size: 2rem;
          font-weight: 800;
          color: white;
          line-height: 1;
        }

        .stat-label {
          font-size: 0.85rem;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .financial-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
          margin-top: -2rem;
          position: relative;
          z-index: 10;
        }

        .trust-banner {
          background: white;
          border-radius: 16px;
          padding: 1.5rem 2rem;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          box-shadow: 0 10px 30px rgba(0,0,0,0.05);
          margin-bottom: 3rem;
          border: 1px solid #f1f5f9;
        }

        .trust-text {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .trust-text strong {
          color: #0f172a;
          font-size: 1.05rem;
        }

        .trust-text span {
          color: #64748b;
          font-size: 0.95rem;
        }

        .filter-tabs {
          display: flex;
          gap: 1rem;
          margin-bottom: 2.5rem;
          flex-wrap: wrap;
        }

        .filter-btn {
          background: white;
          border: 1px solid #e2e8f0;
          padding: 0.75rem 1.5rem;
          border-radius: 100px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-btn:hover {
          border-color: #cbd5e1;
          color: #0f172a;
        }

        .filter-btn.active {
          background: var(--ios-olive);
          color: white;
          border-color: var(--ios-olive);
          box-shadow: 0 4px 12px rgba(75, 107, 50, 0.2);
        }

        .schemes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 2rem;
        }

        .scheme-card {
          display: flex;
          flex-direction: column;
          height: 100%;
          border: 1px solid #e2e8f0;
          transition: transform 0.2s, box-shadow 0.2s;
          padding: 2rem;
        }

        .scheme-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.08);
          border-color: #cbd5e1;
        }

        .scheme-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
        }

        .scheme-icon {
          width: 56px;
          height: 56px;
          background: #f8fafc;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--ios-olive);
        }

        .scheme-category {
          background: #f1f5f9;
          color: #475569;
          padding: 0.4rem 0.8rem;
          border-radius: 100px;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .scheme-title {
          font-size: 1.25rem;
          margin-bottom: 0.75rem;
          line-height: 1.3;
        }

        .scheme-desc {
          color: #64748b;
          font-size: 0.95rem;
          margin-bottom: 2rem;
          flex-grow: 1;
        }

        .scheme-metrics {
          display: flex;
          align-items: center;
          background: #f8fafc;
          padding: 1rem;
          border-radius: 12px;
          margin-bottom: 1.5rem;
        }

        .metric {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .metric-divider {
          width: 1px;
          height: 30px;
          background: #e2e8f0;
          margin: 0 1rem;
        }

        .metric-label {
          font-size: 0.75rem;
          color: #94a3b8;
          font-weight: 600;
          text-transform: uppercase;
        }

        .metric-value {
          font-size: 1rem;
          font-weight: 800;
          color: #0f172a;
        }

        .scheme-features {
          list-style: none;
          margin-bottom: 2rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .scheme-features li {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          color: #334155;
          font-weight: 500;
        }

        .scheme-btn {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          font-size: 1rem;
        }

        @media (max-width: 768px) {
          .financial-hero h1 { font-size: 2.25rem; }
          .hero-stats { flex-direction: column; gap: 1.5rem; }
          .trust-banner { flex-direction: column; text-align: center; }
          .schemes-grid { grid-template-columns: 1fr; }
        }
      `}} />
    </div>
  );
};

export default FinancialGuidance;
