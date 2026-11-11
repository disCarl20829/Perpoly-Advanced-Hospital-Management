import { useState, useEffect } from 'react';
import { api } from '../api.js';

const EMPTY_TEST = {
    name: '',
    category: '',
    default_price: 0,
    notes: '',
    is_active: true
};

const peso = (value) => `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

export default function Settings() {
    const [departments, setDepartments] = useState([]);
    const [tests, setTests] = useState([]);

    const [filters, setFilters] = useState({ category: '', search: '', active: '' });
    const [testForm, setTestForm] = useState(EMPTY_TEST);
    const [editingTestId, setEditingTestId] = useState(null);

    const [departmentName, setDepartmentName] = useState('');
    const [editingDeptId, setEditingDeptId] = useState(null);
    const [editingDeptName, setEditingDeptName] = useState('');
    const [showInactiveDepts, setShowInactiveDepts] = useState(false);

    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');
    const [busy, setBusy] = useState(false);

    // Cashier settings
    const [seniorRate, setSeniorRate] = useState('20');
    const [savingSenior, setSavingSenior] = useState(false);

    useEffect(() => {
        loadDepartments();
        loadSeniorRate();
    }, []);

    useEffect(() => {
        loadTests();
    }, [filters]);

    useEffect(() => {
        if (!testForm.category && departments.length > 0) {
            setTestForm((prev) => ({ ...prev, category: departments[0].name }));
        }
    }, [departments]);

    const loadDepartments = async () => {
        try {
            const d = await api.get('/settings/departments');
            setDepartments(d.departments);
        } catch (e) {
            setErr(e.message);
        }
    };

    const loadSeniorRate = async () => {
        try {
            const d = await api.get('/settings/senior-discount');
            setSeniorRate(String(Number(d.seniorDiscountRate ?? 20)));
        } catch (e) {
            setErr(e.message);
        }
    };

    const saveSeniorRate = async () => {
        setErr('');
        setMsg('');

        const rate = Number(seniorRate);
        if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
            setErr('Senior discount rate must be between 0 and 100.');
            return;
        }

        setSavingSenior(true);
        try {
            const d = await api.put('/settings/senior-discount', { senior_discount_rate: rate });
            setMsg(d.message);
            setSeniorRate(String(Number(d.seniorDiscountRate)));
        } catch (e) {
            setErr(e.message);
        } finally {
            setSavingSenior(false);
        }
    };

    const loadTests = async () => {
        const params = new URLSearchParams();
        if (filters.category) params.set('category', filters.category);
        if (filters.search) params.set('search', filters.search);
        if (filters.active) params.set('active', filters.active);

        const qs = params.toString();
        try {
            const d = await api.get(`/settings/tests${qs ? `?${qs}` : ''}`);
            setTests(d.tests);
        } catch (e) {
            setErr(e.message);
        }
    };

    const refresh = async () => {
        await Promise.all([loadDepartments(), loadTests()]);
    };

    // ---------- Departments ----------

    const createDepartment = async () => {
        setErr('');
        setMsg('');
        setBusy(true);
        try {
            const d = await api.post('/settings/departments', { name: departmentName });
            setMsg(d.message);
            setDepartmentName('');
            await refresh();
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    };

    const startRenameDepartment = (department) => {
        setEditingDeptId(department.id);
        setEditingDeptName(department.name);
    };

    const cancelRenameDepartment = () => {
        setEditingDeptId(null);
        setEditingDeptName('');
    };

    const saveRenameDepartment = async () => {
        setErr('');
        setMsg('');
        setBusy(true);
        try {
            const previous = departments.find((d) => d.id === editingDeptId);
            const d = await api.put(`/settings/departments/${editingDeptId}`, { name: editingDeptName });
            const newName = d.department?.name || editingDeptName.trim();

            if (previous && previous.name !== newName) {
                if (filters.category === previous.name) {
                    setFilters((f) => ({ ...f, category: newName }));
                }
                setTestForm((f) => (f.category === previous.name ? { ...f, category: newName } : f));
            }

            setMsg(`${d.message}. Its tests were moved to the new name.`);
            cancelRenameDepartment();
            await refresh();
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    };

    const toggleDepartment = async (department) => {
        setErr('');
        setMsg('');
        setBusy(true);
        try {
            const d = await api.put(`/settings/departments/${department.id}`, {
                is_active: !department.is_active
            });
            setMsg(
                d.department.is_active
                    ? `${d.department.name} activated. Its tests stay inactive until you enable them.`
                    : `${d.department.name} deactivated. Its tests were hidden too.`
            );
            await refresh();
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    };

    const removeDepartment = async (department) => {
        if (!window.confirm(`Delete "${department.name}"? If it is in use it will be deactivated instead.`)) return;

        setErr('');
        setMsg('');
        setBusy(true);
        try {
            const d = await api.del(`/settings/departments/${department.id}`);
            setMsg(d.message);
            await refresh();
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    };

    // ---------- Tests ----------

    const startEditTest = (test) => {
        setEditingTestId(test.id);
        setTestForm({
            name: test.name,
            category: test.category,
            default_price: Number(test.default_price),
            notes: test.notes || '',
            is_active: test.is_active
        });
        document.getElementById('test-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const resetTestForm = () => {
        setEditingTestId(null);
        setTestForm({
            ...EMPTY_TEST,
            category: filters.category || departments[0]?.name || ''
        });
    };

    const submitTest = async () => {
        setErr('');
        setMsg('');
        setBusy(true);

        const payload = {
            name: testForm.name,
            category: testForm.category,
            default_price: Number(testForm.default_price),
            notes: testForm.notes.trim() ? testForm.notes.trim() : null,
            is_active: testForm.is_active
        };

        try {
            const d = editingTestId
                ? await api.put(`/settings/tests/${editingTestId}`, payload)
                : await api.post('/settings/tests', payload);

            setMsg(d.message);
            resetTestForm();
            await refresh();
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    };

    const toggleTest = async (test) => {
        setErr('');
        setMsg('');
        setBusy(true);
        try {
            await api.put(`/settings/tests/${test.id}`, { is_active: !test.is_active });
            await refresh();
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    };

    const removeTest = async (test) => {
        if (!window.confirm(`Delete "${test.name}"? If it has been used it will be deactivated instead.`)) return;

        setErr('');
        setMsg('');
        setBusy(true);
        try {
            const d = await api.del(`/settings/tests/${test.id}`);
            setMsg(d.message);
            await refresh();
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    };

    const visibleDepartments = departments.filter((d) => showInactiveDepts || d.is_active);

    return (
        <>
            {err && <div className="alert error">{err}</div>}
            {msg && <div className="alert success">{msg}</div>}

            {/* Cashier settings */}
            <div className="card">
                <h2>
                    <span className="dot" /> Cashier Settings
                </h2>
                <p className="muted" style={{ marginTop: 0 }}>
                    Applied automatically to patients marked as a senior citizen. Existing transactions keep the
                    rate they were created with.
                </p>

                <div className="row" style={{ alignItems: 'flex-end' }}>
                    <div className="field" style={{ maxWidth: 240, marginBottom: 0 }}>
                        <label>Senior citizen discount (%)</label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={seniorRate}
                            onChange={(e) => setSeniorRate(e.target.value)}
                        />
                    </div>
                    <button className="btn green" onClick={saveSeniorRate} disabled={savingSenior || busy}>
                        {savingSenior ? 'Saving…' : 'Save'}
                    </button>
                </div>

                <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>
                    Package examinations are not configured yet, so the PACKAGE row in sales reports is shown as
                    ₱0.00.
                </p>
            </div>

            {/* Departments */}
            <div className="card">
                <h2>
                    <span className="dot" /> Departments
                </h2>

                <label
                    className="muted"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 12 }}
                >
                    <input
                        type="checkbox"
                        checked={showInactiveDepts}
                        onChange={(e) => setShowInactiveDepts(e.target.checked)}
                        style={{ width: 'auto' }}
                    />
                    Show inactive legacy departments
                </label>

                <div className="row" style={{ alignItems: 'flex-end' }}>
                    <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                        <label>New department</label>
                        <input
                            placeholder="e.g. Laboratory, Ultrasound, X-Ray"
                            value={departmentName}
                            onChange={(e) => setDepartmentName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && createDepartment()}
                        />
                    </div>
                    <button className="btn green" disabled={busy || !departmentName.trim()} onClick={createDepartment}>
                        Add Department
                    </button>
                </div>

                <div style={{ marginTop: 16 }}>
                    {visibleDepartments.length === 0 ? (
                        <div className="empty">No departments yet.</div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Department</th>
                                    <th>Tests</th>
                                    <th>Status</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleDepartments.map((d) => (
                                    <tr key={d.id}>
                                        <td>
                                            {editingDeptId === d.id ? (
                                                <input
                                                    value={editingDeptName}
                                                    onChange={(e) => setEditingDeptName(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && saveRenameDepartment()}
                                                />
                                            ) : (
                                                d.name
                                            )}
                                        </td>
                                        <td>
                                            {d.active_test_count} active / {d.test_count} total
                                        </td>
                                        <td>
                                            <span className={`badge ${d.is_active ? 'green' : 'gray'}`}>
                                                {d.is_active ? 'active' : 'inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                {editingDeptId === d.id ? (
                                                    <>
                                                        <button className="btn sm green" disabled={busy} onClick={saveRenameDepartment}>
                                                            Save
                                                        </button>
                                                        <button className="btn sm ghost" disabled={busy} onClick={cancelRenameDepartment}>
                                                            Cancel
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button className="btn sm ghost" disabled={busy} onClick={() => startRenameDepartment(d)}>
                                                            Rename
                                                        </button>
                                                        <button className="btn sm" disabled={busy} onClick={() => toggleDepartment(d)}>
                                                            {d.is_active ? 'Deactivate' : 'Activate'}
                                                        </button>
                                                        <button className="btn sm danger" disabled={busy} onClick={() => removeDepartment(d)}>
                                                            Delete
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Tests */}
            <div className="card">
                <h2>
                    <span className="dot" /> Examinations &amp; Prices
                </h2>

                <div className="row" id="test-form">
                    <div className="field">
                        <label>Department</label>
                        <select
                            value={testForm.category}
                            onChange={(e) => setTestForm({ ...testForm, category: e.target.value })}
                        >
                            <option value="">— choose a department —</option>
                            {departments.map((d) => (
                                <option key={d.id} value={d.name}>
                                    {d.name}
                                    {d.is_active ? '' : ' (inactive)'}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="field">
                        <label>Examination name *</label>
                        <input
                            placeholder="e.g. CBC,PLT"
                            value={testForm.name}
                            onChange={(e) => setTestForm({ ...testForm, name: e.target.value })}
                        />
                    </div>
                </div>

                <div className="row">
                    <div className="field">
                        <label>Default price (₱)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={testForm.default_price}
                            onChange={(e) => setTestForm({ ...testForm, default_price: e.target.value })}
                        />
                    </div>
                    <div className="field">
                        <label>Note (optional)</label>
                        <input
                            placeholder="e.g. Send-out test (charge varies)"
                            value={testForm.notes}
                            onChange={(e) => setTestForm({ ...testForm, notes: e.target.value })}
                        />
                    </div>
                </div>

                <div className="field">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={testForm.is_active}
                            onChange={(e) => setTestForm({ ...testForm, is_active: e.target.checked })}
                            style={{ width: 'auto' }}
                        />
                        Active (visible in the cashier)
                    </label>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn green" disabled={busy || !testForm.name.trim() || !testForm.category} onClick={submitTest}>
                        {busy ? 'Saving…' : editingTestId ? 'Save Changes' : 'Add Examination'}
                    </button>
                    {editingTestId && (
                        <button className="btn ghost" disabled={busy} onClick={resetTestForm}>
                            Cancel
                        </button>
                    )}
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />

                <div className="row">
                    <div className="field">
                        <label>Filter by department</label>
                        <select
                            value={filters.category}
                            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                        >
                            <option value="">All departments</option>
                            {departments.map((d) => (
                                <option key={d.id} value={d.name}>
                                    {d.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="field">
                        <label>Search examination</label>
                        <input
                            placeholder="Type a name…"
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        />
                    </div>
                    <div className="field">
                        <label>Status</label>
                        <select
                            value={filters.active}
                            onChange={(e) => setFilters({ ...filters, active: e.target.value })}
                        >
                            <option value="">All</option>
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                        </select>
                    </div>
                </div>

                {tests.length === 0 ? (
                    <div className="empty">No examinations match these filters.</div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Examination</th>
                                <th>Department</th>
                                <th>Default price</th>
                                <th>Note</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {tests.map((t) => (
                                <tr key={t.id}>
                                    <td>{t.name}</td>
                                    <td>
                                        <span className={`badge ${t.department_is_active ? 'blue' : 'gray'}`}>
                                            {t.category}
                                        </span>
                                    </td>
                                    <td>{peso(t.default_price)}</td>
                                    <td className="muted">{t.notes || '—'}</td>
                                    <td>
                                        <span className={`badge ${t.is_active ? 'green' : 'gray'}`}>
                                            {t.is_active ? 'active' : 'inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            <button className="btn sm ghost" disabled={busy} onClick={() => startEditTest(t)}>
                                                Edit
                                            </button>
                                            <button className="btn sm" disabled={busy} onClick={() => toggleTest(t)}>
                                                {t.is_active ? 'Deactivate' : 'Activate'}
                                            </button>
                                            <button className="btn sm danger" disabled={busy} onClick={() => removeTest(t)}>
                                                Delete
                                            </button>
                                        </div>
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
