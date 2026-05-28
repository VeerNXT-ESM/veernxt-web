import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  Plus, Book, FileText, HelpCircle, ChevronLeft, ChevronRight, Search, Briefcase, 
  RefreshCw, LogOut, Users, Shield, Trash2, Settings, Key, Check, X, ShieldAlert,
  MapPin, GraduationCap, Heart, Eye, Dumbbell, Award, Phone, Mail, Calendar, UserCheck
} from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ resources: 0, quizzes: 0, exams: 0, jobs: 0 });
  
  // Tab control: 'catalog', 'scraper', 'permissions', 'users'
  const [activeTab, setActiveTab] = useState('catalog');

  // Users Management
  const [userProfiles, setUserProfiles] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedUserCategory, setSelectedUserCategory] = useState('all');
  const [selectedUserState, setSelectedUserState] = useState('all');
  const [selectedUserQualification, setSelectedUserQualification] = useState('all');
  const [usersCurrentPage, setUsersCurrentPage] = useState(1);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  
  // Content Curation & Filters
  const [recentExams, setRecentExams] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExam, setSelectedExam] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTier, setSelectedTier] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Admin & Session states
  const [currentSession, setCurrentSession] = useState(null);
  const [adminsList, setAdminsList] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // New Admin Form State
  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    role: 'Content Curator',
    permissions: {
      create_content: true,
      edit_quizzes: false,
      trigger_scrapers: false,
      manage_users: false
    }
  });

  useEffect(() => {
    // Check Auth Session
    const sessionStr = localStorage.getItem('admin_session');
    if (!sessionStr) {
      navigate('/admin/login');
      return;
    }
    const session = JSON.parse(sessionStr);
    setCurrentSession(session);
    
    // Load and initialize Admin Registry
    initializeAdminRegistry(session);
    
    // Fetch DB statistics
    fetchDashboardData();
    loadUserProfiles();
  }, [navigate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedExam, selectedCategory, selectedTier]);

  useEffect(() => {
    setUsersCurrentPage(1);
  }, [userSearchTerm, selectedUserCategory, selectedUserState, selectedUserQualification]);

  // CSV Parser — handles quoted fields with embedded commas
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const loadUserProfiles = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/User_Profiles.csv');
      const text = await res.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) return;
      
      const headers = parseCSVLine(lines[0]);
      const profiles = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length < 5) continue;
        
        const name = values[1]?.trim();
        // Filter out test entries
        if (!name || name.length <= 2 || name === 'vv') continue;
        
        profiles.push({
          timestamp: values[0],
          name: name,
          dob: values[2],
          phone: values[3],
          email: values[4],
          category: values[5],
          state: values[6],
          district: values[7],
          maritalStatus: values[8],
          serviceBranch: values[9],
          armCorpsTrade: values[10],
          role: values[11],
          militaryCourses: values[12],
          characterOnDischarge: values[13],
          skills: values[14],
          qualification: values[15],
          ncc: values[16],
          sports: values[17],
          height: values[18],
          chest: values[19],
          eyesight: values[20],
          medicalCategory: values[21],
          physicalProficiency: values[22],
          careerPreference: values[23],
          willingToRelocate: values[24],
          englishProficiency: values[25],
          sewaNidhi: values[26],
          consent: values[27]
        });
      }
      
      setUserProfiles(profiles);
    } catch (err) {
      console.error('Error loading user profiles:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const initializeAdminRegistry = (session) => {
    let registry = JSON.parse(localStorage.getItem('admin_registry') || '[]');
    
    // Ensure Super Admin Vivek Talwar exists
    const superExists = registry.some(a => a.email.toLowerCase() === 'veernxt.esm@gmail.com');
    if (!superExists) {
      const superAdminObj = {
        name: 'Vivek Talwar',
        email: 'veernxt.esm@gmail.com',
        role: 'Super Admin',
        permissions: ['all']
      };
      registry = [superAdminObj, ...registry];
      localStorage.setItem('admin_registry', JSON.stringify(registry));
    }
    
    setAdminsList(registry);
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [resCount, quizCount, resources] = await Promise.all([
        supabase.from('resources').select('*', { count: 'exact', head: true }),
        supabase.from('quizzes').select('*', { count: 'exact', head: true }),
        supabase.from('resources').select('*').order('created_at', { ascending: false }) // Fetch all resources for high fidelity catalog operations
      ]);

      // Count unique exams from all resources
      const { data: allResources } = await supabase.from('resources').select('exam_name');
      const uniqueExams = allResources ? new Set(allResources.map(r => r.exam_name)).size : 0;

      // Fetch Jobs count from local engine server
      let jobsCount = 0;
      try {
        const ENGINE_URL = import.meta.env.VITE_ENGINE_URL || 'http://localhost:5001';
        const jobRes = await fetch(`${ENGINE_URL}/api/jobs`);
        const jobData = await jobRes.json();
        if (jobData.ok) jobsCount = jobData.count;
      } catch (e) {
        console.warn('Could not fetch jobs count for stats');
      }

      setStats({
        resources: resCount.count || 0,
        quizzes: quizCount.count || 0,
        exams: uniqueExams,
        jobs: jobsCount
      });
      setRecentExams(resources.data || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_session');
    navigate('/admin/login');
  };

  // Add Admin handler
  const handleAddAdmin = (e) => {
    e.preventDefault();
    if (!newAdmin.name || !newAdmin.email) return;

    // Convert permission checkboxes to list
    const activePerms = [];
    Object.keys(newAdmin.permissions).forEach(k => {
      if (newAdmin.permissions[k]) activePerms.push(k);
    });

    const newAdminObj = {
      name: newAdmin.name,
      email: newAdmin.email.trim().toLowerCase(),
      role: newAdmin.role,
      permissions: activePerms
    };

    const registry = JSON.parse(localStorage.getItem('admin_registry') || '[]');
    
    // Check if email already exists
    if (registry.some(a => a.email.toLowerCase() === newAdminObj.email)) {
      alert('An administrator with this email is already registered.');
      return;
    }

    const updatedRegistry = [...registry, newAdminObj];
    localStorage.setItem('admin_registry', JSON.stringify(updatedRegistry));
    setAdminsList(updatedRegistry);
    
    // Reset Form & Close Modal
    setNewAdmin({
      name: '',
      email: '',
      role: 'Content Curator',
      permissions: {
        create_content: true,
        edit_quizzes: false,
        trigger_scrapers: false,
        manage_users: false
      }
    });
    setShowAddModal(false);
  };

  // Delete Admin handler
  const handleDeleteAdmin = (emailToDelete) => {
    if (emailToDelete.toLowerCase() === 'veernxt.esm@gmail.com') {
      alert('Access Denied: Super Admin Vivek Talwar cannot be removed to prevent portal lockouts.');
      return;
    }
    
    if (window.confirm(`Are you sure you want to revoke administrative privileges for ${emailToDelete}?`)) {
      const registry = JSON.parse(localStorage.getItem('admin_registry') || '[]');
      const filteredRegistry = registry.filter(a => a.email.toLowerCase() !== emailToDelete.toLowerCase());
      localStorage.setItem('admin_registry', JSON.stringify(filteredRegistry));
      setAdminsList(filteredRegistry);
    }
  };

  // Delete Resource handler
  const handleDeleteResource = async (id, title) => {
    // Check Permissions
    const hasWritePermission = currentSession?.role === 'Super Admin' || currentSession?.permissions?.includes('create_content');
    if (!hasWritePermission) {
      alert('Access Denied: You do not have permissions to delete course resources.');
      return;
    }

    if (window.confirm(`WARNING: Are you sure you want to permanently delete the textbook/guide "${title}" from the cloud database?`)) {
      try {
        const { error } = await supabase.from('resources').delete().eq('id', id);
        if (error) throw error;
        alert('Resource successfully removed from Supabase.');
        fetchDashboardData(); // Refresh the counts and listings
      } catch (err) {
        alert('Error removing resource: ' + err.message);
      }
    }
  };

  // Dynamic filter compilation
  const uniqueExamsList = [...new Set(recentExams.map(item => item.exam_name).filter(Boolean))].sort();

  const filteredResources = recentExams.filter(item => {
    // Search filter
    const matchesSearch = !searchTerm || 
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.exam_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.subject?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Exam filter
    const matchesExam = selectedExam === 'all' || item.exam_name === selectedExam;
    
    // Category filter
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    
    // Tier filter
    const matchesTier = selectedTier === 'all' || 
      (selectedTier === 'free' && item.is_freemium) || 
      (selectedTier === 'premium' && !item.is_freemium);
      
    return matchesSearch && matchesExam && matchesCategory && matchesTier;
  });

  // Pagination compilation
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredResources.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedResources = filteredResources.slice(startIndex, endIndex);

  return (
    <div className="admin-layout-wrapper">
      {/* CMS Header Block mimicking Main App */}
      <header className="admin-app-header">
        <div className="admin-header-container">
          {/* Left Side: Logo only */}
          <div className="header-left">
            <Link to="/dashboard" className="logo-link">
              <img src="/logo.png" alt="VeerNXT" className="logo-img" />
            </Link>
          </div>

          {/* Right Side: Tab Links & Profile Dropdown */}
          <div className="header-right-nav">
            <button 
              className={`nav-link-item ${activeTab === 'catalog' ? 'active' : ''}`}
              onClick={() => setActiveTab('catalog')}
            >
              <Book size={20} />
              <span>Content Catalog</span>
            </button>

            <button 
              className={`nav-link-item ${activeTab === 'scraper' ? 'active' : ''}`}
              onClick={() => setActiveTab('scraper')}
            >
              <Briefcase size={20} />
              <span>Job Board Scraper</span>
            </button>

            <button 
              className={`nav-link-item ${activeTab === 'permissions' ? 'active' : ''}`}
              onClick={() => setActiveTab('permissions')}
            >
              <Shield size={20} />
              <span>Admins & Permissions</span>
            </button>

            <button 
              className={`nav-link-item ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <Users size={20} />
              <span>Users</span>
            </button>
            
            {currentSession && (
              <div className="nav-profile-dropdown">
                <div className="nav-profile-trigger">
                  <div className="nav-avatar-placeholder">
                    {currentSession.name?.split(' ').map(n => n[0]).join('')}
                  </div>
                  <span className="me-text">
                    {currentSession.name?.split(' ')[0]}
                  </span>
                </div>
                <button onClick={handleLogout} className="btn-logout-header" title="Sign Out of CMS">
                  <LogOut size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="admin-container">
        {/* Numerical Metrics Stats Grid */}
        <div className="stats-grid animate-fade-in">
          <div className="stat-card">
            <div className="stat-icon res"><Book size={15} /></div>
            <div className="stat-info">
              <span className="stat-label">Ingested Books</span>
              <span className="stat-value">{stats.resources}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon quiz"><HelpCircle size={15} /></div>
            <div className="stat-info">
              <span className="stat-label">Active Quizzes</span>
              <span className="stat-value">{stats.quizzes}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon exam"><Search size={15} /></div>
            <div className="stat-info">
              <span className="stat-label">Target Exams</span>
              <span className="stat-value">{stats.exams}</span>
            </div>
          </div>
          <div className="stat-card" onClick={() => setActiveTab('scraper')} style={{ cursor: 'pointer' }}>
            <div className="stat-icon scrape" style={{ background: '#1F3A2E' }}><Briefcase size={15} /></div>
            <div className="stat-info">
              <span className="stat-label">Live Notifications</span>
              <span className="stat-value">{stats.jobs}</span>
            </div>
          </div>
          <div className="stat-card" onClick={() => setActiveTab('users')} style={{ cursor: 'pointer' }}>
            <div className="stat-icon" style={{ background: '#b89047' }}><Users size={15} /></div>
            <div className="stat-info">
              <span className="stat-label">Registered Users</span>
              <span className="stat-value">{userProfiles.length}</span>
            </div>
          </div>
        </div>

      {/* Tab 1: Content Catalog */}
      {activeTab === 'catalog' && (
        <div className="content-section animate-fade-in">
          <div className="section-header">
            <div>
              <h2>Course Resources & Textbooks</h2>
              <p className="hint">Ingested cloud database listing with multi-tier corporate filtration</p>
            </div>
            <div className="action-row">
              <Link to="/admin/content" className="btn-action primary">
                <Plus size={16} /> New Resource
              </Link>
              <Link to="/admin/quiz" className="btn-action">
                <Plus size={16} /> New Quiz
              </Link>
            </div>
          </div>

          {/* Corporate Filter Bar */}
          <div className="corporate-filter-bar">
            <div className="filter-field search-filter">
              <label>Search Keyword</label>
              <div className="search-input-wrapper">
                <Search size={16} className="search-bar-icon" />
                <input 
                  type="text" 
                  placeholder="Filter by title, subject..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="filter-field select-filter">
              <label>Target Exam</label>
              <select value={selectedExam} onChange={e => setSelectedExam(e.target.value)}>
                <option value="all">All Exams ({uniqueExamsList.length})</option>
                {uniqueExamsList.map(ex => (
                  <option key={ex} value={ex}>{ex}</option>
                ))}
              </select>
            </div>

            <div className="filter-field select-filter">
              <label>Content Type</label>
              <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                <option value="all">All Formats</option>
                <option value="Intro">Intro (Introduction)</option>
                <option value="Precis">Precis (Short Summaries)</option>
                <option value="Guide">Guide (Study Books)</option>
              </select>
            </div>

            <div className="filter-field select-filter">
              <label>Access Tier</label>
              <select value={selectedTier} onChange={e => setSelectedTier(e.target.value)}>
                <option value="all">All Tiers</option>
                <option value="free">Free Access</option>
                <option value="premium">Premium Locked</option>
              </select>
            </div>
          </div>

          {/* Corporate Catalog Dense Data Table */}
          <div className="table-responsive">
            <table className="corporate-table">
              <thead>
                <tr>
                  <th>Resource Title</th>
                  <th>Target Exam</th>
                  <th>Subject</th>
                  <th>Ingested Type</th>
                  <th>Access Tier</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedResources.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td>
                      <div className="table-item-title-col">
                        <div className="item-icon-circle">
                          {item.category === 'Guide' ? <Book size={15} /> : <FileText size={15} />}
                        </div>
                        <div className="item-details">
                          <span className="item-title" title={item.title}>{item.title}</span>
                          <span className="item-sub-id">ID: {item.id?.substring(0, 8)}...</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="exam-tag-pill">{item.exam_name || 'General study'}</span>
                    </td>
                    <td>
                      <span className="subject-text">{item.subject || 'General'}</span>
                    </td>
                    <td>
                      <span className={`format-tag-pill ${item.category?.toLowerCase()}`}>
                        {item.category}
                      </span>
                    </td>
                    <td>
                      <span className={`tier-badge-pill ${item.is_freemium ? 'free' : 'premium'}`}>
                        {item.is_freemium ? 'Free' : 'Premium'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions-row">
                        <button 
                          className="btn-curate" 
                          onClick={() => navigate(`/admin/content/${item.id}`)}
                          title="Manage details & edit textbook chapters"
                        >
                          Curate Content
                        </button>
                        <button 
                          className="btn-row-delete" 
                          onClick={() => handleDeleteResource(item.id, item.title)}
                          title="Delete permanently from Supabase"
                          disabled={currentSession?.role !== 'Super Admin' && !currentSession?.permissions?.includes('create_content')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="pagination-bar">
                <button 
                  className="pagination-btn" 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={14} />
                  <span>Previous</span>
                </button>
                
                <div className="pagination-pages">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      className={`pagination-page-btn ${currentPage === page ? 'active' : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button 
                  className="pagination-btn" 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
            
            {loading && <div className="loading-state">Syncing catalog database...</div>}
            
            {!loading && filteredResources.length === 0 && (
              <div className="empty-state">
                <ShieldAlert size={28} style={{ color: '#94a3b8', marginBottom: '0.5rem' }} />
                <p>No resources found matching the selected filters.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Job Board Scraper Control */}
      {activeTab === 'scraper' && (
        <div className="content-section animate-fade-in">
          <div className="section-header">
            <div>
              <h2>Vacancy Scraper Interface</h2>
              <p className="hint">Monitor notifications scraped from official conducting body endpoints</p>
            </div>
            <Link to="/admin/jobs" className="btn-action primary">
              <RefreshCw size={16} /> Open Job Board Controls
            </Link>
          </div>
          
          <div className="scraper-preview-card">
            <div className="card-alert">
              <ShieldAlert size={20} color="#1F3A2E" />
              <span><strong>Deduplication Enabled:</strong> Scrapes automatically filter duplicates by Title + URL. Obsolete listings are stripped.</span>
            </div>
            <p>Our background scraper runs automatically every 6 hours. You can trigger a manual scan by entering the Job Board Controls.</p>
          </div>
        </div>
      )}

      {/* Tab 3: Admins & Permissions */}
      {activeTab === 'permissions' && (
        <div className="content-section animate-fade-in">
          <div className="section-header">
            <div>
              <h2>Administrator Registry</h2>
              <p className="hint">Assign roles, curate access control lists, and invite administrators</p>
            </div>
            {currentSession?.role === 'Super Admin' ? (
              <button onClick={() => setShowAddModal(true)} className="btn-action primary">
                <Plus size={16} /> Add Administrator
              </button>
            ) : (
              <div className="permission-lock-notice">
                <Lock size={14} />
                <span>Super Admin rights needed to add users</span>
              </div>
            )}
          </div>

          <div className="table-responsive">
            <table className="admins-table">
              <thead>
                <tr>
                  <th>Administrator</th>
                  <th>Email Address</th>
                  <th>Assigned Role</th>
                  <th>Responsibilities</th>
                  <th style={{ textAlign: 'center' }}>Revoke</th>
                </tr>
              </thead>
              <tbody>
                {adminsList.map((admin, idx) => (
                  <tr key={idx}>
                    <td>
                      <div className="admin-profile-row">
                        <div className="profile-initials">
                          {admin.name?.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="admin-profile-name">{admin.name}</span>
                      </div>
                    </td>
                    <td><code>{admin.email}</code></td>
                    <td>
                      <span className={`role-badge ${admin.role.replace(' ', '-').toLowerCase()}`}>
                        <Shield size={12} /> {admin.role}
                      </span>
                    </td>
                    <td>
                      <div className="permissions-tags">
                        {admin.permissions.includes('all') ? (
                          <span className="perm-tag super">Full Platform Control</span>
                        ) : (
                          admin.permissions.map(p => (
                            <span key={p} className="perm-tag">{p.replace('_', ' ')}</span>
                          ))
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        onClick={() => handleDeleteAdmin(admin.email)} 
                        disabled={admin.email.toLowerCase() === 'veernxt.esm@gmail.com' || currentSession?.role !== 'Super Admin'}
                        className="btn-delete"
                        title={admin.email.toLowerCase() === 'veernxt.esm@gmail.com' ? "Cannot delete primary owner" : "Revoke security credentials"}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Users Management */}
      {activeTab === 'users' && (() => {
        // Dynamic filter options
        const uniqueCategories = [...new Set(userProfiles.map(u => u.category).filter(Boolean))].sort();
        const uniqueStates = [...new Set(userProfiles.map(u => u.state).filter(Boolean))].sort();
        const uniqueQualifications = [...new Set(userProfiles.map(u => u.qualification).filter(Boolean))].sort();

        // Filter logic
        const filteredUsers = userProfiles.filter(user => {
          const matchesSearch = !userSearchTerm ||
            user.name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
            user.state?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
            user.skills?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
            user.district?.toLowerCase().includes(userSearchTerm.toLowerCase());
          const matchesCategory = selectedUserCategory === 'all' || user.category === selectedUserCategory;
          const matchesState = selectedUserState === 'all' || user.state === selectedUserState;
          const matchesQualification = selectedUserQualification === 'all' || user.qualification === selectedUserQualification;
          return matchesSearch && matchesCategory && matchesState && matchesQualification;
        });

        const usersPerPage = 15;
        const usersTotalPages = Math.ceil(filteredUsers.length / usersPerPage) || 1;
        const usersStartIdx = (usersCurrentPage - 1) * usersPerPage;
        const paginatedUsers = filteredUsers.slice(usersStartIdx, usersStartIdx + usersPerPage);

        return (
        <div className="content-section animate-fade-in">
          <div className="section-header">
            <div>
              <h2>Registered Service Personnel</h2>
              <p className="hint">Army profiles loaded from CSV registry for profiling engine stress testing</p>
            </div>
            <div className="action-row">
              <span className="users-count-badge">
                <UserCheck size={15} />
                {filteredUsers.length} of {userProfiles.length} users
              </span>
            </div>
          </div>

          {/* Users Filter Bar */}
          <div className="corporate-filter-bar" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
            <div className="filter-field search-filter">
              <label>Search Personnel</label>
              <div className="search-input-wrapper">
                <Search size={16} className="search-bar-icon" />
                <input 
                  type="text" 
                  placeholder="Filter by name, email, state, skill..." 
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="filter-field select-filter">
              <label>Category</label>
              <select value={selectedUserCategory} onChange={e => setSelectedUserCategory(e.target.value)}>
                <option value="all">All Categories ({uniqueCategories.length})</option>
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="filter-field select-filter">
              <label>State of Domicile</label>
              <select value={selectedUserState} onChange={e => setSelectedUserState(e.target.value)}>
                <option value="all">All States ({uniqueStates.length})</option>
                {uniqueStates.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div className="filter-field select-filter">
              <label>Qualification</label>
              <select value={selectedUserQualification} onChange={e => setSelectedUserQualification(e.target.value)}>
                <option value="all">All Levels ({uniqueQualifications.length})</option>
                {uniqueQualifications.map(q => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="table-responsive">
            <table className="corporate-table users-table">
              <thead>
                <tr>
                  <th>Service Personnel</th>
                  <th>State / District</th>
                  <th>Category</th>
                  <th>Arm / Corps</th>
                  <th>Qualification</th>
                  <th>Key Skills</th>
                  <th>Medical</th>
                  <th style={{ textAlign: 'center' }}>Profile</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user, idx) => (
                  <tr key={idx} className="user-row-clickable" onClick={() => setSelectedUserProfile(user)}>
                    <td>
                      <div className="table-item-title-col">
                        <div className="user-initials-circle">
                          {user.name?.split(' ').filter(n => n).slice(0, 2).map(n => n[0]?.toUpperCase()).join('')}
                        </div>
                        <div className="item-details">
                          <span className="item-title">{user.name}</span>
                          <span className="item-sub-id">{user.serviceBranch || 'Indian Army'}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="state-district-cell">
                        <span className="state-name">{user.state}</span>
                        <span className="district-name">{user.district}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`category-badge-pill ${user.category?.toLowerCase().replace(/[^a-z]/g, '-')}`}>
                        {user.category?.replace(' (Non-creamy layer)', '') || '—'}
                      </span>
                    </td>
                    <td>
                      <span className="corps-text">{user.armCorpsTrade || '—'}</span>
                    </td>
                    <td>
                      <span className={`qual-badge ${user.qualification?.toLowerCase().replace(/\s+/g, '-')}`}>
                        <GraduationCap size={12} />
                        {user.qualification || '—'}
                      </span>
                    </td>
                    <td>
                      <span className="skills-cell" title={user.skills}>{user.skills?.substring(0, 35)}{user.skills?.length > 35 ? '...' : ''}</span>
                    </td>
                    <td>
                      <span className={`medical-badge ${user.medicalCategory === 'SHAPE-1' ? 'shape1' : 'other'}`}>
                        {user.medicalCategory || '—'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn-view-profile" onClick={(e) => { e.stopPropagation(); setSelectedUserProfile(user); }}>
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Users Pagination */}
            {usersTotalPages > 1 && (
              <div className="pagination-bar">
                <button 
                  className="pagination-btn" 
                  onClick={() => setUsersCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={usersCurrentPage === 1}
                >
                  <ChevronLeft size={14} />
                  <span>Previous</span>
                </button>
                
                <div className="pagination-pages">
                  {Array.from({ length: usersTotalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      className={`pagination-page-btn ${usersCurrentPage === page ? 'active' : ''}`}
                      onClick={() => setUsersCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button 
                  className="pagination-btn" 
                  onClick={() => setUsersCurrentPage(prev => Math.min(prev + 1, usersTotalPages))}
                  disabled={usersCurrentPage === usersTotalPages}
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
            
            {usersLoading && <div className="loading-state">Loading personnel records from CSV registry...</div>}
            
            {!usersLoading && filteredUsers.length === 0 && (
              <div className="empty-state">
                <ShieldAlert size={28} style={{ color: '#94a3b8', marginBottom: '0.5rem' }} />
                <p>No personnel found matching the selected filters.</p>
              </div>
            )}
          </div>
        </div>
        );
      })()}

      {/* User Profile Detail Drawer */}
      {selectedUserProfile && (
        <div className="user-drawer-backdrop" onClick={() => setSelectedUserProfile(null)}>
          <div className="user-drawer-panel animate-slide-in-right" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-profile-hero">
                <div className="drawer-avatar">
                  {selectedUserProfile.name?.split(' ').filter(n => n).slice(0, 2).map(n => n[0]?.toUpperCase()).join('')}
                </div>
                <div className="drawer-hero-info">
                  <h3>{selectedUserProfile.name}</h3>
                  <p>{selectedUserProfile.serviceBranch || 'Indian Army'} • {selectedUserProfile.armCorpsTrade || '—'}</p>
                </div>
              </div>
              <button className="btn-close" onClick={() => setSelectedUserProfile(null)}>
                <X size={22} />
              </button>
            </div>

            <div className="drawer-body">
              {/* Personal Information */}
              <div className="drawer-section">
                <h4><Calendar size={15} /> Personal Information</h4>
                <div className="drawer-grid">
                  <div className="drawer-field">
                    <span className="field-label">Full Name</span>
                    <span className="field-value">{selectedUserProfile.name}</span>
                  </div>
                  <div className="drawer-field">
                    <span className="field-label">Date of Birth</span>
                    <span className="field-value">{selectedUserProfile.dob || '—'}</span>
                  </div>
                  <div className="drawer-field">
                    <span className="field-label">Contact (WhatsApp)</span>
                    <span className="field-value"><Phone size={12} /> {selectedUserProfile.phone || '—'}</span>
                  </div>
                  <div className="drawer-field">
                    <span className="field-label">Email</span>
                    <span className="field-value"><Mail size={12} /> {selectedUserProfile.email || '—'}</span>
                  </div>
                  <div className="drawer-field">
                    <span className="field-label">Marital Status</span>
                    <span className="field-value">{selectedUserProfile.maritalStatus || '—'}</span>
                  </div>
                  <div className="drawer-field">
                    <span className="field-label">Category</span>
                    <span className="field-value">{selectedUserProfile.category || '—'}</span>
                  </div>
                  <div className="drawer-field">
                    <span className="field-label">State of Domicile</span>
                    <span className="field-value"><MapPin size={12} /> {selectedUserProfile.state || '—'}</span>
                  </div>
                  <div className="drawer-field">
                    <span className="field-label">District</span>
                    <span className="field-value">{selectedUserProfile.district || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Military Information */}
              <div className="drawer-section">
                <h4><Shield size={15} /> Military Information</h4>
                <div className="drawer-grid">
                  <div className="drawer-field">
                    <span className="field-label">Service Branch</span>
                    <span className="field-value">{selectedUserProfile.serviceBranch || '—'}</span>
                  </div>
                  <div className="drawer-field">
                    <span className="field-label">Arm / Corps / Trade</span>
                    <span className="field-value">{selectedUserProfile.armCorpsTrade || '—'}</span>
                  </div>
                  <div className="drawer-field">
                    <span className="field-label">Role / Appointment</span>
                    <span className="field-value">{selectedUserProfile.role || '—'}</span>
                  </div>
                  <div className="drawer-field">
                    <span className="field-label">Military Courses</span>
                    <span className="field-value">{selectedUserProfile.militaryCourses || '—'}</span>
                  </div>
                  <div className="drawer-field">
                    <span className="field-label">Character on Discharge</span>
                    <span className="field-value">
                      <span className={`character-badge ${selectedUserProfile.characterOnDischarge?.toLowerCase()}`}>
                        {selectedUserProfile.characterOnDischarge || '—'}
                      </span>
                    </span>
                  </div>
                  <div className="drawer-field full-width">
                    <span className="field-label">Specific Skills Handled</span>
                    <span className="field-value">{selectedUserProfile.skills || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Physical Attributes */}
              <div className="drawer-section">
                <h4><Dumbbell size={15} /> Physical Attributes</h4>
                <div className="drawer-grid">
                  <div className="drawer-field">
                    <span className="field-label">Height</span>
                    <span className="field-value">{selectedUserProfile.height || '—'}</span>
                  </div>
                  <div className="drawer-field">
                    <span className="field-label">Chest & Expansion</span>
                    <span className="field-value">{selectedUserProfile.chest || '—'}</span>
                  </div>
                  <div className="drawer-field">
                    <span className="field-label">Eyesight</span>
                    <span className="field-value">{selectedUserProfile.eyesight || '—'}</span>
                  </div>
                  <div className="drawer-field">
                    <span className="field-label">Medical Category</span>
                    <span className="field-value">
                      <span className={`medical-badge ${selectedUserProfile.medicalCategory === 'SHAPE-1' ? 'shape1' : 'other'}`}>
                        {selectedUserProfile.medicalCategory || '—'}
                      </span>
                    </span>
                  </div>
                  <div className="drawer-field">
                    <span className="field-label">Physical Proficiency</span>
                    <span className="field-value">{selectedUserProfile.physicalProficiency || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Career & Qualifications */}
              <div className="drawer-section">
                <h4><Award size={15} /> Career & Qualifications</h4>
                <div className="drawer-grid">
                  <div className="drawer-field">
                    <span className="field-label">Highest Qualification</span>
                    <span className="field-value">{selectedUserProfile.qualification || '—'}</span>
                  </div>
                  <div className="drawer-field">
                    <span className="field-label">NCC Certification</span>
                    <span className="field-value">{selectedUserProfile.ncc || '—'}</span>
                  </div>
                  <div className="drawer-field">
                    <span className="field-label">Sports Level</span>
                    <span className="field-value">{selectedUserProfile.sports || '—'}</span>
                  </div>
                  <div className="drawer-field">
                    <span className="field-label">English Proficiency</span>
                    <span className="field-value">{selectedUserProfile.englishProficiency || '—'}</span>
                  </div>
                  <div className="drawer-field full-width">
                    <span className="field-label">Top Career Preference</span>
                    <span className="field-value">{selectedUserProfile.careerPreference || '—'}</span>
                  </div>
                  <div className="drawer-field">
                    <span className="field-label">Willing to Relocate</span>
                    <span className="field-value">{selectedUserProfile.willingToRelocate || '—'}</span>
                  </div>
                  <div className="drawer-field">
                    <span className="field-label">Sewa Nidhi Preference</span>
                    <span className="field-value">{selectedUserProfile.sewaNidhi || '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Admin Modal Dialog */}

      {showAddModal && (
        <div className="modal-backdrop">
          <form onSubmit={handleAddAdmin} className="modal-card animate-fade-in">
            <div className="modal-header">
              <h3>Register New Administrator</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="btn-close">
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="input-group">
                <label>Admin Full Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Captain Amit Sharma" 
                  value={newAdmin.name} 
                  onChange={e => setNewAdmin({...newAdmin, name: e.target.value})} 
                  required 
                />
              </div>

              <div className="input-group">
                <label>Administrative Email</label>
                <input 
                  type="email" 
                  placeholder="name@veernxt.in" 
                  value={newAdmin.email} 
                  onChange={e => setNewAdmin({...newAdmin, email: e.target.value})} 
                  required 
                />
              </div>

              <div className="input-group">
                <label>Assigned CMS Role</label>
                <select 
                  value={newAdmin.role} 
                  onChange={e => setNewAdmin({...newAdmin, role: e.target.value})}
                >
                  <option value="Content Curator">Content Curator (Textbooks & Guides)</option>
                  <option value="Scraper Operator">Scraper Operator (Vacancy Scrapes)</option>
                  <option value="System Administrator">System Administrator (Catalog Operations)</option>
                  <option value="Super Admin">Super Admin (Complete Access Control)</option>
                </select>
              </div>

              <div className="input-group">
                <label>Direct Responsibilities / Permissions</label>
                <div className="checkbox-grid">
                  <label className="checkbox-item">
                    <input 
                      type="checkbox" 
                      checked={newAdmin.permissions.create_content} 
                      onChange={e => setNewAdmin({
                        ...newAdmin, 
                        permissions: {...newAdmin.permissions, create_content: e.target.checked}
                      })} 
                    />
                    <span>Create & Edit Course Resources</span>
                  </label>
                  <label className="checkbox-item">
                    <input 
                      type="checkbox" 
                      checked={newAdmin.permissions.edit_quizzes} 
                      onChange={e => setNewAdmin({
                        ...newAdmin, 
                        permissions: {...newAdmin.permissions, edit_quizzes: e.target.checked}
                      })} 
                    />
                    <span>Manage Assessments & Quizzes</span>
                  </label>
                  <label className="checkbox-item">
                    <input 
                      type="checkbox" 
                      checked={newAdmin.permissions.trigger_scrapers} 
                      onChange={e => setNewAdmin({
                        ...newAdmin, 
                        permissions: {...newAdmin.permissions, trigger_scrapers: e.target.checked}
                      })} 
                    />
                    <span>Trigger Active Web Scrapers</span>
                  </label>
                  <label className="checkbox-item">
                    <input 
                      type="checkbox" 
                      checked={newAdmin.permissions.manage_users} 
                      onChange={e => setNewAdmin({
                        ...newAdmin, 
                        permissions: {...newAdmin.permissions, manage_users: e.target.checked}
                      })} 
                    />
                    <span>Invite Administrators & Roles</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary-modal">Cancel</button>
              <button type="submit" className="btn-primary-modal">Grant Security Access</button>
            </div>
          </form>
        </div>
      )}

      {/* Styled Layout Blocks */}
      <style>{`
        .admin-layout-wrapper {
          background: #f8fafc;
          min-height: 100vh;
        }
        .admin-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 2.5rem 2rem;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        
        /* Mimic main app header style */
        .admin-app-header {
          background: white;
          border-bottom: 1px solid #eef3f8;
          position: sticky;
          top: 0;
          z-index: 100;
          width: 100%;
          padding: 1.5rem 0 1rem;
          margin-bottom: 2.5rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }
        .admin-header-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 2.5rem;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .header-left {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }
        .logo-img {
          height: 80px; /* Large beautiful logo just like the main app header */
          width: auto;
          object-fit: contain;
          border-radius: 4px;
          display: block;
        }
        .header-right-nav {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        .header-right-nav .nav-link-item {
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #666;
          text-decoration: none;
          font-size: 0.75rem;
          font-weight: 550;
          gap: 0.25rem;
          padding: 0.5rem 1rem;
          cursor: pointer;
          transition: all 0.15s;
          border-radius: 0px !important; /* Flat bottom border style */
        }
        .header-right-nav .nav-link-item:hover {
          color: #1F3A2E; /* Olive hover */
        }
        .header-right-nav .nav-link-item.active {
          color: #4b6b32; /* Select style using brand Olive Green */
          border-bottom: 3px solid #4b6b32; /* Rich Olive active border */
          border-radius: 0px !important;
        }
        .nav-profile-dropdown {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding-left: 1rem;
          border-left: 1px solid #eef3f8;
        }
        .nav-profile-trigger {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.15rem;
          color: #666;
        }
        .nav-avatar-placeholder {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #1F3A2E;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.75rem;
        }
        .me-text {
          font-size: 0.72rem;
          font-weight: 600;
          color: #475569;
        }
        .btn-logout-header {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          transition: color 0.2s;
        }
        .btn-logout-header:hover {
          color: #b89047; /* Gold color! */
        }

        /* Metrics grid */
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; }
        .stat-card {
          background: white;
          padding: 0.85rem 1.2rem;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 0.85rem;
          border: 1px solid #f1f5f9;
          box-shadow: 0 2px 8px rgba(0,0,0,0.01);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .stat-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }
        .stat-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }
        .stat-icon.res { background: #1F3A2E; }
        .stat-icon.quiz { background: #b89047; }
        .stat-icon.exam { background: #4b6b32; }
        .stat-icon.scrape { background: #64748b; }
        .stat-label { display: block; font-size: 0.7rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; margin-bottom: 0.1rem; }
        .stat-value { font-size: 1.25rem; font-weight: 800; color: #0f172a; line-height: 1.2; }

        /* Tabs Selection Menu */
        .tabs-container {
          display: flex;
          gap: 0.5rem;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 2rem;
          padding-bottom: 0.25rem;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: transparent;
          border: none;
          font-weight: 700;
          color: #64748b;
          font-size: 0.9rem;
          cursor: pointer;
          position: relative;
          transition: color 0.2s;
        }

        .tab-btn:hover {
          color: #0f172a;
        }

        .tab-btn.active {
          color: #1F3A2E;
        }

        .tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -5px;
          left: 0;
          right: 0;
          height: 3px;
          background: #1F3A2E;
          border-radius: 99px;
        }

        /* Sections and general elements */
        .content-section { background: white; padding: 2rem 2.5rem; border-radius: 24px; border: 1px solid #f1f5f9; box-shadow: 0 10px 30px rgba(0,0,0,0.01); }
        .section-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; text-align: left; }
        .section-header h2 { font-size: 1.3rem; font-weight: 800; color: #0f172a; margin: 0 0 0.25rem 0; letter-spacing: -0.02em; }
        .hint { font-size: 0.85rem; color: #94a3b8; margin: 0; }
        
        .action-row { display: flex; gap: 1rem; }
        .btn-action {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 1.25rem;
          background: white;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          color: #334155;
          font-weight: 700;
          text-decoration: none;
          font-size: 0.85rem;
          transition: all 0.2s;
          cursor: pointer;
        }
        .btn-action.primary { background: #1F3A2E; color: white; border: none; }
        .btn-action:hover { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(31,58,46,0.1); }

        /* Corporate Filter Bar */
        .corporate-filter-bar {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 1.25rem;
          background: #f8fafc;
          padding: 1.25rem 1.5rem;
          border-radius: 18px;
          border: 1px solid #e2e8f0;
          margin-bottom: 2rem;
          text-align: left;
        }

        .filter-field {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .filter-field label {
          font-size: 0.72rem;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-bar-icon {
          position: absolute;
          left: 1rem;
          color: #94a3b8;
        }

        .filter-field input, .filter-field select {
          width: 100%;
          padding: 0.65rem 1rem;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          font-size: 0.85rem;
          background: white;
          outline: none;
          transition: all 0.2s;
        }

        .filter-field input {
          padding-left: 2.5rem;
        }

        .filter-field input:focus, .filter-field select:focus {
          border-color: #1F3A2E;
          box-shadow: 0 0 0 3px rgba(31,58,46,0.06);
        }

        /* Corporate Dense Data Table Curation */
        .corporate-table {
          width: 100%;
          border-collapse: collapse;
          border-spacing: 0;
          text-align: left;
        }

        .corporate-table th {
          background: #f8fafc;
          padding: 0.85rem 1rem;
          font-size: 0.75rem;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 2px solid #e2e8f0;
        }

        .corporate-table td {
          padding: 1rem;
          border-bottom: 1px solid #f1f5f9;
          font-size: 0.88rem;
          vertical-align: middle;
          color: #334155;
        }

        .corporate-table tr:hover {
          background: #f8fafc;
        }

        .table-item-title-col {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .item-icon-circle {
          width: 32px;
          height: 32px;
          background: #eef2f0;
          color: #1F3A2E;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .item-details {
          display: flex;
          flex-direction: column;
        }

        .item-title {
          font-weight: 700;
          color: #0f172a;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
          max-width: 380px;
        }

        .item-sub-id {
          font-size: 0.68rem;
          color: #94a3b8;
          font-family: monospace;
          margin-top: 1px;
        }

        .exam-tag-pill {
          background: #f1f5f9;
          color: #475569;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 0.25rem 0.65rem;
          border-radius: 6px;
          display: inline-block;
        }

        .subject-text {
          font-weight: 600;
          color: #475569;
          font-size: 0.8rem;
        }

        .format-tag-pill {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 800;
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .format-tag-pill.intro { background: #f1f5f9; color: #475569; }
        .format-tag-pill.precis { background: #fdf6e2; color: #b89047; } /* Gold! */
        .format-tag-pill.guide { background: #eef2eb; color: #4b6b32; } /* Olive! */

        .tier-badge-pill {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 800;
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .tier-badge-pill.free { background: #eef2eb; color: #4b6b32; } /* Olive! */
        .tier-badge-pill.premium { background: #fdf6e2; color: #b89047; } /* Gold! */

        .table-actions-row {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.5rem;
        }

        .btn-curate {
          padding: 0.4rem 0.85rem;
          background: white;
          border: 1px solid #cbd5e1;
          color: #475569;
          font-weight: 700;
          font-size: 0.75rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-curate:hover {
          border-color: #1F3A2E;
          color: #1F3A2E;
          background: #f8fafc;
        }

        .btn-row-delete {
          background: none;
          border: none;
          color: #cbd5e1;
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .btn-row-delete:hover:not(:disabled) { background: #eef2eb; color: #4b6b32; }
        .btn-row-delete:disabled { opacity: 0.2; cursor: not-allowed; }

        /* Pagination Bar */
        .pagination-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 0.25rem 0.25rem 0.25rem;
          border-top: 1px solid #f1f5f9;
          margin-top: 1rem;
        }

        .pagination-btn {
          padding: 0.45rem 1rem;
          background: white;
          border: 1px solid #cbd5e1;
          color: #475569;
          font-weight: 700;
          font-size: 0.8rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
        }

        .pagination-btn:hover:not(:disabled) {
          border-color: #1F3A2E;
          color: #1F3A2E;
          background: #f8fafc;
        }

        .pagination-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .pagination-pages {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .pagination-page-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border: 1px solid #cbd5e1;
          color: #475569;
          font-weight: 700;
          font-size: 0.8rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pagination-page-btn:hover:not(.active) {
          border-color: #1F3A2E;
          color: #1F3A2E;
          background: #f8fafc;
        }

        .pagination-page-btn.active {
          background: #1F3A2E;
          color: white;
          border-color: #1F3A2E;
          box-shadow: 0 2px 6px rgba(31,58,46,0.15);
        }

        /* General Curation List Tags */
        .exam-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem;
          border-bottom: 1px solid #f1f5f9;
          transition: background 0.2s;
          text-align: left;
        }
        .exam-item:hover { background: #f8fafc; }
        .exam-main h3 { font-size: 0.95rem; color: #0f172a; margin: 0 0 0.35rem 0; font-weight: 700; }
        .exam-main span { font-size: 0.8rem; color: #64748b; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; }
        .cat-badge { background: #f1f5f9; color: #475569; padding: 1px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; }
        
        .exam-actions { display: flex; align-items: center; gap: 1rem; color: #cbd5e1; }
        .btn-outline {
          padding: 0.45rem 1rem;
          background: transparent;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
        }
        .btn-outline:hover { border-color: #1F3A2E; color: #1F3A2E; }
        
        .loading-state, .empty-state { padding: 3rem 1rem; text-align: center; color: #64748b; font-weight: 600; font-size: 0.9rem; }

        /* Scraper preview card */
        .scraper-preview-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 2rem;
          text-align: left;
        }
        .card-alert {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: #eef2f0;
          color: #1F3A2E;
          padding: 1rem;
          border-radius: 12px;
          font-size: 0.85rem;
          margin-bottom: 1.5rem;
          border: 1px solid rgba(31,58,46,0.1);
        }
        .scraper-preview-card p {
          color: #475569;
          font-size: 0.95rem;
          line-height: 1.6;
          margin: 0;
        }

        /* Users and Admins List Table */
        .table-responsive { width: 100%; overflow-x: auto; margin-top: 1rem; }
        .admins-table { width: 100%; border-collapse: collapse; border-spacing: 0; text-align: left; }
        .admins-table th { 
          background: #f8fafc; 
          padding: 1rem; 
          font-size: 0.75rem; 
          font-weight: 800; 
          color: #475569; 
          text-transform: uppercase; 
          letter-spacing: 0.05em;
          border-bottom: 2px solid #e2e8f0;
        }
        .admins-table td { padding: 1.1rem 1rem; border-bottom: 1px solid #f1f5f9; font-size: 0.9rem; color: #334155; vertical-align: middle; }
        
        .admin-profile-row { display: flex; align-items: center; gap: 0.75rem; }
        .profile-initials {
          width: 32px;
          height: 32px;
          background: #e2e8f0;
          color: #475569;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.75rem;
        }
        .admin-profile-name { font-weight: 700; color: #0f172a; }
        .admins-table code { background: #f8fafc; padding: 2px 6px; border-radius: 6px; border: 1px solid #e2e8f0; font-family: monospace; font-size: 0.8rem; color: #0f172a; }

        /* Role Pill Badges */
        .role-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 0.25rem 0.75rem;
          border-radius: 100px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .role-badge.super-admin { background: #eef2eb; color: #1F3A2E; } /* Olive! */
        .role-badge.content-curator { background: #f1f5f9; color: #475569; } /* Slate/Grey! */
        .role-badge.scraper-operator { background: #fdf6e2; color: #b89047; } /* Gold! */
        .role-badge.system-administrator { background: #eef2eb; color: #4b6b32; } /* Olive! */

        /* Permissions list */
        .permissions-tags { display: flex; flex-wrap: wrap; gap: 4px; }
        .perm-tag {
          font-size: 0.7rem;
          font-weight: 700;
          background: #f1f5f9;
          color: #475569;
          padding: 2px 8px;
          border-radius: 4px;
          text-transform: capitalize;
        }
        .perm-tag.super { background: #1F3A2E; color: white; }

        .permission-lock-notice {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: #94a3b8;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          border: 1px dashed #cbd5e1;
        }

        .btn-delete {
          background: none;
          border: none;
          color: #cbd5e1;
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .btn-delete:hover:not(:disabled) { background: #eef2eb; color: #4b6b32; }
        .btn-delete:disabled { opacity: 0.25; cursor: not-allowed; }

        /* Modal Dialog Backdrops */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1.5rem;
        }

        .modal-card {
          background: white;
          border-radius: 28px;
          width: 100%;
          max-width: 520px;
          box-shadow: 0 30px 60px -15px rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.2);
          overflow: hidden;
          animation: modalSlideUp 0.3s ease-out;
        }

        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 2rem;
          border-bottom: 1px solid #f1f5f9;
          text-align: left;
        }

        .modal-header h3 { font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.02em; }
        .btn-close { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; display: flex; align-items: center; }
        .btn-close:hover { color: #475569; }

        .modal-body { padding: 2rem; text-align: left; display: flex; flex-direction: column; gap: 1.25rem; }
        .modal-body label { font-size: 0.8rem; font-weight: 800; color: #475569; margin-bottom: 0.5rem; display: block; }
        
        .modal-body input, .modal-body select {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          font-size: 0.95rem;
          outline: none;
          background: #f8fafc;
          transition: all 0.2s;
        }
        .modal-body input:focus, .modal-body select:focus { border-color: #1F3A2E; background: white; box-shadow: 0 0 0 4px rgba(31,58,46,0.06); }

        .checkbox-grid { display: grid; grid-template-columns: 1fr; gap: 0.75rem; margin-top: 0.5rem; }
        .checkbox-item { 
          display: flex !important; 
          align-items: center; 
          gap: 0.75rem; 
          cursor: pointer; 
          margin: 0 !important;
          padding: 0.5rem;
          border-radius: 8px;
          transition: background 0.2s;
        }
        .checkbox-item:hover { background: #f8fafc; }
        .checkbox-item input { width: auto !important; height: auto !important; cursor: pointer; }
        .checkbox-item span { font-size: 0.85rem; font-weight: 600; color: #334155; }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          padding: 1.25rem 2rem;
          background: #f8fafc;
          border-top: 1px solid #f1f5f9;
        }

        .btn-primary-modal {
          padding: 0.75rem 1.5rem;
          background: #1F3A2E;
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.88rem;
          cursor: pointer;
          box-shadow: 0 4px 10px rgba(31,58,46,0.15);
        }

        .btn-secondary-modal {
          padding: 0.75rem 1.5rem;
          background: white;
          color: #475569;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.88rem;
          cursor: pointer;
        }

        .btn-primary-modal:hover { opacity: 0.9; }
        .btn-secondary-modal:hover { background: #f1f5f9; }

        .animate-fade-in { animation: fadeIn 0.25s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

        /* ================ USERS TAB STYLES ================ */

        /* 5-column stats grid when users tab adds a card */
        .stats-grid { grid-template-columns: repeat(5, 1fr) !important; }

        /* Users count badge */
        .users-count-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 1.25rem;
          background: #eef2eb;
          color: #4b6b32;
          border: 1px solid rgba(75, 107, 50, 0.15);
          border-radius: 12px;
          font-weight: 800;
          font-size: 0.85rem;
        }

        /* User table clickable rows */
        .users-table tbody tr.user-row-clickable {
          cursor: pointer;
          transition: background 0.15s, box-shadow 0.15s;
        }
        .users-table tbody tr.user-row-clickable:hover {
          background: #f8faf6 !important;
          box-shadow: inset 3px 0 0 #4b6b32;
        }

        /* User initials circle */
        .user-initials-circle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1F3A2E, #4b6b32);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.72rem;
          flex-shrink: 0;
          letter-spacing: 0.02em;
        }

        /* State / District stacked cell */
        .state-district-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .state-name {
          font-weight: 700;
          color: #0f172a;
          font-size: 0.82rem;
        }
        .district-name {
          font-size: 0.7rem;
          color: #94a3b8;
          font-weight: 600;
        }

        /* Category badge pills */
        .category-badge-pill {
          display: inline-block;
          font-size: 0.68rem;
          font-weight: 800;
          padding: 0.2rem 0.6rem;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          white-space: nowrap;
        }
        .category-badge-pill.general { background: #f1f5f9; color: #475569; }
        .category-badge-pill.general--ews- { background: #f1f5f9; color: #475569; }
        .category-badge-pill.obc--non-creamy-layer- { background: #fdf6e2; color: #b89047; }
        .category-badge-pill.sc { background: #eef2eb; color: #4b6b32; }
        .category-badge-pill.st { background: #eef2eb; color: #1F3A2E; }

        /* Corps text */
        .corps-text {
          font-weight: 600;
          color: #475569;
          font-size: 0.8rem;
        }

        /* Qualification badge */
        .qual-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 0.2rem 0.6rem;
          border-radius: 6px;
          white-space: nowrap;
        }
        .qual-badge.matriculation { background: #f1f5f9; color: #475569; }
        .qual-badge.intermediate { background: #fdf6e2; color: #b89047; }
        .qual-badge.graduation { background: #eef2eb; color: #4b6b32; }
        .qual-badge.graduation-while-in-service { background: #eef2eb; color: #1F3A2E; }

        /* Skills cell */
        .skills-cell {
          font-size: 0.78rem;
          color: #64748b;
          font-weight: 600;
          line-height: 1.4;
          cursor: help;
        }

        /* Medical badge */
        .medical-badge {
          display: inline-block;
          font-size: 0.68rem;
          font-weight: 800;
          padding: 0.2rem 0.55rem;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .medical-badge.shape1 { background: #eef2eb; color: #4b6b32; }
        .medical-badge.other { background: #f1f5f9; color: #475569; }

        /* View profile eye button */
        .btn-view-profile {
          background: none;
          border: 1px solid #e2e8f0;
          color: #94a3b8;
          cursor: pointer;
          padding: 6px 8px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .btn-view-profile:hover {
          background: #eef2eb;
          color: #4b6b32;
          border-color: #4b6b32;
        }

        /* ================ USER DETAIL DRAWER ================ */
        .user-drawer-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.35);
          backdrop-filter: blur(6px);
          z-index: 1000;
          display: flex;
          justify-content: flex-end;
        }

        .user-drawer-panel {
          width: 520px;
          max-width: 90vw;
          height: 100vh;
          background: white;
          box-shadow: -20px 0 60px rgba(0,0,0,0.12);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .animate-slide-in-right {
          animation: slideInRight 0.3s ease-out;
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem 2rem;
          border-bottom: 1px solid #f1f5f9;
          background: linear-gradient(135deg, #1F3A2E 0%, #2d5035 100%);
          flex-shrink: 0;
        }
        .drawer-header .btn-close {
          color: rgba(255,255,255,0.7);
        }
        .drawer-header .btn-close:hover {
          color: white;
        }

        .drawer-profile-hero {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .drawer-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(255,255,255,0.15);
          border: 2px solid rgba(255,255,255,0.3);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1rem;
          letter-spacing: 0.02em;
        }

        .drawer-hero-info h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 800;
          color: white;
          letter-spacing: -0.02em;
        }
        .drawer-hero-info p {
          margin: 0.2rem 0 0;
          font-size: 0.8rem;
          color: rgba(255,255,255,0.65);
          font-weight: 600;
        }

        .drawer-body {
          flex: 1;
          overflow-y: auto;
          padding: 1.75rem 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
        }

        .drawer-section {
          text-align: left;
        }
        .drawer-section h4 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          font-weight: 800;
          color: #1F3A2E;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin: 0 0 1rem 0;
          padding-bottom: 0.65rem;
          border-bottom: 2px solid #eef2eb;
        }

        .drawer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .drawer-field {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .drawer-field.full-width {
          grid-column: 1 / -1;
        }

        .field-label {
          font-size: 0.68rem;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .field-value {
          font-size: 0.88rem;
          font-weight: 600;
          color: #0f172a;
          line-height: 1.5;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          word-break: break-word;
        }

        /* Character on discharge badge */
        .character-badge {
          display: inline-block;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 0.15rem 0.55rem;
          border-radius: 4px;
          text-transform: capitalize;
        }
        .character-badge.exemplary { background: #eef2eb; color: #4b6b32; }
        .character-badge.very.good, .character-badge.very { background: #fdf6e2; color: #b89047; }
        .character-badge.good { background: #f1f5f9; color: #475569; }
      `}</style>

    </div>
    </div>
  );
};

export default AdminDashboard;
