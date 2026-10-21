import { useState, useEffect } from 'react';
import { api } from '../api.js';

const statusBadge = (s) => {
    if (s === 'out_of_stock') return <span className="badge red">Out of stock</span>;
    if (s === 'low_stock') return <span className="badge warn">Low stock</span>;
    return <span className="badge green">OK</span>;
};

export default function Inventory() {
    const [materials, setMaterials] = useState([]);
    const [receipts, setReceipts] = useState([]);

    const [matForm, setMatForm] = useState({ name: '', unit: '', reorder_threshold: 0 });
    const [moveForm, setMoveForm] = useState({ material_id: '', direction: 'in', qty: 1, source: 'purchase' });

    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        loadMaterials();
        loadReceipts();
    }, []);

    const loadMaterials = async () => {
        try {
            const d = await api.get('/inventory/stock-status');
            setMaterials(d.materials);
        } catch (e) {
            setErr(e.message);
        }
    };

    const loadReceipts = async () => {
        try {
            const d = await api.get('/inventory/stock-receipts');
            setReceipts(d.receipts);
        } catch (e) {
            setErr(e.message);
        }
    };

    const createMaterial = async () => {
        setErr('');
        setMsg('');
        try {
            await api.post('/inventory/materials', matForm);
            setMsg('Material created.');
            setMatForm({ name: '', unit: '', reorder_threshold: 0 });
            loadMaterials();
        } catch (e) {
            setErr(e.message);
        }
    };

    const recordMovement = async () => {
        setErr('');
        setMsg('');
        setBusy(true);
        try {
            await api.post('/inventory/stock-movements', moveForm);
            setMsg('Stock movement recorded.');
            setMoveForm({ material_id: '', direction: 'in', qty: 1, source: 'purchase' });
            loadMaterials();
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    };

    const confirmReceipt = async (id) => {
        setErr('');
        setMsg('');
        try {
            await api.put(`/inventory/stock-receipts/${id}/confirm`, {});
            setMsg('Receipt confirmed and stock added.');
            loadReceipts();
            loadMaterials();
        } catch (e) {
            setErr(e.message);
        }
    };

    const flagMismatch = async (id) => {
        setErr('');
        try {
            await api.put(`/inventory/stock-receipts/${id}/mismatch`, {});
            setMsg('Receipt flagged as mismatch.');
            loadReceipts();
        } catch (e) {
            setErr(e.message);
        }
    };

    const counts = {
        total: materials.length,
        out: materials.filter((m) => m.status === 'out_of_stock').length,
        low: materials.filter((m) => m.status === 'low_stock').length,
        ok: materials.filter((m) => m.status === 'ok').length
    };

    return (
        <>
            {err && <div className="alert error">{err}</div>}
            {msg && <div className="alert success">{msg}</div>}

            <div className="grid cols-4" style={{ marginBottom: 20 }}>
                <div className="stat">
                    <div className="label">Materials</div>
                    <div className="value">{counts.total}</div>
                </div>
                <div className="stat green">
                    <div className="label">In stock</div>
                    <div className="value">{counts.ok}</div>
                </div>
                <div className="stat warn">
                    <div className="label">Low stock</div>
                    <div className="value">{counts.low}</div>
                </div>
                <div className="stat danger">
                    <div className="label">Out of stock</div>
                    <div className="value">{counts.out}</div>
                </div>
            </div>

            <div className="card">
                <h2>
                    <span className="dot" /> Stock Overview
                </h2>
                {materials.length === 0 ? (
                    <div className="empty">No materials yet.</div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Material</th>
                                <th>Type</th>
                                <th>Stock</th>
                                <th>Threshold</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {materials.map((m) => (
                                <tr key={m.id}>
                                    <td>{m.name}</td>
                                    <td>{m.material_type_name || '—'}</td>
                                    <td>
                                        {Number(m.current_stock).toFixed(2)} {m.unit || ''}
                                    </td>
                                    <td>{m.reorder_threshold}</td>
                                    <td>{statusBadge(m.status)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="grid cols-2">
                {/* Add material */}
                <div className="card">
                    <h2>
                        <span className="dot" /> Add Material
                    </h2>
                    <div className="field">
                        <label>Name *</label>
                        <input value={matForm.name} onChange={(e) => setMatForm({ ...matForm, name: e.target.value })} />
                    </div>
                    <div className="field">
                        <label>Unit</label>
                        <input value={matForm.unit} onChange={(e) => setMatForm({ ...matForm, unit: e.target.value })} placeholder="pcs / box / ml" />
                    </div>
                    <div className="field">
                        <label>Reorder threshold</label>
                        <input type="number" min="0" value={matForm.reorder_threshold} onChange={(e) => setMatForm({ ...matForm, reorder_threshold: e.target.value })} />
                    </div>
                    <button className="btn" onClick={createMaterial}>
                        Create Material
                    </button>
                </div>

                {/* Stock movement */}
                <div className="card">
                    <h2>
                        <span className="dot" /> Record Stock Movement
                    </h2>
                    <div className="field">
                        <label>Material *</label>
                        <select value={moveForm.material_id} onChange={(e) => setMoveForm({ ...moveForm, material_id: e.target.value })}>
                            <option value="">— select —</option>
                            {materials.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="row">
                        <div className="field">
                            <label>Direction</label>
                            <select value={moveForm.direction} onChange={(e) => setMoveForm({ ...moveForm, direction: e.target.value })}>
                                <option value="in">Stock in</option>
                                <option value="out">Stock out</option>
                            </select>
                        </div>
                        <div className="field">
                            <label>Qty</label>
                            <input type="number" min="1" value={moveForm.qty} onChange={(e) => setMoveForm({ ...moveForm, qty: e.target.value })} />
                        </div>
                    </div>
                    <div className="field">
                        <label>Source</label>
                        <select value={moveForm.source} onChange={(e) => setMoveForm({ ...moveForm, source: e.target.value })}>
                            <option value="purchase">Purchase</option>
                            <option value="adjustment">Adjustment</option>
                            <option value="ocr_intake">OCR intake</option>
                        </select>
                    </div>
                    <button className="btn green" disabled={busy} onClick={recordMovement}>
                        {busy ? 'Saving…' : 'Record Movement'}
                    </button>
                </div>
            </div>

            {/* OCR receipts */}
            <div className="card">
                <h2>
                    <span className="dot" /> Supplier Receipts (OCR review queue)
                </h2>
                {receipts.length === 0 ? (
                    <div className="empty">No receipts in the review queue.</div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Items</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {receipts.map((r) => (
                                <tr key={r.id}>
                                    <td className="muted">{r.id.slice(0, 8)}…</td>
                                    <td>
                                        {(r.extracted_items || []).map((it, idx) => (
                                            <div key={idx}>
                                                {it.name} × {it.qty}
                                            </div>
                                        ))}
                                    </td>
                                    <td>
                                        <span
                                            className={`badge ${
                                                r.status === 'confirmed'
                                                    ? 'green'
                                                    : r.status === 'mismatch'
                                                      ? 'red'
                                                      : 'blue'
                                            }`}
                                        >
                                            {r.status}
                                        </span>
                                    </td>
                                    <td>{new Date(r.created_at).toLocaleString()}</td>
                                    <td>
                                        {r.status === 'pending_review' && (
                                            <div className="flex-between gap-8">
                                                <button className="btn sm green" onClick={() => confirmReceipt(r.id)}>
                                                    Confirm
                                                </button>
                                                <button className="btn sm danger" onClick={() => flagMismatch(r.id)}>
                                                    Mismatch
                                                </button>
                                            </div>
                                        )}
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
