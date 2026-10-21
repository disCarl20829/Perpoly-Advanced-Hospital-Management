import { useState, useEffect } from 'react';
import { api } from '../api.js';

export default function Accounting() {
    const [expenses, setExpenses] = useState([]);
    const [summary, setSummary] = useState([]);
    const [report, setReport] = useState(null);
    const [logs, setLogs] = useState([]);

    const [expForm, setExpForm] = useState({
        source_system: 'cashier',
        source_reference_id: '',
        description: '',
        amount: 0,
        incurred_at: new Date().toISOString().slice(0, 10)
    });

    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');

    useEffect(() => {
        loadExpenses();
        loadSummary();
        loadReport();
        loadLogs();
    }, []);

    const loadExpenses = async () => {
        try {
            const d = await api.get('/accounting/expenses');
            setExpenses(d.expenses);
        } catch (e) {
            setErr(e.message);
        }
    };

    const loadSummary = async () => {
        try {
            const d = await api.get('/accounting/expenses/summary');
            setSummary(d.summary);
        } catch (e) {
            setErr(e.message);
        }
    };

    const loadReport = async () => {
        try {
            const d = await api.get('/accounting/reports');
            setReport(d.report);
        } catch (e) {
            setErr(e.message);
        }
    };

    const loadLogs = async () => {
        try {
            const d = await api.get('/accounting/exports/logs');
            setLogs(d.logs);
        } catch (e) {
            setErr(e.message);
        }
    };

    const recordExpense = async () => {
        setErr('');
        setMsg('');
        try {
            await api.post('/accounting/expenses', {
                ...expForm,
                amount: Number(expForm.amount)
            });
            setMsg('Expense recorded.');
            setExpForm({ ...expForm, source_reference_id: '', description: '', amount: 0 });
            loadExpenses();
            loadSummary();
        } catch (e) {
            setErr(e.message);
        }
    };

    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

    return (
        <>
            {err && <div className="alert error">{err}</div>}
            {msg && <div className="alert success">{msg}</div>}

            <div className="grid cols-4" style={{ marginBottom: 20 }}>
                <div className="stat danger">
                    <div className="label">Total expenses</div>
                    <div className="value">₱{totalExpenses.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="stat">
                    <div className="label">Cashier txns</div>
                    <div className="value">{report?.cashier?.count ?? 0}</div>
                </div>
                <div className="stat">
                    <div className="label">Lab results</div>
                    <div className="value">{report?.laboratory?.count ?? 0}</div>
                </div>
                <div className="stat">
                    <div className="label">Stock movements</div>
                    <div className="value">{report?.inventory?.count ?? 0}</div>
                </div>
            </div>

            <div className="grid cols-2">
                {/* Add expense */}
                <div className="card">
                    <h2>
                        <span className="dot" /> Record Expense
                    </h2>
                    <div className="field">
                        <label>Source system</label>
                        <select
                            value={expForm.source_system}
                            onChange={(e) => setExpForm({ ...expForm, source_system: e.target.value })}
                        >
                            <option value="cashier">Cashier</option>
                            <option value="laboratory">Laboratory</option>
                            <option value="inventory">Inventory</option>
                        </select>
                    </div>
                    <div className="field">
                        <label>Reference ID</label>
                        <input
                            value={expForm.source_reference_id}
                            onChange={(e) => setExpForm({ ...expForm, source_reference_id: e.target.value })}
                            placeholder="Related record UUID"
                        />
                    </div>
                    <div className="field">
                        <label>Description</label>
                        <input
                            value={expForm.description}
                            onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
                        />
                    </div>
                    <div className="row">
                        <div className="field">
                            <label>Amount (₱)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={expForm.amount}
                                onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })}
                            />
                        </div>
                        <div className="field">
                            <label>Incurred at</label>
                            <input
                                type="date"
                                value={expForm.incurred_at}
                                onChange={(e) => setExpForm({ ...expForm, incurred_at: e.target.value })}
                            />
                        </div>
                    </div>
                    <button className="btn" onClick={recordExpense}>
                        Record Expense
                    </button>
                </div>

                {/* Summary */}
                <div className="card">
                    <h2>
                        <span className="dot" /> Expense Summary by Source
                    </h2>
                    {summary.length === 0 ? (
                        <div className="empty">No expenses recorded.</div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Source</th>
                                    <th>Count</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary.map((s) => (
                                    <tr key={s.source_system}>
                                        <td>{s.source_system}</td>
                                        <td>{s.count}</td>
                                        <td>₱{Number(s.total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Expenses */}
            <div className="card">
                <h2>
                    <span className="dot" /> Expenses
                </h2>
                {expenses.length === 0 ? (
                    <div className="empty">No expenses yet.</div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Source</th>
                                <th>Description</th>
                                <th>Amount</th>
                                <th>Incurred</th>
                            </tr>
                        </thead>
                        <tbody>
                            {expenses.map((e) => (
                                <tr key={e.id}>
                                    <td>
                                        <span className="badge blue">{e.source_system}</span>
                                    </td>
                                    <td>{e.description || '—'}</td>
                                    <td>₱{Number(e.amount).toFixed(2)}</td>
                                    <td>{new Date(e.incurred_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Report */}
            {report && (
                <div className="card">
                    <h2>
                        <span className="dot" /> Aggregated Report
                    </h2>
                    <div className="grid cols-3">
                        <div className="stat">
                            <div className="label">Cashier transactions</div>
                            <div className="value">{report.cashier.count}</div>
                        </div>
                        <div className="stat">
                            <div className="label">Laboratory results</div>
                            <div className="value">{report.laboratory.count}</div>
                        </div>
                        <div className="stat">
                            <div className="label">Inventory movements</div>
                            <div className="value">{report.inventory.count}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Export logs */}
            <div className="card">
                <h2>
                    <span className="dot" /> Export History
                </h2>
                {logs.length === 0 ? (
                    <div className="empty">No exports yet.</div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>System</th>
                                <th>Requested</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((l) => (
                                <tr key={l.id}>
                                    <td>
                                        <span className="badge green">{l.export_type}</span>
                                    </td>
                                    <td>{l.system || 'master'}</td>
                                    <td>{new Date(l.created_at).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );
}
