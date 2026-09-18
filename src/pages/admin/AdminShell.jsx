import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ADMIN_NAV } from './adminNavConfig';
import {
  GraduationCap, Users, Shield,
  HelpCircle, Briefcase, Gift, Landmark, LogOut, ChevronsLeft, ChevronsRight, ScrollText, UserCheck, BookMarked, FileUp, Tags,
} from 'lucide-react';
import './AdminCMS.css';

const ICONS = { GraduationCap, Users, Shield, HelpCircle, Briefcase, Gift, Landmark, ScrollText, UserCheck, BookMarked, FileUp, Tags };

// Page title + one-line description shown in the top header, keyed by path.
const PAGE_META = {
  '/admin/exams': { title: 'Exams Management', description: 'Organize exams, map syllabus and assign content resources.' },
  '/admin/books': { title: 'Book Content' },
  '/admin/categories': { title: 'Categories', description: 'The sector classification used on every exam — add, rename, or delete categories here.' },
  '/admin/publish-content': { title: 'Publish Content', description: 'Upload a .docx, pick Intro/Guide/Precis, preview the conversion, attach it to exam(s), and publish it live.' },
  '/admin/users': { title: 'Users', description: 'Registered service personnel and platform accounts.' },
  '/admin/roles': { title: 'Roles & Permissions', description: 'Assign roles and curate access control lists.' },
  '/admin/quizzes': { title: 'Quizzes' },
  '/admin/pyq-papers': { title: 'PYQ Papers' },
  '/admin/jobs': { title: 'Job Board', description: 'Aggregated vacancy notifications.' },
  '/admin/rewards': { title: 'Rewards', description: 'Redemption queue for the points program.' },
  '/admin/private-sector': { title: 'Private Sector — HR Console', description: 'Employer requirements, service verification and the candidate matching pipeline.' },
};

const AdminShell = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('admin_sidebar_collapsed') === 'true');

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

  const handleLogout = () => {
    localStorage.removeItem('admin_session');
    navigate('/admin/login');
  };

  const activeItem = ADMIN_NAV.flatMap((g) => g.items).find((item) => location.pathname.startsWith(item.path));
  const pageMeta = PAGE_META[location.pathname];

  if (!session) return null;

  return (
    <div className="admin-shell">
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

        <button className="admin-sidebar-collapse-btn" onClick={toggleCollapsed} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <ChevronsRight size={16} /> : <><ChevronsLeft size={16} /> <span>Collapse</span></>}
        </button>

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
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <div className="admin-topbar-title">{pageMeta?.title || activeItem?.label || 'Admin'}</div>
            {pageMeta?.description && <div className="admin-topbar-subtitle">{pageMeta.description}</div>}
          </div>
          <div className="admin-topbar-user">
            <div className="admin-avatar-initials">
              {session.name?.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div className="admin-topbar-user-info">
              <div className="admin-topbar-user-name">{session.name}</div>
              <div className="admin-topbar-user-role">{session.role}</div>
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
