import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api.js';

const EMPTY_PATIENT = {
    last_name: '',
    first_name: '',
    middle_name: '',
    extra_name: '',
    gender: '',
    birthdate: '',
    address: '',
    contact_no: '',
    is_senior: false
};

const patientName = (p) =>
    [p.first_name, p.middle_name, p.last_name, p.extra_name].filter(Boolean).join(' ');

const MODE_OPTIONS = [
    { value: 'cash', label: 'Cash' },
    { value: 'paymaya', label: 'PayMaya' },
    { value: 'gotyme', label: 'GoTyme' },
    { value: 'gcash', label: 'GCash' },
    { value: 'credit_card', label: 'Credit card' },
    { value: 'debit_card', label: 'Debit card' },
    { value: 'bank_transfer', label: 'Bank transfer' }
];

const MODE_LABEL = Object.fromEntries(MODE_OPTIONS.map((m) => [m.value, m.label]));

const lineTotal = (item) => Number(item.unit_price) * Number(item.qty);
const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

function ServicePicker({ types, departments, onPick }) {
    const [department, setDepartment] = useState('All');
    const [query, setQuery] = useState('');

    const activeDepartments = departments.filter((d) => d.is_active);

    const filtered = types.filter((t) => {
        const matchesDepartment = department === 'All' || t.category === department;
        const matchesQuery = !query || t.name.toLowerCase().includes(query.trim().toLowerCase());
        return matchesDepartment && matchesQuery;
    });

    return (
        <div className="service-picker">
            <input
                placeholder="Search examinations…"
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    if (e.target.value.trim()) setDepartment('All');
                }}
            />

            <div className="service-tabs">
                <button
                    type="button"
                    className={department === 'All' ? 'active' : ''}
                    onClick={() => setDepartment('All')}
                >
                    All
                </button>
                {activeDepartments.map((d) => (
                    <button
                        key={d.id}
                        type="button"
                        className={department === d.name ? 'active' : ''}
                        onClick={() => setDepartment(d.name)}
                    >
                        {d.name}
                    </button>
                ))}
            </div>

            <div className="service-buttons">
                {filtered.length === 0 ? (
                    <div className="empty">No examinations found.</div>
                ) : (
                    filtered.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            className="service-btn"
                            title={t.notes || ''}
                            onClick={() => onPick(t)}
                        >
                            <span className="service-name">{t.name}</span>
                            <span className={`service-price ${t.notes ? 'note' : ''}`}>
                                {t.notes ? t.notes : `₱${Number(t.default_price || 0).toFixed(2)}`}
                            </span>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}

export default function Cashier() {
    const [search, setSearch] = useState('');
    const [patients, setPatients] = useState([]);
    const [recentPatients, setRecentPatients] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [patientsLoading, setPatientsLoading] = useState(true);
    const [searchLoading, setSearchLoading] = useState(false);
    const [patientListStatus, setPatientListStatus] = useState('checking');
    const [patientListError, setPatientListError] = useState('');
    const [searchError, setSearchError] = useState('');
    const patientRequestSeq = useRef(0);
    const searchRequestSeq = useRef(0);
    const [patientForm, setPatientForm] = useState(EMPTY_PATIENT);
    const [selectedPatient, setSelectedPatient] = useState(null);

    const [types, setTypes] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [items, setItems] = useState([]);
    const [status, setStatus] = useState('unpaid');
    const [mode, setMode] = useState('cash');
    const [transactions, setTransactions] = useState([]);
    const [seniorRate, setSeniorRate] = useState(20);

    // Edit panel state
    const [editing, setEditing] = useState(null);
    const [editStatus, setEditStatus] = useState('unpaid');
    const [editMode, setEditMode] = useState('cash');
    const [editItems, setEditItems] = useState([]);

    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');
    const [busy, setBusy] = useState(false);

    // A patient-directory endpoint is separate from the name search endpoint.
    // /cashier/patients/search rejects blank or one-character queries.
    // GET /cashier/patients must return { patients: [...] } for a complete directory.
    const loadPatients = useCallback(async ({ silent = false } = {}) => {
        const requestId = ++patientRequestSeq.current;
        if (!silent) setPatientsLoading(true);
        try {
            const data = await api.get('/cashier/patients');
            const rows = Array.isArray(data) ? data : data?.patients;
            if (!Array.isArray(rows)) {
                throw new Error('GET /cashier/patients must return a patients array.');
            }
            if (requestId === patientRequestSeq.current) {
                setPatients(rows);
                setPatientListStatus('available');
                setPatientListError('');
            }
        } catch (error) {
            if (requestId === patientRequestSeq.current) {
                setPatientListStatus('unavailable');
                setPatientListError(error.message || 'Unable to load the full patient directory.');
            }
        } finally {
            if (requestId === patientRequestSeq.current) setPatientsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTypes();
        loadDepartments();
        loadTransactions();
        loadSeniorRate();
    }, []);

    useEffect(() => {
        void loadPatients();
        return () => {
            patientRequestSeq.current += 1;
        };
    }, [loadPatients]);

    // Poll only when the backend supports a full patient directory.
    // This prevents the repeated 400 errors from V7.
    useEffect(() => {
        if (patientListStatus !== 'available') return;
        const timer = window.setInterval(() => {
            if (!document.hidden) void loadPatients({ silent: true });
        }, 15000);
        return () => window.clearInterval(timer);
    }, [patientListStatus, loadPatients]);

    // When the list route is missing, keep the old working search behavior.
    // Only send searches with 2+ characters, as required by the backend.
    useEffect(() => {
        const query = search.trim();
        if (patientListStatus !== 'unavailable' || query.length < 2) {
            searchRequestSeq.current += 1;
            setSearchResults([]);
            setSearchError('');
            setSearchLoading(false);
            return;
        }

        const requestId = ++searchRequestSeq.current;
        setSearchLoading(true);
        setSearchError('');
        const timer = window.setTimeout(async () => {
            try {
                const data = await api.get(`/cashier/patients/search?name=${encodeURIComponent(query)}`);
                if (!Array.isArray(data?.patients)) {
                    throw new Error('Unexpected patient search response.');
                }
                if (requestId === searchRequestSeq.current) {
                    setSearchResults(data.patients);
                    setSearchError('');
                }
            } catch (error) {
                if (requestId === searchRequestSeq.current) {
                    setSearchResults([]);
                    setSearchError(error.message || 'Unable to search patients.');
                }
            } finally {
                if (requestId === searchRequestSeq.current) setSearchLoading(false);
            }
        }, 300);
        return () => {
            window.clearTimeout(timer);
            searchRequestSeq.current += 1;
        };
    }, [search, patientListStatus]);

    // Keep patient records created in this session, even if the all-patients
    // endpoint is unavailable or a refresh happens before the server catches up.
    const rowsById = new Map();
    const fromServer = patientListStatus === 'available'
        ? patients
        : search.trim().length >= 2 ? searchResults : [];
    for (const patient of [...fromServer, ...recentPatients]) {
        if (patient?.id != null) rowsById.set(String(patient.id), patient);
    }
    const allVisibleCandidates = [...rowsById.values()];
    const queryTerms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const visiblePatients = allVisibleCandidates
        .filter((p) => {
            const searchable = [p.first_name, p.middle_name, p.last_name,
                p.extra_name, patientName(p), p.contact_no].filter(Boolean).join(' ').toLowerCase();
            return queryTerms.every((term) => searchable.includes(term));
        })
        .sort((a, b) => patientName(a).localeCompare(patientName(b)));

    const loadSeniorRate = async () => {
        try {
            const d = await api.get('/settings/senior-discount');
            setSeniorRate(Number(d.seniorDiscountRate ?? 20));
        } catch {
            // The backend still applies the correct rate when the transaction
            // is created; this preview can safely fall back to 20%.
            setSeniorRate(20);
        }
    };

    const loadTypes = async () => {
        try {
            const d = await api.get('/cashier/transaction-types?active=true');
            setTypes(d.transactionTypes);
        } catch (e) {
            setErr(e.message);
        }
    };

    const loadDepartments = async () => {
        try {
            const d = await api.get('/laboratory/laboratories');
            setDepartments(d.laboratories);
        } catch (e) {
            setErr(e.message);
        }
    };

    const loadTransactions = async () => {
        try {
            const d = await api.get('/cashier/transactions');
            setTransactions(d.transactions);
        } catch (e) {
            setErr(e.message);
        }
    };

    const createPatient = async () => {
        setErr('');
        setMsg('');
        const lastName = patientForm.last_name.trim();
        const firstName = patientForm.first_name.trim();
        if (!lastName || !firstName) {
            setErr('Last name and first name are required.');
            return;
        }

        setBusy(true);
        try {
            const d = await api.post('/cashier/patients', {
                ...patientForm,
                last_name: lastName,
                first_name: firstName
            });
            const createdPatient = d.patient;
            if (!createdPatient?.id) {
                throw new Error('Patient was saved, but the API did not return the patient record.');
            }

            // Always display the created patient, even without a directory route.
            // This is session-only state; the database remains authoritative.
            setRecentPatients((current) => [
                createdPatient,
                ...current.filter((p) => String(p.id) !== String(createdPatient.id))
            ]);
            setSelectedPatient(createdPatient);
            setSearch('');
            setMsg('Patient created and added to the list.');
            setPatientForm({ ...EMPTY_PATIENT });

            // Refresh only if the backend exposes the full directory endpoint.
            if (patientListStatus === 'available') {
                void loadPatients({ silent: true });
            }
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    };

    const addItem = (type) => {
        if (!type) return;
        setItems((prev) => {
            const found = prev.find((i) => i.transaction_type_id === type.id);
            if (found) {
                return prev.map((i) =>
                    i.transaction_type_id === type.id ? { ...i, qty: i.qty + 1 } : i
                );
            }
            return [
                ...prev,
                {
                    transaction_type_id: type.id,
                    name: type.name,
                    notes: type.notes || '',
                    qty: 1,
                    unit_price: Number(type.default_price || 0)
                }
            ];
        });
    };

    const setItemQty = (id, qty) =>
        setItems((prev) => prev.map((i) => (i.transaction_type_id === id ? { ...i, qty: Number(qty) } : i)));

    const setItemPrice = (id, price) =>
        setItems((prev) =>
            prev.map((i) => (i.transaction_type_id === id ? { ...i, unit_price: Number(price) } : i))
        );

    const removeItem = (id) => setItems((prev) => prev.filter((i) => i.transaction_type_id !== id));

    const total = items.reduce((s, i) => s + i.unit_price * i.qty, 0);
    const seniorDiscount = selectedPatient?.is_senior
        ? roundMoney(total * Number(seniorRate) / 100)
        : 0;
    const netTotal = roundMoney(total - seniorDiscount);

    const submitTransaction = async () => {
        setErr('');
        setMsg('');
        if (!selectedPatient) {
            setErr('Select a patient first.');
            return;
        }
        if (items.length === 0) {
            setErr('Add at least one service.');
            return;
        }
        setBusy(true);
        try {
            const payload = {
                patient_id: selectedPatient.id,
                status,
                mode_of_payment: mode,
                items: items.map((i) => ({
                    transaction_type_id: i.transaction_type_id,
                    qty: i.qty,
                    unit_price: i.unit_price
                }))
            };
            const d = await api.post('/cashier/transactions', payload);
            const created = d.transaction;
            const discountNote = created.is_senior && Number(created.discount_amount) > 0
                ? ` Senior discount ₱${Number(created.discount_amount).toFixed(2)} applied.`
                : '';
            setMsg(`Receipt ${created.receipt_no} created.${discountNote}`);
            setItems([]);
            setMode('cash');
            loadTransactions();
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    };

    const editSubtotal = editItems.reduce((s, i) => s + lineTotal(i), 0);
    const editDiscountRate = Number(editing?.discount_rate || 0);
    const editDiscount = editing?.is_senior
        ? roundMoney(editSubtotal * editDiscountRate / 100)
        : 0;
    const editNet = roundMoney(editSubtotal - editDiscount);

    const openEditor = async (id) => {
        setErr('');
        setMsg('');
        try {
            const d = await api.get(`/cashier/transactions/${id}`);
            const t = d.transaction;
            setEditing(t);
            setEditStatus(t.status);
            setEditMode(t.mode_of_payment || 'cash');
            setEditItems(
                (t.items || []).map((i) => ({
                    id: i.id,
                    transaction_type_id: i.transaction_type_id,
                    name: i.transaction_type_name || 'Service',
                    qty: Number(i.qty),
                    unit_price: Number(i.unit_price)
                }))
            );
        } catch (e) {
            setErr(e.message);
        }
    };

    const closeEditor = () => {
        setEditing(null);
        setEditItems([]);
    };

    const addEditItem = (type) => {
        if (!type) return;
        setEditItems((prev) => [
            ...prev,
            {
                id: null,
                key: `${type.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                transaction_type_id: type.id,
                name: type.name,
                notes: type.notes || '',
                qty: 1,
                unit_price: Number(type.default_price || 0)
            }
        ]);
    };

    const setEditItem = (index, field, value) =>
        setEditItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));

    const removeEditItem = (index) =>
        setEditItems((prev) => prev.filter((_, i) => i !== index));

    const saveEdits = async () => {
        if (!editing) return;
        if (editItems.length === 0) {
            setErr('A transaction must keep at least one item.');
            return;
        }

        setBusy(true);
        setErr('');
        setMsg('');
        try {
            const id = editing.id;

            // 1. Status / mode of payment
            const statusChanged = editStatus !== editing.status;
            const modeChanged = editMode !== (editing.mode_of_payment || 'cash');
            if (statusChanged || modeChanged) {
                await api.put(`/cashier/transactions/${id}`, {
                    status: editStatus,
                    mode_of_payment: editMode
                });
            }

            const keptIds = new Set(editItems.filter((i) => i.id).map((i) => i.id));

            // 2. Remove deleted items first (lab results can block removal)
            for (const original of editing.items || []) {
                if (!keptIds.has(original.id)) {
                    await api.del(`/cashier/transactions/${id}/items/${original.id}`);
                }
            }

            // 3. Update changed items
            for (const item of editItems.filter((i) => i.id)) {
                const original = (editing.items || []).find((o) => o.id === item.id);
                if (!original) continue;

                const changed =
                    Number(original.qty) !== Number(item.qty) ||
                    Number(original.unit_price) !== Number(item.unit_price) ||
                    original.transaction_type_id !== item.transaction_type_id;

                if (changed) {
                    await api.put(`/cashier/transactions/${id}/items/${item.id}`, {
                        transaction_type_id: item.transaction_type_id,
                        qty: Number(item.qty),
                        unit_price: Number(item.unit_price)
                    });
                }
            }

            // 4. Add new items
            for (const item of editItems.filter((i) => !i.id)) {
                await api.post(`/cashier/transactions/${id}/items`, {
                    transaction_type_id: item.transaction_type_id,
                    qty: Number(item.qty),
                    unit_price: Number(item.unit_price)
                });
            }

            setMsg(`Transaction ${editing.receipt_no} updated. Income was synced automatically.`);
            closeEditor();
            loadTransactions();
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            {err && <div className="alert error">{err}</div>}
            {msg && <div className="alert success">{msg}</div>}

            <div className="grid cols-4" style={{ marginBottom: 20 }}>
                <div className="stat">
                    <div className="label">Transactions today</div>
                    <div className="value">{transactions.length}</div>
                </div>
                <div className="stat green">
                    <div className="label">Paid</div>
                    <div className="value">{transactions.filter((t) => t.status === 'paid').length}</div>
                </div>
                <div className="stat warn">
                    <div className="label">Unpaid</div>
                    <div className="value">{transactions.filter((t) => t.status === 'unpaid').length}</div>
                </div>
                <div className="stat danger">
                    <div className="label">Revenue</div>
                    <div className="value">
                        ₱
                        {transactions
                            .reduce((s, t) => s + Number(t.total_amount || 0), 0)
                            .toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            <div className="grid cols-2">
                {/* Find patient */}
                <div className="card">
                    <h2>
                        <span className="dot" /> Find Patient
                    </h2>
                    <div className="flex-between gap-8" style={{ marginBottom: 8 }}>
                        <input
                            aria-label="Filter patients"
                            placeholder={patientListStatus === 'available'
                                ? 'Filter all patients by name…'
                                : 'Search patients (at least 2 characters)…'}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <button
                            type="button"
                            className="btn sm"
                            onClick={() => void loadPatients()}
                            disabled={patientsLoading}
                            title="Retry loading the full patient list"
                        >
                            {patientsLoading ? 'Loading…' : 'Refresh'}
                        </button>
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
                        {patientListStatus === 'available'
                            ? `Showing ${visiblePatients.length} of ${allVisibleCandidates.length} patients · Updates every 15 seconds`
                            : patientListStatus === 'checking'
                                ? 'Checking the patient directory…'
                                : `Showing ${visiblePatients.length} matching patients · Name search is available`}
                    </div>
                    {patientListStatus === 'unavailable' && (
                        <div role="status" style={{ marginBottom: 10, padding: '10px 12px',
                            borderRadius: 9, border: '1px solid #eed3a6',
                            background: '#fffaf0', color: '#72511e', fontSize: 12 }}>
                            <strong>Full patient list is not available from the API.</strong>{' '}
                            Search existing patients using 2 or more characters.
                            To show everyone automatically, the backend must support
                            <code> GET /cashier/patients</code> returning a patient array.
                            {patientListError && (
                                <div style={{ marginTop: 4, opacity: 0.8 }}>
                                    Server response: {patientListError}
                                </div>
                            )}
                        </div>
                    )}
                    {searchError && (
                        <div className="alert error" role="alert" style={{ marginBottom: 10 }}>
                            Patient search: {searchError}
                        </div>
                    )}
                    {patientListStatus === 'checking' && patientsLoading && allVisibleCandidates.length === 0 ? (
                        <div className="empty">Loading patient records…</div>
                    ) : searchLoading && visiblePatients.length === 0 ? (
                        <div className="empty">Searching patients…</div>
                    ) : visiblePatients.length === 0 ? (
                        <div className="empty">
                            {patientListStatus === 'unavailable' && search.trim().length < 2
                                ? 'Enter at least 2 characters to search existing patients.'
                                : search.trim()
                                    ? 'No patients match your search.'
                                    : 'No patients found.'}
                        </div>
                    ) : (
                        <div style={{ maxHeight: 280, overflowY: 'auto', overflowX: 'auto' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Gender</th>
                                        <th>Contact</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visiblePatients.map((p) => (
                                        <tr key={p.id}>
                                            <td>
                                                {patientName(p)}
                                                {p.is_senior && <span className="badge blue" style={{ marginLeft: 6 }}>Senior</span>}
                                            </td>
                                            <td>{p.gender || '—'}</td>
                                            <td>{p.contact_no || '—'}</td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="btn sm green"
                                                    onClick={() => setSelectedPatient(p)}
                                                >
                                                    Select
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {selectedPatient && (
                        <div className="alert success" style={{ marginTop: 12 }}>
                            Selected: <strong>{patientName(selectedPatient)}</strong>
                            {selectedPatient.is_senior && (
                                <div className="muted" style={{ marginTop: 4 }}>
                                    Senior citizen — {Number(seniorRate).toFixed(2)}% discount will be applied.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* New patient */}
                <div className="card">
                    <h2>
                        <span className="dot" /> New Patient
                    </h2>
                    <div className="row">
                        <div className="field">
                            <label>Last name *</label>
                            <input
                                value={patientForm.last_name}
                                onChange={(e) => setPatientForm({ ...patientForm, last_name: e.target.value })}
                            />
                        </div>
                        <div className="field">
                            <label>First name *</label>
                            <input
                                value={patientForm.first_name}
                                onChange={(e) => setPatientForm({ ...patientForm, first_name: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="row">
                        <div className="field">
                            <label>Middle name</label>
                            <input
                                value={patientForm.middle_name}
                                onChange={(e) => setPatientForm({ ...patientForm, middle_name: e.target.value })}
                            />
                        </div>
                        <div className="field">
                            <label>Extra name</label>
                            <input
                                value={patientForm.extra_name}
                                onChange={(e) => setPatientForm({ ...patientForm, extra_name: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="row">
                        <div className="field">
                            <label>Gender</label>
                            <select
                                value={patientForm.gender}
                                onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                            >
                                <option value="">—</option>
                                <option>Male</option>
                                <option>Female</option>
                                <option>Other</option>
                            </select>
                        </div>
                        <div className="field">
                            <label>Birthdate</label>
                            <input
                                type="date"
                                value={patientForm.birthdate}
                                onChange={(e) => setPatientForm({ ...patientForm, birthdate: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="field">
                        <label>Address</label>
                        <input
                            value={patientForm.address}
                            onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })}
                        />
                    </div>
                    <div className="field">
                        <label>Contact no.</label>
                        <input
                            value={patientForm.contact_no}
                            onChange={(e) => setPatientForm({ ...patientForm, contact_no: e.target.value })}
                        />
                    </div>
                    <label
                        className="muted"
                        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 14 }}
                    >
                        <input
                            type="checkbox"
                            checked={patientForm.is_senior}
                            onChange={(e) => setPatientForm({ ...patientForm, is_senior: e.target.checked })}
                            style={{ width: 'auto' }}
                        />
                        Senior citizen (discount applies)
                    </label>
                    <button className="btn" onClick={createPatient} disabled={busy}>
                        {busy ? 'Creating…' : 'Create Patient'}
                    </button>
                </div>
            </div>

            {/* New transaction */}
            <div className="card">
                <h2>
                    <span className="dot" /> New Transaction
                </h2>

                <div className="row">
                    <div className="field">
                        <label>Patient</label>
                        <input value={selectedPatient ? patientName(selectedPatient) : ''} readOnly placeholder="Select a patient above" />
                    </div>
                    <div className="field">
                        <label>Payment status</label>
                        <select value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="unpaid">Unpaid</option>
                            <option value="paid">Paid</option>
                        </select>
                    </div>
                    <div className="field">
                        <label>Mode of payment</label>
                        <select value={mode} onChange={(e) => setMode(e.target.value)}>
                            {MODE_OPTIONS.map((m) => (
                                <option key={m.value} value={m.value}>
                                    {m.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="field">
                    <label>Add examination</label>
                    <ServicePicker types={types} departments={departments} onPick={addItem} />
                </div>

                {items.length === 0 ? (
                    <div className="empty">No services added yet.</div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Service</th>
                                <th>Qty</th>
                                <th>Unit price</th>
                                <th>Amount</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((i) => (
                                <tr key={i.transaction_type_id}>
                                    <td>
                                        {i.name}
                                        {i.notes && <div className="muted" style={{ fontSize: 11 }}>{i.notes}</div>}
                                    </td>
                                    <td style={{ width: 90 }}>
                                        <input type="number" min="1" value={i.qty} onChange={(e) => setItemQty(i.transaction_type_id, e.target.value)} />
                                    </td>
                                    <td style={{ width: 130 }}>
                                        <input type="number" min="0" step="0.01" value={i.unit_price} onChange={(e) => setItemPrice(i.transaction_type_id, e.target.value)} />
                                    </td>
                                    <td>₱{(i.unit_price * i.qty).toFixed(2)}</td>
                                    <td>
                                        <button className="btn sm danger" onClick={() => removeItem(i.transaction_type_id)}>
                                            ✕
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {selectedPatient?.is_senior && (
                    <div style={{ marginTop: 14 }}>
                        <div className="flex-between">
                            <div className="muted">Subtotal</div>
                            <div>₱{total.toFixed(2)}</div>
                        </div>
                        <div className="flex-between">
                            <div className="muted">
                                Senior discount ({Number(seniorRate).toFixed(2)}%)
                            </div>
                            <div>-₱{seniorDiscount.toFixed(2)}</div>
                        </div>
                    </div>
                )}

                <div className="flex-between" style={{ marginTop: 14 }}>
                    <div className="muted">Total</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--blue-dark)' }}>₱{netTotal.toFixed(2)}</div>
                </div>

                <button className="btn green" style={{ marginTop: 14 }} disabled={busy} onClick={submitTransaction}>
                    {busy ? 'Saving…' : 'Create Transaction'}
                </button>
            </div>

            {/* Edit transaction */}
            {editing && (
                <div className="card">
                    <h2>
                        <span className="dot" /> Edit Transaction — {editing.receipt_no}
                    </h2>

                    <div className="row">
                        <div className="field">
                            <label>Patient</label>
                            <input value={editing.patient_name || ''} readOnly />
                            {editing.is_senior && (
                                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                                    <span className="badge blue">Senior</span>{' '}
                                    {Number(editing.discount_rate || 0).toFixed(2)}% discount
                                </div>
                            )}
                        </div>
                        <div className="field">
                            <label>Payment status</label>
                            <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                                <option value="unpaid">Unpaid</option>
                                <option value="paid">Paid</option>
                            </select>
                        </div>
                        <div className="field">
                            <label>Mode of payment</label>
                            <select value={editMode} onChange={(e) => setEditMode(e.target.value)}>
                                {MODE_OPTIONS.map((m) => (
                                    <option key={m.value} value={m.value}>
                                        {m.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="field">
                        <label>Add examination</label>
                        <ServicePicker types={types} departments={departments} onPick={addEditItem} />
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Service</th>
                                <th>Qty</th>
                                <th>Unit price</th>
                                <th>Amount</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {editItems.map((item, index) => (
                                <tr key={item.id || item.key}>
                                    <td>
                                        {item.name}
                                        {item.notes && <div className="muted" style={{ fontSize: 11 }}>{item.notes}</div>}
                                    </td>
                                    <td style={{ width: 90 }}>
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.qty}
                                            onChange={(e) => setEditItem(index, 'qty', Number(e.target.value))}
                                        />
                                    </td>
                                    <td style={{ width: 130 }}>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={item.unit_price}
                                            onChange={(e) => setEditItem(index, 'unit_price', Number(e.target.value))}
                                        />
                                    </td>
                                    <td>₱{lineTotal(item).toFixed(2)}</td>
                                    <td>
                                        <button
                                            className="btn sm danger"
                                            onClick={() => removeEditItem(index)}
                                            disabled={editItems.length <= 1}
                                            title={editItems.length <= 1 ? 'A transaction must keep at least one item' : 'Remove'}
                                        >
                                            ✕
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {editing.is_senior && (
                        <div style={{ marginTop: 14 }}>
                            <div className="flex-between">
                                <div className="muted">Subtotal</div>
                                <div>₱{editSubtotal.toFixed(2)}</div>
                            </div>
                            <div className="flex-between">
                                <div className="muted">
                                    Senior discount ({editDiscountRate.toFixed(2)}%)
                                </div>
                                <div>-₱{editDiscount.toFixed(2)}</div>
                            </div>
                        </div>
                    )}

                    <div className="flex-between" style={{ marginTop: 14 }}>
                        <div className="muted">Total (recalculated from items)</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--blue-dark)' }}>
                            ₱{editNet.toFixed(2)}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                        <button className="btn green" onClick={saveEdits} disabled={busy}>
                            {busy ? 'Saving…' : 'Save Changes'}
                        </button>
                        <button className="btn ghost" onClick={closeEditor} disabled={busy}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Recent transactions */}
            <div className="card">
                <h2>
                    <span className="dot" /> Recent Transactions
                </h2>
                {transactions.length === 0 ? (
                    <div className="empty">No transactions yet.</div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Receipt</th>
                                <th>Patient</th>
                                <th>Status</th>
                                <th>Mode</th>
                                <th>Total</th>
                                <th>Issued</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map((t) => (
                                <tr key={t.id}>
                                    <td>{t.receipt_no}</td>
                                    <td>
                                        {t.patient_name}
                                        {t.is_senior && <span className="badge blue" style={{ marginLeft: 6 }}>Senior</span>}
                                    </td>
                                    <td>
                                        <span className={`badge ${t.status === 'paid' ? 'green' : 'warn'}`}>{t.status}</span>
                                    </td>
                                    <td>{MODE_LABEL[t.mode_of_payment] || t.mode_of_payment}</td>
                                    <td>
                                        ₱{Number(t.total_amount).toFixed(2)}
                                        {Number(t.discount_amount) > 0 && (
                                            <div className="muted" style={{ fontSize: 11 }}>
                                                -₱{Number(t.discount_amount).toFixed(2)} senior
                                            </div>
                                        )}
                                    </td>
                                    <td>{new Date(t.issued_at).toLocaleString()}</td>
                                    <td>
                                        <button className="btn sm" onClick={() => openEditor(t.id)}>
                                            Edit
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
