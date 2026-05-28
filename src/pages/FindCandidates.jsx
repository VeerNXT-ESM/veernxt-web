import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Search, Sliders, Award, User, MapPin, 
  Briefcase, CheckCircle2, ChevronRight, MessageSquare, Info 
} from 'lucide-react';
import CandidateProfileTemplate from '../components/CandidateProfileTemplate';

const FindCandidates = () => {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  
  // Advanced filter criteria states
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [selectedQuota, setSelectedQuota] = useState('All');
  const [minVeerScore, setMinVeerScore] = useState(0);

  useEffect(() => {
    const loadCandidates = async () => {
      setLoading(true);
      try {
        // Load profiles from database or fallback to rich mock data mapping tri-service csv profiles
        const mockProfilesList = [
          {
            id: '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
            full_name: 'Rahul Kumar (Clerk SD)',
            veer_score: 94,
            service_branch: 'Indian Army',
            reservation_category: 'OBC',
            profile_data: {
              armCorpsTrade: 'Clerk SD',
              roleAppointment: 'Storekeeper Technical',
              totalServiceDuration: '4 Years',
              educationLevel: '12th Pass',
              stateOfDomicile: 'Uttar Pradesh',
              district: 'Lucknow',
              skills: ['Administration', 'Inventory Control', 'Data Archival', 'Logistics Management']
            }
          },
          {
            id: '2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e',
            full_name: 'Amit Singh',
            veer_score: 87,
            service_branch: 'Indian Navy',
            reservation_category: 'General',
            profile_data: {
              armCorpsTrade: 'Seaman Branch',
              roleAppointment: 'Leading Hand',
              totalServiceDuration: '4 Years',
              educationLevel: 'Graduate',
              stateOfDomicile: 'Haryana',
              district: 'Rohtak',
              skills: ['Navigation Support', 'Team Administration', 'Physical Security', 'Telecom Operations']
            }
          },
          {
            id: '3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
            full_name: 'Vikram Vardhan',
            veer_score: 91,
            service_branch: 'Indian Air Force',
            reservation_category: 'SC',
            profile_data: {
              armCorpsTrade: 'Mechanical Fitter',
              roleAppointment: 'Agniveer IAF Fitter',
              totalServiceDuration: '4 Years',
              educationLevel: '12th Pass',
              stateOfDomicile: 'Punjab',
              district: 'Jalandhar',
              skills: ['Engine Overhaul', 'System Inspection', 'Precision Hydraulics', 'Heavy Machinery']
            }
          },
          {
            id: '4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a',
            full_name: 'Deepak Sharma',
            veer_score: 89,
            service_branch: 'Indian Army',
            reservation_category: 'EWS',
            profile_data: {
              armCorpsTrade: 'Signals Branch',
              roleAppointment: 'Telecom Operator',
              totalServiceDuration: '4 Years',
              educationLevel: 'Graduate',
              stateOfDomicile: 'Rajasthan',
              district: 'Jaipur',
              skills: ['Radio Transmission', 'Encrypted Comms', 'Network Security', 'Diagnostics']
            }
          },
          {
            id: '5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9a0b',
            full_name: 'Sandhya Rani',
            veer_score: 93,
            service_branch: 'Indian Air Force',
            reservation_category: 'ST',
            profile_data: {
              armCorpsTrade: 'Meteorological Branch',
              roleAppointment: 'IAF Airwoman GD',
              totalServiceDuration: '4 Years',
              educationLevel: 'Graduate',
              stateOfDomicile: 'Odisha',
              district: 'Cuttack',
              skills: ['Climate Analysis', 'Data Aggregation', 'Reporting', 'Emergency Coordination']
            }
          }
        ];

        setCandidates(mockProfilesList);
        setFilteredCandidates(mockProfilesList);
        setSelectedCandidate(mockProfilesList[0]);
      } catch (err) {
        console.error('Error fetching candidates:', err);
      } finally {
        setLoading(false);
      }
    };
    loadCandidates();
  }, []);

  // Filter application pipeline
  useEffect(() => {
    let result = candidates;

    // Search query matching
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.full_name.toLowerCase().includes(q) ||
        c.service_branch.toLowerCase().includes(q) ||
        (c.profile_data.armCorpsTrade && c.profile_data.armCorpsTrade.toLowerCase().includes(q))
      );
    }

    // Branch filter
    if (selectedBranch !== 'All') {
      result = result.filter(c => c.service_branch === selectedBranch);
    }

    // Reservation Category filter
    if (selectedQuota !== 'All') {
      result = result.filter(c => c.reservation_category === selectedQuota);
    }

    // Veer Score filter
    if (minVeerScore > 0) {
      result = result.filter(c => c.veer_score >= minVeerScore);
    }

    setFilteredCandidates(result);
    if (result.length > 0) {
      setSelectedCandidate(result[0]);
    } else {
      setSelectedCandidate(null);
    }
  }, [searchQuery, selectedBranch, selectedQuota, minVeerScore, candidates]);

  const handleStartChat = (candidate) => {
    navigate('/messaging', { state: { recipient: candidate } });
  };

  const getInitials = (name) => {
    if (!name) return 'V';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className="employer-portal-view animate-fade-in">
      {/* Top Hero Filter block */}
      <div className="employer-portal-header">
        <h1 style={{ fontSize: '2.25rem', fontWeight: 850, letterSpacing: '-0.02em', color: '#111827' }}>
          Find Transitioning Military Candidates
        </h1>
        <p style={{ color: '#666', marginTop: '0.25rem', fontSize: '1.05rem' }}>
          Search, filter reservation quotas, and review profiles of Agniveer and Ex-Servicemen transitioning to civilian industry.
        </p>

        {/* Filters Panel Grid */}
        <div className="portal-filters-grid">
          <div className="filter-item-wrapper">
            <label>Search Keyword</label>
            <div className="filter-input-container">
              <Search size={16} className="filter-icon" />
              <input 
                type="text" 
                placeholder="Search by name, trade or role..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="filter-textbox"
              />
            </div>
          </div>

          <div className="filter-item-wrapper">
            <label>Service Branch</label>
            <select 
              value={selectedBranch} 
              onChange={e => setSelectedBranch(e.target.value)}
              className="filter-dropdown"
            >
              <option value="All">All Branches</option>
              <option value="Indian Army">Indian Army</option>
              <option value="Indian Navy">Indian Navy</option>
              <option value="Indian Air Force">Indian Air Force</option>
            </select>
          </div>

          <div className="filter-item-wrapper">
            <label>Reservation Quota</label>
            <select 
              value={selectedQuota} 
              onChange={e => setSelectedQuota(e.target.value)}
              className="filter-dropdown"
            >
              <option value="All">All Quotas</option>
              <option value="General">General / None</option>
              <option value="OBC">OBC (Other Backward Classes)</option>
              <option value="SC">SC (Scheduled Castes)</option>
              <option value="ST">ST (Scheduled Tribes)</option>
              <option value="EWS">EWS (Economically Weaker Section)</option>
            </select>
          </div>

          <div className="filter-item-wrapper">
            <label>Minimum Veer Score ({minVeerScore}+)</label>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={minVeerScore} 
              onChange={e => setMinVeerScore(parseInt(e.target.value))}
              className="filter-slider-bar"
            />
          </div>
        </div>
      </div>

      {/* Main Two-Column Directory Workspace */}
      <div className="portal-directory-workspace">
        {/* Left Side: Candidate List Directory */}
        <div className="candidates-list-directory-pane">
          <div className="directory-results-meta">
            Showing <strong>{filteredCandidates.length}</strong> matching candidates
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>Syncing candidate records...</div>
          ) : filteredCandidates.length === 0 ? (
            <div className="directory-empty-state">
              <User size={36} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
              <h4>No Candidates Match</h4>
              <p>Adjust your search query or quota selectors to browse other military candidates.</p>
            </div>
          ) : (
            <div className="directory-list-scroll">
              {filteredCandidates.map(cand => (
                <div 
                  key={cand.id} 
                  className={`candidate-list-card-item ${selectedCandidate?.id === cand.id ? 'active' : ''}`}
                  onClick={() => setSelectedCandidate(cand)}
                >
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div className="cand-mini-avatar">
                      {getInitials(cand.full_name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 className="cand-name">{cand.full_name}</h4>
                      <p className="cand-subline">
                        {cand.service_branch} • {cand.profile_data.armCorpsTrade || 'General Duty'}
                      </p>
                      <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.35rem' }}>
                        <span className="cand-mini-badge quota">{cand.reservation_category}</span>
                        <span className="cand-mini-badge score">Veer Score: {cand.veer_score}</span>
                      </div>
                    </div>
                    <ChevronRight size={16} color="#94a3b8" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Premium Full Profile View */}
        <div className="candidate-full-detail-display-pane">
          {selectedCandidate ? (
            <CandidateProfileTemplate 
              candidate={selectedCandidate} 
              onSendMessage={handleStartChat}
            />
          ) : (
            <div className="profile-placeholder-card">
              <Info size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <h3>Select a Profile</h3>
              <p>Select any transitioning serviceman from the list on the left to inspect their detailed Veer Score analysis, military background, and verified trade skills.</p>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .employer-portal-view {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2.5rem 1.5rem;
        }
        .employer-portal-header {
          margin-bottom: 2rem;
          background: white;
          border: 1px solid rgba(0,0,0,0.05);
          border-radius: 24px;
          padding: 2rem;
          box-shadow: var(--shadow-ios);
        }
        .portal-filters-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 1.25rem;
          margin-top: 1.5rem;
          border-top: 1px solid #f1f5f9;
          padding-top: 1.5rem;
        }
        .filter-item-wrapper {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .filter-item-wrapper label {
          font-size: 0.75rem;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .filter-input-container {
          position: relative;
        }
        .filter-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }
        .filter-textbox {
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 0.55rem 0.55rem 0.55rem 2.25rem;
          font-size: 0.88rem;
          font-family: inherit;
        }
        .filter-textbox:focus, .filter-dropdown:focus {
          outline: none;
          border-color: var(--ios-olive);
        }
        .filter-dropdown {
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 0.55rem;
          font-size: 0.88rem;
          font-family: inherit;
          background: white;
          cursor: pointer;
        }
        .filter-slider-bar {
          width: 100%;
          accent-color: var(--ios-olive);
          margin-top: 0.5rem;
        }
        
        .portal-directory-workspace {
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 1.5rem;
          align-items: start;
        }
        .candidates-list-directory-pane {
          background: white;
          border: 1px solid rgba(0,0,0,0.05);
          border-radius: 24px;
          padding: 1.25rem;
          box-shadow: var(--shadow-ios);
          height: calc(100vh - 280px);
          display: flex;
          flex-direction: column;
        }
        .directory-results-meta {
          font-size: 0.8rem;
          color: #64748b;
          margin-bottom: 1rem;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 0.75rem;
        }
        .directory-list-scroll {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .candidate-list-card-item {
          padding: 0.75rem 1rem;
          border-radius: 16px;
          border: 1px solid #f1f5f9;
          cursor: pointer;
          transition: all 0.2s;
          background: white;
        }
        .candidate-list-card-item:hover {
          background: #f8fafc;
          transform: translateY(-1px);
        }
        .candidate-list-card-item.active {
          background: #eef2eb;
          border-color: #d7e6d0;
        }
        .cand-mini-avatar {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: var(--ios-secondary);
          color: var(--ios-olive);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.85rem;
        }
        .cand-name {
          font-size: 0.88rem;
          font-weight: 750;
          color: #0f172a;
          margin: 0;
        }
        .cand-subline {
          font-size: 0.72rem;
          color: #64748b;
          margin-top: 0.1rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cand-mini-badge {
          font-size: 0.65rem;
          font-weight: 800;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
        }
        .cand-mini-badge.quota {
          background: #f1f5f9;
          color: #475569;
        }
        .cand-mini-badge.score {
          background: #eef2eb;
          color: var(--ios-olive);
        }
        .candidate-full-detail-display-pane {
          min-width: 0;
        }
        .profile-placeholder-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          background: white;
          border-radius: 24px;
          border: 1px solid rgba(0,0,0,0.05);
          color: #64748b;
          text-align: center;
        }
        .profile-placeholder-card h3 {
          margin-top: 1rem;
          font-size: 1.1rem;
        }
        @media (max-width: 900px) {
          .portal-directory-workspace {
            grid-template-columns: 1fr;
          }
          .portal-filters-grid {
            grid-template-columns: 1fr;
          }
          .candidates-list-directory-pane {
            height: auto;
            max-height: 350px;
          }
        }
      `}} />
    </div>
  );
};

export default FindCandidates;
