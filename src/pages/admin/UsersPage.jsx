import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Search, ChevronLeft, ChevronRight, Eye, X, ShieldAlert,
  MapPin, Shield, Phone, Mail, Calendar, Award, Dumbbell,
} from 'lucide-react';

const USERS_PER_PAGE = 15;

const UsersPage = () => {
  const [userProfiles, setUserProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedState, setSelectedState] = useState('all');
  const [selectedQualification, setSelectedQualification] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedProfile, setSelectedProfile] = useState(null);

  useEffect(() => { loadUserProfiles(); }, []);
  useEffect(() => { setPage(1); }, [searchTerm, selectedCategory, selectedState, selectedQualification]);

  const loadUserProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('user_profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setUserProfiles(data || []);
    } catch (err) {
      console.error('Error loading user profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  const uniqueCategories = [...new Set(userProfiles.map((u) => u.raw_profile_data?.category || u.category).filter(Boolean))].sort();
  const uniqueStates = [...new Set(userProfiles.map((u) => u.raw_profile_data?.stateOfDomicile || u.state).filter(Boolean))].sort();
  const uniqueQualifications = [...new Set(userProfiles.map((u) => u.education_level || u.qualification).filter(Boolean))].sort();

  const filtered = userProfiles.filter((user) => {
    const name = user.full_name || user.raw_profile_data?.fullName || user.name || '';
    const email = user.raw_profile_data?.email || user.email || '';
    const state = user.raw_profile_data?.stateOfDomicile || user.state || '';
    const skills = Array.isArray(user.raw_profile_data?.specificSkills) ? user.raw_profile_data.specificSkills.join(', ') : (user.raw_profile_data?.skills || user.skills || '');
    const district = user.raw_profile_data?.district || user.district || '';
    const category = user.raw_profile_data?.category || user.category || '';
    const qualification = user.education_level || user.raw_profile_data?.highestQualification || user.qualification || '';

    const matchesSearch = !searchTerm ||
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      state.toLowerCase().includes(searchTerm.toLowerCase()) ||
      skills.toLowerCase().includes(searchTerm.toLowerCase()) ||
      district.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || category === selectedCategory;
    const matchesState = selectedState === 'all' || state === selectedState;
    const matchesQualification = selectedQualification === 'all' || qualification === selectedQualification;
    return matchesSearch && matchesCategory && matchesState && matchesQualification;
  });

  const totalPages = Math.ceil(filtered.length / USERS_PER_PAGE) || 1;
  const startIdx = (page - 1) * USERS_PER_PAGE;
  const paginated = filtered.slice(startIdx, startIdx + USERS_PER_PAGE);

  return (
    <div>
      <div className="lc-section-header">
        <div>
          <h2>Registered Service Personnel</h2>
          <p>Army profiles loaded from the CSV registry for profiling-engine stress testing.</p>
        </div>
        <span className="lc-count-pill">{filtered.length} of {userProfiles.length} users</span>
      </div>

      <div className="lc-filter-bar" style={{ gridTemplateColumns: '1.6fr 1fr 1fr 1fr' }}>
        <div className="lc-filter-field lc-search-input-wrapper">
          <Search size={16} />
          <input type="text" placeholder="Name, email, state, skill..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="lc-filter-field">
          <label>Category</label>
          <select className="lc-native-select" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="all">All Categories ({uniqueCategories.length})</option>
            {uniqueCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="lc-filter-field">
          <label>State of Domicile</label>
          <select className="lc-native-select" value={selectedState} onChange={(e) => setSelectedState(e.target.value)}>
            <option value="all">All States ({uniqueStates.length})</option>
            {uniqueStates.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="lc-filter-field">
          <label>Qualification</label>
          <select className="lc-native-select" value={selectedQualification} onChange={(e) => setSelectedQualification(e.target.value)}>
            <option value="all">All Levels ({uniqueQualifications.length})</option>
            {uniqueQualifications.map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
        </div>
      </div>

      <div className="lc-table-responsive">
        <table className="lc-table">
          <thead>
            <tr>
              <th>Service Personnel</th>
              <th>State / District</th>
              <th>Category</th>
              <th>Qualification</th>
              <th>Key Skills</th>
              <th style={{ textAlign: 'right' }}>Profile</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((user, idx) => {
              const name = user.full_name || user.raw_profile_data?.fullName || user.name || 'Unknown';
              const state = user.raw_profile_data?.stateOfDomicile || user.state || '—';
              const district = user.raw_profile_data?.district || user.district || '—';
              const category = user.raw_profile_data?.category || user.category || '—';
              const qualification = user.education_level || user.raw_profile_data?.highestQualification || user.qualification || '—';
              const skills = Array.isArray(user.raw_profile_data?.specificSkills) ? user.raw_profile_data.specificSkills.join(', ') : (user.raw_profile_data?.skills || user.skills || '—');
              return (
                <tr key={idx} className="clickable" onClick={() => setSelectedProfile(user)}>
                  <td>
                    <span className="lc-table-title">{name}</span>
                    <span className="lc-table-sub">{user.service_branch || user.raw_profile_data?.serviceBranch || 'Indian Army'}</span>
                  </td>
                  <td>{state} <span className="lc-table-sub">{district}</span></td>
                  <td>{category.replace(' (Non-creamy layer)', '')}</td>
                  <td>{qualification}</td>
                  <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={skills}>{skills}</td>
                  <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <button className="lc-icon-btn" onClick={() => setSelectedProfile(user)}><Eye size={14} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {loading && <div className="lc-loading-state">Loading personnel records…</div>}
        {!loading && filtered.length === 0 && (
          <div className="lc-empty-state"><ShieldAlert size={22} style={{ marginBottom: '0.5rem' }} /><p>No personnel found matching the selected filters.</p></div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="lc-pagination-bar">
            <span className="lc-pagination-info">{filtered.length} users — page {page} of {totalPages}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="lc-pagination-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={14} /> Prev</button>
              <button className="lc-pagination-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {selectedProfile && <UserProfileDrawer profile={selectedProfile} onClose={() => setSelectedProfile(null)} />}
    </div>
  );
};

const UserProfileDrawer = ({ profile: u, onClose }) => {
  const name = u.full_name || u.raw_profile_data?.fullName || u.name || 'Unknown';
  const serviceBranch = u.service_branch || u.raw_profile_data?.serviceBranch || u.serviceBranch || 'Indian Army';
  const armCorpsTrade = u.raw_profile_data?.armCorpsTrade || u.armCorpsTrade || '—';
  const dob = u.raw_profile_data?.dobDay ? `${u.raw_profile_data.dobDay}/${u.raw_profile_data.dobMonth}/${u.raw_profile_data.dobYear}` : (u.dob || '—');
  const phone = u.raw_profile_data?.mobile || u.phone || '—';
  const email = u.raw_profile_data?.email || u.email || '—';
  const state = u.raw_profile_data?.stateOfDomicile || u.state || '—';

  return (
    <div className="lc-drawer-backdrop" onClick={onClose}>
      <div className="lc-drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="lc-drawer-header">
          <div>
            <h3>{name}</h3>
            <p>{serviceBranch} · {armCorpsTrade}</p>
          </div>
          <button className="lc-close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="lc-drawer-body">
          <div className="lc-drawer-section">
            <h4><Calendar size={13} style={{ marginRight: 6, verticalAlign: -2 }} />Personal Information</h4>
            <div className="lc-drawer-list-item"><span>Date of Birth</span><span>{dob}</span></div>
            <div className="lc-drawer-list-item"><span><Phone size={12} style={{ marginRight: 4, verticalAlign: -1 }} />Contact</span><span>{phone}</span></div>
            <div className="lc-drawer-list-item"><span><Mail size={12} style={{ marginRight: 4, verticalAlign: -1 }} />Email</span><span>{email}</span></div>
            <div className="lc-drawer-list-item"><span><MapPin size={12} style={{ marginRight: 4, verticalAlign: -1 }} />State</span><span>{state}</span></div>
            <div className="lc-drawer-list-item"><span>District</span><span>{u.district || '—'}</span></div>
          </div>
          <div className="lc-drawer-section">
            <h4><Shield size={13} style={{ marginRight: 6, verticalAlign: -2 }} />Military Information</h4>
            <div className="lc-drawer-list-item"><span>Role / Appointment</span><span>{u.role || '—'}</span></div>
            <div className="lc-drawer-list-item"><span>Character on Discharge</span><span>{u.characterOnDischarge || '—'}</span></div>
            <div className="lc-drawer-list-item"><span>Skills</span><span>{u.skills || '—'}</span></div>
          </div>
          <div className="lc-drawer-section">
            <h4><Dumbbell size={13} style={{ marginRight: 6, verticalAlign: -2 }} />Physical Attributes</h4>
            <div className="lc-drawer-list-item"><span>Medical Category</span><span>{u.medicalCategory || '—'}</span></div>
            <div className="lc-drawer-list-item"><span>Physical Proficiency</span><span>{u.physicalProficiency || '—'}</span></div>
          </div>
          <div className="lc-drawer-section">
            <h4><Award size={13} style={{ marginRight: 6, verticalAlign: -2 }} />Career &amp; Qualifications</h4>
            <div className="lc-drawer-list-item"><span>Highest Qualification</span><span>{u.qualification || '—'}</span></div>
            <div className="lc-drawer-list-item"><span>Top Career Preference</span><span>{u.careerPreference || '—'}</span></div>
            <div className="lc-drawer-list-item"><span>Willing to Relocate</span><span>{u.willingToRelocate || '—'}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersPage;
