import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import Icon from './Icon.jsx';
import Cashier from '../pages/Cashier.jsx';
import Laboratory from '../pages/Laboratory.jsx';
import Inventory from '../pages/Inventory.jsx';
import Accounting from '../pages/Accounting.jsx';
import Income from '../pages/Income.jsx';
import Settings from '../pages/Settings.jsx';
import Users from '../pages/Users.jsx';

// The existing role rules and page components are preserved.
const NAV = [
  { key: 'cashier', label: 'Cashier', icon: 'receipt', roles: ['cashier', 'superadmin'], subtitle: 'Patients, billing, and transactions', description: 'A simpler way to manage patient billing, examinations, and payments.' },
  { key: 'laboratory', label: 'Laboratory', icon: 'flask', roles: ['doctor', 'lab_tech', 'superadmin'], subtitle: 'Results and testing', description: 'Review pending tests, record results, and manage laboratory workflows.' },
  { key: 'inventory', label: 'Inventory', icon: 'boxes', roles: ['inventory_staff', 'superadmin'], subtitle: 'Stock and supplies', description: 'Keep essential medical supplies accounted for and ready to use.' },
  { key: 'accounting', label: 'Accounting', icon: 'chart', roles: ['accountant', 'superadmin'], subtitle: 'Expenses and reports', description: 'Understand expenses and operational activity in one place.' },
  { key: 'income', label: 'Income', icon: 'income', roles: null, subtitle: 'Revenue and sales', description: 'Review payments, track income, and export records.' },
  { key: 'settings', label: 'Settings', icon: 'settings', roles: ['cashier', 'lab_tech', 'accountant', 'superadmin'], subtitle: 'System configuration', description: 'Adjust departments, examinations, and billing preferences.' },
  { key: 'users', label: 'Users', icon: 'users', roles: ['superadmin'], subtitle: 'Staff management', description: 'Manage staff accounts, roles, and access to PerPoly.' }
];

const VIEWS = {
  cashier: Cashier,
  laboratory: Laboratory,
  inventory: Inventory,
  accounting: Accounting,
  income: Income,
  settings: Settings,
  users: Users
};

function displayRole(value = '') {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Layout() {
  const { user, logout } = useAuth();
  const [view, setView] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const allowed = NAV.filter((n) => !n.roles || n.roles.some((r) => roles.includes(r)));
  const active = allowed.some((n) => n.key === view) ? view : allowed[0]?.key;
  const page = NAV.find((n) => n.key === active);
  const PageComponent = VIEWS[active];
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Staff member';
  const initials = [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join('').toUpperCase() || 'PP';
  const primaryRole = displayRole(roles[0] || 'Staff');
  const today = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date());

  useEffect(() => {
    if (!mobileOpen) return;
    const onEscape = (event) => { if (event.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [mobileOpen]);

  const selectPage = (key) => {
    setView(key);
    setMobileOpen(false);
    // Keep newly selected pages from retaining the scroll position of Income tables.
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <div className="pp-shell">
      {mobileOpen && <button type="button" className="pp-sidebar-overlay" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`pp-sidebar ${mobileOpen ? 'is-open' : ''}`} aria-label="Primary navigation">
        <div className="pp-brandbar">
          <div className="pp-brand-mark"><img src="/logo.jpg" alt="PerPoly logo" /></div>
          <div className="pp-brand-copy"><strong>PerPoly<span>.</span></strong><small>Hospital management</small></div>
          <button type="button" className="pp-mobile-close" aria-label="Close menu" onClick={() => setMobileOpen(false)}><Icon name="close" /></button>
        </div>
        <div className="pp-nav-heading">WORKSPACES</div>
        <nav className="pp-nav" aria-label="Departments">
          {allowed.map((n) => (
            <button key={n.key} type="button" className={`pp-nav-link ${active === n.key ? 'is-active' : ''}`}
              onClick={() => selectPage(n.key)} aria-current={active === n.key ? 'page' : undefined}>
              <span className="pp-nav-icon"><Icon name={n.icon} size={19}/></span><span className="pp-nav-label">{n.label}</span>
              {active === n.key && <span className="pp-nav-active-dot"/>}
            </button>
          ))}
        </nav>
        <div className="pp-sidebar-bottom">
          <div className="pp-profile">
            <span className="pp-avatar">{initials}</span>
            <div className="pp-profile-details"><strong title={fullName}>{fullName}</strong><small>{primaryRole}</small></div>
          </div>
          <button type="button" className="pp-logout" onClick={logout}><Icon name="logout" size={18}/> <span>Sign out</span></button>
          <div className="pp-sidebar-footer"><a href="/" style={{ color: "inherit", textDecoration: "none" }}>← Public website</a></div>
        </div>
      </aside>
      <div className="pp-main">
        <header className="pp-topbar">
          <div className="pp-topbar-left">
            <button className="pp-menu-toggle" type="button" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Icon name="menu" size={22}/></button>
            <span className="pp-crumb-muted">PerPoly</span><Icon name="chevron" size={14} className="pp-crumb-chevron"/>
            <span className="pp-crumb-current">{page?.label || 'Workspace'}</span>
          </div>
          <div className="pp-topbar-right">
            <span className="pp-top-date"><Icon name="calendar" size={17}/>{today}</span>
            <span className="pp-top-divider"/>
            <span className="pp-top-user"><span className="pp-top-user-avatar">{initials}</span><span>{fullName}</span></span>
          </div>
        </header>
        <main className="pp-main-content">
          <section className="pp-page-intro" aria-labelledby="pp-page-title">
            <div className="pp-page-intro-copy">
              <div className="pp-eyebrow"><span className="pp-eyebrow-dot"/> {page?.subtitle || 'Your workspace'}</div>
              <h1 id="pp-page-title">{page?.label || 'Workspace'}</h1>
              <p>{page?.description || 'You do not have access to a workspace yet.'}</p>
            </div>
            <div className="pp-page-intro-symbol"><Icon name={page?.icon || 'shield'} size={31} strokeWidth={1.6}/></div>
          </section>
          <div className={`pp-workspace pp-workspace-${active || 'empty'}`} key={active}>
            {PageComponent ? <PageComponent/> : <div className="card empty">No system access assigned to your account.</div>}
          </div>
          <footer className="pp-main-footer">PerPoly Hospital Management <span>·</span> Designed for focused work</footer>
        </main>
      </div>
    </div>
  );
}
