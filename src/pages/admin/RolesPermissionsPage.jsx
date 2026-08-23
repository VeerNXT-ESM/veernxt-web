import { useState, useEffect } from 'react';
import { Plus, Shield, Trash2, X, Lock } from 'lucide-react';

const RolesPermissionsPage = () => {
  const [currentSession, setCurrentSession] = useState(null);
  const [adminsList, setAdminsList] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    name: '', email: '', role: 'Content Curator',
    permissions: { create_content: true, edit_quizzes: false, trigger_scrapers: false, manage_users: false },
  });

  useEffect(() => {
    const raw = localStorage.getItem('admin_session');
    if (raw) setCurrentSession(JSON.parse(raw));
    initializeAdminRegistry();
  }, []);

  const initializeAdminRegistry = async () => {
    try {
      const res = await fetch('/api/admin/admins');
      const data = await res.json();
      if (data.ok) setAdminsList(data.admins);
    } catch (err) {
      console.error('Error fetching admin registry:', err);
    }
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    if (!newAdmin.name || !newAdmin.email) return;
    const activePerms = Object.keys(newAdmin.permissions).filter((k) => newAdmin.permissions[k]);
    try {
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'invite', name: newAdmin.name, email: newAdmin.email.trim().toLowerCase(), role: newAdmin.role, permissions: activePerms }),
      });
      const data = await res.json();
      if (!data.ok) { alert(data.error || 'Failed to add administrator'); return; }
      if (data.tempPassword) {
        alert(`Admin created!\n\nEmail: ${newAdmin.email}\nTemporary Password: ${data.tempPassword}\n\nPlease copy this password and share it securely with the user.`);
      } else {
        alert(data.message || 'Administrator added successfully');
      }
      await initializeAdminRegistry();
      setNewAdmin({ name: '', email: '', role: 'Content Curator', permissions: { create_content: true, edit_quizzes: false, trigger_scrapers: false, manage_users: false } });
      setShowAddModal(false);
    } catch (err) {
      alert('Error creating admin. Please try again.');
    }
  };

  const handleDeleteAdmin = async (emailToDelete) => {
    if (emailToDelete.toLowerCase() === 'veernxt.esm@gmail.com') {
      alert('Access Denied: Super Admin Vivek Talwar cannot be removed to prevent portal lockouts.');
      return;
    }
    if (!window.confirm(`Are you sure you want to revoke administrative privileges for ${emailToDelete}?`)) return;
    try {
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', email: emailToDelete }),
      });
      const data = await res.json();
      if (!data.ok) { alert(data.error || 'Failed to revoke privileges'); return; }
      await initializeAdminRegistry();
    } catch (err) {
      alert('Error communicating with server.');
    }
  };

  const isSuperAdmin = currentSession?.role === 'Super Admin';

  return (
    <div>
      <div className="lc-section-header">
        <div>
          <h2>Roles &amp; Permissions</h2>
          <p>Assign roles, curate access control lists, and invite administrators.</p>
        </div>
        {isSuperAdmin ? (
          <button className="lc-btn primary" onClick={() => setShowAddModal(true)}><Plus size={16} /> Add Administrator</button>
        ) : (
          <span className="lc-count-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Lock size={13} /> Super Admin rights needed to add users</span>
        )}
      </div>

      <div className="lc-table-responsive">
        <table className="lc-table">
          <thead>
            <tr>
              <th>Administrator</th>
              <th>Email</th>
              <th>Role</th>
              <th>Responsibilities</th>
              <th style={{ textAlign: 'right' }}>Revoke</th>
            </tr>
          </thead>
          <tbody>
            {adminsList.map((admin, idx) => (
              <tr key={idx}>
                <td>
                  <span className="lc-table-title">{admin.name}</span>
                </td>
                <td><code style={{ fontSize: '0.8rem' }}>{admin.email}</code></td>
                <td>
                  <span className="lc-status-badge" style={{ background: 'var(--admin-accent-soft)', color: 'var(--admin-accent)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Shield size={12} /> {admin.role}
                  </span>
                </td>
                <td style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>
                  {admin.permissions.includes('all') ? 'Full Platform Control' : admin.permissions.map((p) => p.replace('_', ' ')).join(', ')}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    className="lc-icon-btn danger"
                    onClick={() => handleDeleteAdmin(admin.email)}
                    disabled={admin.email.toLowerCase() === 'veernxt.esm@gmail.com' || !isSuperAdmin}
                    title={admin.email.toLowerCase() === 'veernxt.esm@gmail.com' ? 'Cannot delete primary owner' : 'Revoke security credentials'}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {adminsList.length === 0 && <div className="lc-empty-state"><p>No administrators registered yet.</p></div>}
      </div>

      {showAddModal && (
        <div className="lc-modal-backdrop">
          <form onSubmit={handleAddAdmin} className="lc-modal-card">
            <div className="lc-modal-header">
              <h3>Register New Administrator</h3>
              <button type="button" className="lc-close-btn" onClick={() => setShowAddModal(false)}><X size={20} /></button>
            </div>
            <div className="lc-modal-body">
              <div className="lc-input-group">
                <label>Admin Full Name</label>
                <input type="text" placeholder="e.g. Captain Amit Sharma" value={newAdmin.name} onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })} required />
              </div>
              <div className="lc-input-group">
                <label>Administrative Email</label>
                <input type="email" placeholder="name@veernxt.in" value={newAdmin.email} onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} required />
              </div>
              <div className="lc-input-group">
                <label>Assigned CMS Role</label>
                <select className="lc-native-select" value={newAdmin.role} onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}>
                  <option value="Content Curator">Content Curator (Textbooks &amp; Guides)</option>
                  <option value="Scraper Operator">Scraper Operator (Vacancy Scrapes)</option>
                  <option value="System Administrator">System Administrator (Catalog Operations)</option>
                  <option value="Super Admin">Super Admin (Complete Access Control)</option>
                </select>
              </div>
              <div className="lc-input-group">
                <label>Direct Responsibilities / Permissions</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.4rem' }}>
                  {[
                    ['create_content', 'Create & Edit Course Resources'],
                    ['edit_quizzes', 'Manage Assessments & Quizzes'],
                    ['trigger_scrapers', 'Trigger Active Web Scrapers'],
                    ['manage_users', 'Invite Administrators & Roles'],
                  ].map(([key, label]) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--admin-text)' }}>
                      <input
                        type="checkbox"
                        checked={newAdmin.permissions[key]}
                        onChange={(e) => setNewAdmin({ ...newAdmin, permissions: { ...newAdmin.permissions, [key]: e.target.checked } })}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="lc-modal-footer">
              <button type="button" className="lc-btn" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button type="submit" className="lc-btn primary">Grant Security Access</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default RolesPermissionsPage;
