import { useState, useEffect } from 'react';
import { api } from '../api.js';

const EMPTY_PATIENT = {
    last_name: '',
    first_name: '',
    middle_name: '',
    extra_name: '',
    gender: '',
    birthdate: '',
    address: '',
    contact_no: ''
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

export default function Cashier() {
    const [search, setSearch] = useState('');
    const [patients, setPatients] = useState([]);
    const [patientForm, setPatientForm] = useState(EMPTY_PATIENT);
    const [selectedPatient, setSelectedPatient] = useState(null);

    const [types, setTypes] = useState([]);
    const [items, setItems] = useState([]);
    const [status, setStatus] = useState('unpaid');
    const [mode, setMode] = useState('cash');
    const [transactions, setTransactions] = useState([]);

    // Edit panel state
    const [editing, setEditing] = useState(null);
    const [editStatus, setEditStatus] = useState('unpaid');
    const [editMode, setEditMode] = useState('cash');
    const [editItems, setEditItems] = useState([]);

    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        loadTypes();
        loadTransactions();
    }, []);

    const loadTypes = async () => {
        try {
            const d = await api.get('/cashier/transaction-types');
            setTypes(d.transactionTypes);
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

    const doSearch = async () => {
        setErr('');
        try {
            const d = await api.get(`/cashier/patients/search?name=${encodeURIComponent(search)}`);
            setPatients(d.patients);
        } catch (e) {
            setErr(e.message);
        }
    };

    const createPatient = async () => {
        setErr('');
        setMsg('');
        try {
            const d = await api.post('/cashier/patients', patientForm);
            setMsg('Patient created.');
            setSelectedPatient(d.patient);
            setPatientForm(EMPTY_PATIENT);
        } catch (e) {
            setErr(e.message);
        }
    };

    const addItem = (type) => {
        setItems((prev) => {
            const found = prev.find((i) => i.transaction_type_id === type.id);
            if (found) {
                return prev.map((i) =>
                    i.transaction_type_id === type.id ? { ...i, qty: i.qty + 1 } : i
                );
            }
            return [...prev, { transaction_type_id: type.id, name: type.name, qty: 1, unit_price: 0 }];
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
            setMsg(`Receipt ${d.transaction.receipt_no} created.`);
            setItems([]);
            setMode('cash');
            loadTransactions();
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    };

    const editTotal = editItems.reduce((s, i) => s + lineTotal(i), 0);

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
                qty: 1,
                unit_price: 0
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
                    <div className="flex-between gap-8" style={{ marginBottom: 12 }}>
                        <input
                            placeholder="Search by name…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                        />
                        <button className="btn sm" onClick={doSearch}>
                            Search
                        </button>
                    </div>

                    {patients.length === 0 ? (
                        <div className="empty">No patients found.</div>
                    ) : (
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
                                {patients.map((p) => (
                                    <tr key={p.id}>
                                        <td>{patientName(p)}</td>
                                        <td>{p.gender || '—'}</td>
                                        <td>{p.contact_no || '—'}</td>
                                        <td>
                                            <button
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
                    )}

                    {selectedPatient && (
                        <div className="alert success" style={{ marginTop: 12 }}>
                            Selected: <strong>{patientName(selectedPatient)}</strong>
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
                    <button className="btn" onClick={createPatient}>
                        Create Patient
                    </button>
                </div>
            </div>

            {/* New transaction */}
            <div className="card">
                <h2>
                    <span className="dot" /> New Transaction
                </h2>

                <div className="grid cols-2">
                    <div>
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
                    <div>
                        <div className="field">
                            <label>Add service</label>
                            <select onChange={(e) => e.target.value && addItem(types.find((t) => t.id === e.target.value))} value="">
                                <option value="">— choose a service —</option>
                                {types.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.name} ({t.category})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
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
                                    <td>{i.name}</td>
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

                <div className="flex-between" style={{ marginTop: 14 }}>
                    <div className="muted">Total</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--blue-dark)' }}>₱{total.toFixed(2)}</div>
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

                    <div className="grid cols-2">
                        <div>
                            <div className="field">
                                <label>Patient</label>
                                <input value={editing.patient_name || ''} readOnly />
                            </div>
                            <div className="row">
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
                        </div>
                        <div>
                            <div className="field">
                                <label>Add service</label>
                                <select
                                    value=""
                                    onChange={(e) => {
                                        addEditItem(types.find((t) => t.id === e.target.value));
                                        e.target.value = '';
                                    }}
                                >
                                    <option value="">— choose a service —</option>
                                    {types.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name} ({t.category})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
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
                                    <td>{item.name}</td>
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

                    <div className="flex-between" style={{ marginTop: 14 }}>
                        <div className="muted">Total (recalculated from items)</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--blue-dark)' }}>
                            ₱{editTotal.toFixed(2)}
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
                                    <td>{t.patient_name}</td>
                                    <td>
                                        <span className={`badge ${t.status === 'paid' ? 'green' : 'warn'}`}>{t.status}</span>
                                    </td>
                                    <td>{MODE_LABEL[t.mode_of_payment] || t.mode_of_payment}</td>
                                    <td>₱{Number(t.total_amount).toFixed(2)}</td>
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
