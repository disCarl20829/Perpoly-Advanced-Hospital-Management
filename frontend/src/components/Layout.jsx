import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import Cashier from '../pages/Cashier.jsx';
import Laboratory from '../pages/Laboratory.jsx';
import Inventory from '../pages/Inventory.jsx';
import Accounting from '../pages/Accounting.jsx';
import Income from '../pages/Income.jsx';
import Users from '../pages/Users.jsx';

const NAV = [
    { key: 'cashier', label: 'Cashier', icon: '🧾', roles: ['cashier', 'superadmin'] },
    { key: 'laboratory', label: 'Laboratory', icon: '🧪', roles: ['doctor', 'lab_tech', 'superadmin'] },
    { key: 'inventory', label: 'Inventory', icon: '📦', roles: ['inventory_staff', 'superadmin'] },
    { key: 'accounting', label: 'Accounting', icon: '📊', roles: ['accountant', 'superadmin'] },
    { key: 'income', label: 'Income', icon: '💵', roles: null },
    { key: 'users', label: 'Users', icon: '👥', roles: ['superadmin'] }
];

export default function Layout() {
    const { user, logout } = useAuth();
    const [view, setView] = useState(null);

    const allowed = NAV.filter((n) => !n.roles || n.roles.some((r) => user.roles.includes(r)));
    const active = view || allowed[0]?.key;
    const title = NAV.find((n) => n.key === active)?.label || 'Dashboard';

    const renderView = () => {
        switch (active) {
            case 'cashier':
                return <Cashier />;
            case 'laboratory':
                return <Laboratory />;
            case 'inventory':
                return <Inventory />;
            case 'accounting':
                return <Accounting />;
            case 'income':
                return <Income />;
            case 'users':
                return <Users />;
            default:
                return <div className="card empty">No system access assigned to your account.</div>;
        }
    };

    return (
        <div className="app-shell">
            <aside className="sidebar">
                <div className="brand">
                    <img src="/logo.jpg" alt="PerPoly logo" />
                    <div className="name">
                        PerPoly
                        <small>Hospital Management</small>
                    </div>
                </div>

                <nav>
                    {allowed.map((n) => (
                        <button
                            key={n.key}
                            className={active === n.key ? 'active' : ''}
                            onClick={() => setView(n.key)}
                        >
                            <span>{n.icon}</span> {n.label}
                        </button>
                    ))}
                </nav>

                <div className="user">
                    <div className="who">
                        {user.first_name} {user.last_name}
                    </div>
                    <div className="tag-list">
                        {user.roles.map((r) => (
                            <span key={r} className="badge green">
                                {r}
                            </span>
                        ))}
                    </div>
                    <button className="btn ghost sm" style={{ marginTop: 10, width: '100%' }} onClick={logout}>
                        Sign out
                    </button>
                </div>
            </aside>

            <div className="main">
                <div className="topbar">
                    <h1>{title}</h1>
                    <div className="actions muted">PerPoly HMS</div>
                </div>
                <div className="content">{renderView()}</div>
            </div>
        </div>
    );
}
