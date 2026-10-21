import { useState, useEffect } from 'react';
import { api } from '../api.js';

export default function Laboratory() {
    const [laboratories, setLaboratories] = useState([]);
    const [labId, setLabId] = useState('');
    const [pending, setPending] = useState([]);
    const [defaults, setDefaults] = useState([]);
    const [results, setResults] = useState([]);

    const [selectedItem, setSelectedItem] = useState(null);
    const [resultData, setResultData] = useState('');
    const [materials, setMaterials] = useState([]);

    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        loadLaboratories();
    }, []);

    useEffect(() => {
        if (!labId) return;
        loadPending();
        loadDefaults();
        loadResults();
    }, [labId]);

    const loadLaboratories = async () => {
        try {
            const d = await api.get('/laboratory/laboratories');
            setLaboratories(d.laboratories);
            if (d.laboratories[0]) setLabId(d.laboratories[0].id);
        } catch (e) {
            setErr(e.message);
        }
    };

    const loadPending = async () => {
        try {
            const d = await api.get(`/laboratory/laboratories/${labId}/pending`);
            setPending(d.transactions);
        } catch (e) {
            setErr(e.message);
        }
    };

    const loadDefaults = async () => {
        try {
            const d = await api.get(`/laboratory/laboratories/${labId}/defaults`);
            setDefaults(d.defaults);
        } catch (e) {
            setErr(e.message);
        }
    };

    const loadResults = async () => {
        try {
            const d = await api.get(`/laboratory/laboratories/${labId}/results`);
            setResults(d.results);
        } catch (e) {
            setErr(e.message);
        }
    };

    const openResult = (item) => {
        setSelectedItem(item);
        setResultData('');
        // Pre-fill material usage from lab defaults
        setMaterials(
            defaults.map((d) => ({
                material_id: d.material_id,
                material_name: d.material_name,
                qty_used: d.default_qty
            }))
        );
    };

    const setMaterialQty = (id, qty) =>
        setMaterials((prev) => prev.map((m) => (m.material_id === id ? { ...m, qty_used: Number(qty) } : m)));

    const addCustomMaterial = (e) => {
        const id = e.target.value;
        if (!id) return;
        setMaterials((prev) =>
            prev.some((m) => m.material_id === id)
                ? prev
                : [...prev, { material_id: id, material_name: 'Custom', qty_used: 1 }]
        );
        e.target.value = '';
    };

    const submitResult = async () => {
        setErr('');
        setMsg('');
        if (!selectedItem) {
            setErr('Select a pending test first.');
            return;
        }
        if (!resultData.trim()) {
            setErr('Enter the result data.');
            return;
        }
        setBusy(true);
        try {
            await api.post('/laboratory/results', {
                transaction_item_id: selectedItem.id,
                laboratory_id: labId,
                result_data: { text: resultData },
                materials_used: materials.map((m) => ({ material_id: m.material_id, qty_used: m.qty_used }))
            });
            setMsg('Result recorded and stock deducted.');
            setSelectedItem(null);
            setResultData('');
            setMaterials([]);
            loadPending();
            loadResults();
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    };

    const labName = laboratories.find((l) => l.id === labId)?.name;

    return (
        <>
            {err && <div className="alert error">{err}</div>}
            {msg && <div className="alert success">{msg}</div>}

            <div className="card">
                <h2>
                    <span className="dot" /> Laboratory
                </h2>
                <div className="field" style={{ maxWidth: 320 }}>
                    <label>Select laboratory</label>
                    <select value={labId} onChange={(e) => setLabId(e.target.value)}>
                        {laboratories.map((l) => (
                            <option key={l.id} value={l.id}>
                                {l.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid cols-2">
                {/* Pending */}
                <div className="card">
                    <h2>
                        <span className="dot" /> Pending Tests — {labName}
                    </h2>
                    {pending.length === 0 ? (
                        <div className="empty">No pending tests.</div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Patient</th>
                                    <th>Test</th>
                                    <th>Receipt</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {pending.map((p) => (
                                    <tr key={p.id}>
                                        <td>{p.patient_name}</td>
                                        <td>{p.transaction_type_name}</td>
                                        <td>{p.receipt_no}</td>
                                        <td>
                                            <button className="btn sm green" onClick={() => openResult(p)}>
                                                Record
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Record result */}
                <div className="card">
                    <h2>
                        <span className="dot" /> Record Result
                    </h2>
                    {!selectedItem ? (
                        <div className="empty">Choose a pending test to record a result.</div>
                    ) : (
                        <>
                            <div className="alert success" style={{ marginBottom: 14 }}>
                                {selectedItem.patient_name} — {selectedItem.transaction_type_name}
                            </div>

                            <div className="field">
                                <label>Result</label>
                                <textarea rows="3" value={resultData} onChange={(e) => setResultData(e.target.value)} placeholder="Enter findings…" />
                            </div>

                            <div className="field">
                                <label>Materials used (pre-filled from lab defaults)</label>
                                {materials.length === 0 ? (
                                    <div className="muted">No defaults for this lab.</div>
                                ) : (
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Material</th>
                                                <th>Qty</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {materials.map((m) => (
                                                <tr key={m.material_id}>
                                                    <td>{m.material_name}</td>
                                                    <td style={{ width: 110 }}>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={m.qty_used}
                                                            onChange={(e) => setMaterialQty(m.material_id, e.target.value)}
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            <button className="btn green" disabled={busy} onClick={submitResult}>
                                {busy ? 'Saving…' : 'Save Result'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Results */}
            <div className="card">
                <h2>
                    <span className="dot" /> Recorded Results
                </h2>
                {results.length === 0 ? (
                    <div className="empty">No results recorded.</div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Patient</th>
                                <th>Test</th>
                                <th>Status</th>
                                <th>Recorded</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((r) => (
                                <tr key={r.id}>
                                    <td>{r.patient_name}</td>
                                    <td>{r.transaction_type_name}</td>
                                    <td>
                                        <span className="badge green">{r.status}</span>
                                    </td>
                                    <td>{r.recorded_at ? new Date(r.recorded_at).toLocaleString() : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );
}
