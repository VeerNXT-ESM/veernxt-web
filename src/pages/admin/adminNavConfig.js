// Data-driven sidebar nav for the admin CMS shell (AdminShell.jsx). Only
// groups/items backed by a real, working page are listed here — per
// CMS_Rehaul.md §2's structure, trimmed to what actually exists today.
// Icon names are resolved to lucide-react components in AdminShell.jsx.
export const ADMIN_NAV = [
  {
    group: 'LEARNING',
    items: [
      { key: 'exams', label: 'Exams', path: '/admin/exams', icon: 'GraduationCap' },
      { key: 'syllabus', label: 'Syllabus', path: '/admin/syllabus', icon: 'BookOpen' },
      { key: 'resources', label: 'Resources', path: '/admin/resources', icon: 'Library' },
      { key: 'conducting-bodies', label: 'Conducting Bodies', path: '/admin/conducting-bodies', icon: 'Landmark' },
    ],
  },
  {
    group: 'ANALYTICS',
    items: [
      { key: 'overview', label: 'Overview', path: '/admin/overview', icon: 'BarChart3', badge: 'New' },
      { key: 'content-graph', label: 'Content Graph', path: '/admin/content-graph', icon: 'Share2' },
    ],
  },
  {
    group: 'SYSTEM',
    items: [
      { key: 'users', label: 'Users', path: '/admin/users', icon: 'Users' },
      { key: 'roles', label: 'Roles & Permissions', path: '/admin/roles', icon: 'Shield' },
      { key: 'quizzes', label: 'Quizzes', path: '/admin/quizzes', icon: 'HelpCircle' },
      { key: 'pyq-papers', label: 'PYQ Papers', path: '/admin/pyq-papers', icon: 'ScrollText' },
    ],
  },
  {
    group: 'OPERATIONS',
    items: [
      { key: 'jobs', label: 'Job Board', path: '/admin/jobs', icon: 'Briefcase' },
      { key: 'rewards', label: 'Rewards', path: '/admin/rewards', icon: 'Gift' },
    ],
  },
];
