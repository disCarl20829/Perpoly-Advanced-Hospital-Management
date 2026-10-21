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

export default function Cashier() {
    const [search, setSearch] = useState('');
    const [patients, setPatients] = useState([]);
    const [patientForm, setPatientForm] = useState(EMPTY_PATIENT);
    const [selectedPatient, setSelectedPatient] = useState(null);

    const [types, setTypes] = useState([]);
    const [items, setItems] = useState([]);
    const [status, setStatus] = useState('unpaid');
    const [transactions, setTransactions] = useState([]);

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
                items: items.map((i) => ({
                    transaction_type_id: i.transaction_type_id,
                    qty: i.qty,
                    unit_price: i.unit_price
                }))
            };
            const d = await api.post('/cashier/transactions', payload);
            setMsg(`Receipt ${d.transaction.receipt_no} created.`);
            setItems([]);
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
                                <th>Total</th>
                                <th>Issued</th>
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
                                    <td>₱{Number(t.total_amount).toFixed(2)}</td>
                                    <td>{new Date(t.issued_at).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );
}
