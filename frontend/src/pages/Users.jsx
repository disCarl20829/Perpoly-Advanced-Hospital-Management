import { useState, useEffect } from 'react';
import { api } from '../api.js';

const EMPTY_FORM = {
    last_name: '',
    first_name: '',
    middle_name: '',
    extra_name: '',
    email: '',
    password: '',
    roles: []
};

export default function Users() {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [form, setForm] = useState(EMPTY_FORM);

    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        loadUsers();
        loadRoles();
    }, []);

    const loadUsers = async () => {
        try {
            const d = await api.get('/user');
            setUsers(d.users);
        } catch (e) {
            setErr(e.message);
        }
    };

    const loadRoles = async () => {
        try {
            const d = await api.get('/user/roles');
            setRoles(d.roles);
        } catch (e) {
            setErr(e.message);
        }
    };

    const toggleRole = (role) => {
        setForm((prev) => ({
            ...prev,
            roles: prev.roles.includes(role) ? prev.roles.filter((r) => r !== role) : [...prev.roles, role]
        }));
    };

    const createAccount = async () => {
        setErr('');
        setMsg('');
        setBusy(true);
        try {
            await api.post('/auth/register', form);
            setMsg('Account created.');
            setForm(EMPTY_FORM);
            loadUsers();
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    };

    const toggleActive = async (u) => {
        setErr('');
        try {
            await api.put(`/user/${u.id}/status`, { is_active: !u.is_active });
            loadUsers();
        } catch (e) {
            setErr(e.message);
        }
    };

    return (
        <>
            {err && <div className="alert error">{err}</div>}
            {msg && <div className="alert success">{msg}</div>}

            <div className="card">
                <h2>
                    <span className="dot" /> Create Account
                </h2>
                <div className="row">
                    <div className="field">
                        <label>Last name *</label>
                        <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                    </div>
                    <div className="field">
                        <label>First name *</label>
                        <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                    </div>
                </div>
                <div className="row">
                    <div className="field">
                        <label>Middle name</label>
                        <input value={form.middle_name} onChange={(e) => setForm({ ...form, middle_name: e.target.value })} />
                    </div>
                    <div className="field">
                        <label>Extra name</label>
                        <input value={form.extra_name} onChange={(e) => setForm({ ...form, extra_name: e.target.value })} />
                    </div>
                </div>
                <div className="row">
                    <div className="field">
                        <label>Email *</label>
                        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div className="field">
                        <label>Password *</label>
                        <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                    </div>
                </div>
                <div className="field">
                    <label>Roles</label>
                    <div className="tag-list">
                        {roles.map((r) => (
                            <button
                                type="button"
                                key={r.id}
                                className={`btn sm ${form.roles.includes(r.name) ? 'green' : 'ghost'}`}
                                onClick={() => toggleRole(r.name)}
                            >
                                {r.name}
                            </button>
                        ))}
                    </div>
                </div>
                <button className="btn green" disabled={busy} onClick={createAccount}>
                    {busy ? 'Creating…' : 'Create Account'}
                </button>
            </div>

            <div className="card">
                <h2>
                    <span className="dot" /> Accounts ({users.length})
                </h2>
                {users.length === 0 ? (
                    <div className="empty">No accounts.</div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Roles</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u.id}>
                                    <td>
                                        {u.first_name} {u.middle_name} {u.last_name}
                                    </td>
                                    <td>{u.email}</td>
                                    <td>
                                        <div className="tag-list">
                                            {u.roles.map((r) => (
                                                <span key={r} className="badge green">
                                                    {r}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge ${u.is_active ? 'blue' : 'red'}`}>
                                            {u.is_active ? 'active' : 'inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="btn sm danger" onClick={() => toggleActive(u)}>
                                            {u.is_active ? 'Deactivate' : 'Activate'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );
}
