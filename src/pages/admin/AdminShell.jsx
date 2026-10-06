import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ADMIN_NAV } from './adminNavConfig';
import {
  GraduationCap, Users, Shield,
  HelpCircle, Briefcase, Gift, Landmark, LogOut, ChevronsLeft, ChevronsRight, ScrollText, UserCheck, BookMarked, FileUp, Tags, Scale, Palette, BookOpen, Sun, Moon,
} from 'lucide-react';
import './AdminCMS.css';

import FirstLoginModal from '../../components/admin/FirstLoginModal';

const ICONS = { GraduationCap, Users, Shield, HelpCircle, Briefcase, Gift, Landmark, ScrollText, UserCheck, BookMarked, FileUp, Tags, Scale, Palette, BookOpen };

// Horizontal section nav, directly under the top header — required by the
// CMS mockup ("Do NOT remove this horizontal navigation") even though it
// duplicates most of the left sidebar. Settings aliases to Roles &
// Permissions (the closest thing to system configuration that exists
// today). Exams is first — it's the actual admin landing page (see the
// /admin redirect in App.jsx).
const HORIZONTAL_NAV = [
  { label: 'Exams', path: '/admin/exams' },
  { label: 'Users', path: '/admin/users' },
  { label: 'Settings', path: '/admin/roles' },
  { label: 'Profile', path: '/admin/profile' },
];

// Page title + one-line description shown in the top header, keyed by path.
const PAGE_META = {
  '/admin/exams': { title: 'Exams Management', description: 'Organize exams, map syllabus and assign content resources.' },
  '/admin/books': { title: 'Book Content', description: 'Organize books, guides, precis, and their exam links.' },
  '/admin/reader-themes': { title: 'Reader Themes', description: 'Configure how VeerNXT books look across the Learning Center.' },
  '/admin/conducting-bodies': { title: 'Conducting Bodies', description: 'Manage exam conducting organizations and their logos.' },
  '/admin/categories': { title: 'Categories', description: 'The sector classification used on every exam — add, rename, or delete categories here.' },
  '/admin/subjects': { title: 'Subjects', description: 'Manage subjects and the portrait thumbnails used on study materials.' },
  '/admin/publish-content': { title: 'Publish Content', description: 'Upload a .docx, pick Intro/Guide/Precis, preview the conversion, attach it to exam(s), and publish it live.' },
  '/admin/users': { title: 'Users', description: 'Registered service personnel and platform accounts.' },
  '/admin/roles': { title: 'Roles & Permissions', description: 'Assign roles and curate access control lists.' },
  '/admin/profile': { title: 'Admin Profile & Security', description: 'Manage your administrator account details, security credentials, and access permissions.' },
  '/admin/quizzes': { title: 'Quizzes', description: 'Manage and categorize mock and topic tests across subjects and exams.' },
  '/admin/pyq-papers': { title: 'PYQ Papers', description: 'Manage previous year question papers and tag them with exams and subjects.' },
  '/admin/jobs': { title: 'Job Board', description: 'Aggregated vacancy notifications.' },
  '/admin/rewards': { title: 'Rewards', description: 'Redemption queue for the points program.' },
  '/admin/private-sector': { title: 'Private Sector — HR Console', description: 'Employer requirements, service verification and the candidate matching pipeline.' },
  '/admin/legal-aid': { title: 'Legal Aid Queries', description: 'View submitted legal aid queries and send email responses to veterans.' },
};

const AdminShell = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('admin_sidebar_collapsed') === 'true');
  const [theme, setTheme] = useState(() => localStorage.getItem('admin_theme') === 'light' ? 'light' : 'dark');

  useEffect(() => {
    const raw = localStorage.getItem('admin_session');
    if (!raw) { navigate('/admin/login'); return; }
    setSession(JSON.parse(raw));
  }, [navigate]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('admin_sidebar_collapsed', String(next));
      return next;
    });
  };

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('admin_theme', next);
      return next;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_session');
    navigate('/admin/login');
  };

  const activeItem = ADMIN_NAV.flatMap((g) => g.items).find((item) => location.pathname.startsWith(item.path));
  const pageMeta = PAGE_META[location.pathname];

  if (!session) return null;

  return (
    <div className={`admin-shell ${theme === 'light' ? 'light' : ''}`}>
      {/* Mandatory first-login security setup modal */}
      {(session.is_first_login || session.must_change_password || session.must_change_name) && (
        <FirstLoginModal 
          session={session} 
          onComplete={(updated) => setSession(updated)} 
        />
      )}
      <aside className={`admin-sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="admin-sidebar-brand">
          <img src="/logo.png" alt="VeerNXT" />
          {!collapsed && (
            <div>
              <div className="admin-sidebar-brand-name">VEERNXT</div>
              <div className="admin-sidebar-brand-sub">CMS</div>
            </div>
          )}
        </div>

        <nav className="admin-sidebar-nav">
          {ADMIN_NAV.map((group) => (
            <div key={group.group} className="admin-sidebar-group">
              <div className="admin-sidebar-group-label">{group.group}</div>
              {group.items.map((item) => {
                const Icon = ICONS[item.icon];
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <button
                    key={item.key}
                    className={`admin-sidebar-link ${isActive ? 'active' : ''}`}
                    onClick={() => navigate(item.path)}
                    title={item.label}
                  >
                    {Icon && <Icon size={17} />}
                    <span>{item.label}</span>
                    {item.badge && <span className="admin-sidebar-badge">{item.badge}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <button className="admin-sidebar-collapse-btn" onClick={toggleCollapsed} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <ChevronsRight size={16} /> : <><ChevronsLeft size={16} /> <span>Collapse</span></>}
        </button>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <div className="admin-topbar-title">{pageMeta?.title || activeItem?.label || 'Admin'}</div>
            {pageMeta?.description && <div className="admin-topbar-subtitle">{pageMeta.description}</div>}
          </div>
          <div className="admin-topbar-user">
            <button className="admin-theme-toggle" title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggleTheme}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div 
              className="admin-topbar-user-clickable" 
              onClick={() => navigate('/admin/profile')} 
              title="View / Edit Profile"
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
            >
              <div className="admin-avatar-initials">
                {session.name?.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>
              <div className="admin-topbar-user-info">
                <div className="admin-topbar-user-name">{session.name}</div>
                <div className="admin-topbar-user-role">{session.role}</div>
              </div>
            </div>
            <button className="admin-logout-btn" title="Log out" onClick={handleLogout}>
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminShell;
