import { useState, useEffect } from 'react';
import { api } from '../api.js';

const MODES = [
    { value: '', label: 'All modes' },
    { value: 'cash', label: 'Cash' },
    { value: 'paymaya', label: 'PayMaya' },
    { value: 'gotyme', label: 'GoTyme' },
    { value: 'gcash', label: 'GCash' },
    { value: 'credit_card', label: 'Credit card' },
    { value: 'debit_card', label: 'Debit card' },
    { value: 'bank_transfer', label: 'Bank transfer' }
];

const peso = (value) =>
    `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const titleCase = (value) =>
    String(value || '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

const periodLabel = (period, value) => {
    if (period === 'weekly') return `Week of ${value}`;
    if (period === 'monthly') return value.slice(0, 7);
    return value;
};

export default function Income() {
    // Paid is the default view, as requested by the client.
    const [period, setPeriod] = useState('daily');
    const [status, setStatus] = useState('paid');
    const [mode, setMode] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');

    const [summary, setSummary] = useState(null);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [err, setErr] = useState('');
    const [msg, setMsg] = useState('');

    const queryString = () => {
        const params = new URLSearchParams();
        params.set('period', period);
        if (status) params.set('status', status);
        if (mode) params.set('mode_of_payment', mode);
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        return params.toString();
    };

    useEffect(() => {
        load();
    }, [period, status, mode, from, to]);

    const load = async () => {
        setLoading(true);
        setErr('');
        try {
            const qs = queryString();
            const [summaryData, listData] = await Promise.all([
                api.get(`/income/summary?${qs}`),
                api.get(`/income?${qs}`)
            ]);
            setSummary(summaryData.summary);
            setRows(listData.income);
        } catch (e) {
            setErr(e.message);
        } finally {
            setLoading(false);
        }
    };

    const exportExcel = async () => {
        setExporting(true);
        setErr('');
        setMsg('');
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`/api/income/export?${queryString()}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || 'Export failed');
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            const disposition = res.headers.get('Content-Disposition') || '';
            const nameMatch = disposition.match(/filename="?([^"]+)"?/i);
            link.download = nameMatch ? nameMatch[1] : 'sales-report.xlsx';

            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);

            setMsg('Excel export downloaded.');
        } catch (e) {
            setErr(e.message);
        } finally {
            setExporting(false);
        }
    };

    const total = Number(summary?.totals?.total || 0);
    const count = Number(summary?.totals?.count || 0);
    const average = count > 0 ? total / count : 0;

    return (
        <>
            {err && <div className="alert error">{err}</div>}
            {msg && <div className="alert success">{msg}</div>}

            <div className="grid cols-4" style={{ marginBottom: 20 }}>
                <div className="stat green">
                    <div className="label">Total income</div>
                    <div className="value">{peso(total)}</div>
                </div>
                <div className="stat">
                    <div className="label">Transactions</div>
                    <div className="value">{count}</div>
                </div>
                <div className="stat">
                    <div className="label">Average transaction</div>
                    <div className="value">{peso(average)}</div>
                </div>
                <div className="stat">
                    <div className="label">Showing</div>
                    <div className="value">{status ? titleCase(status) : 'All'}</div>
                </div>
            </div>

            <div className="card">
                <h2>
                    <span className="dot" /> Filters
                </h2>
                <div className="row">
                    <div className="field">
                        <label>Group by</label>
                        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>
                    <div className="field">
                        <label>Status</label>
                        <select value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="paid">Paid</option>
                            <option value="unpaid">Unpaid</option>
                            <option value="">All</option>
                        </select>
                    </div>
                    <div className="field">
                        <label>Mode of payment</label>
                        <select value={mode} onChange={(e) => setMode(e.target.value)}>
                            {MODES.map((m) => (
                                <option key={m.value} value={m.value}>
                                    {m.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <div className="field">
                        <label>From</label>
                        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                    </div>
                    <div className="field">
                        <label>To</label>
                        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                    </div>
                    <div className="field" style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button className="btn green" onClick={exportExcel} disabled={exporting}>
                            {exporting ? 'Preparing…' : 'Export Excel'}
                        </button>
                    </div>
                    <div className="field" style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button
                            className="btn ghost"
                            onClick={() => {
                                setFrom('');
                                setTo('');
                                setStatus('paid');
                                setMode('');
                            }}
                        >
                            Reset
                        </button>
                    </div>
                </div>

                <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>
                    One sheet per day. Weekly/monthly exports also include a Summary sheet and an Other Tests sheet.
                    Blank dates default to: Daily = today, Weekly = this week, Monthly = this month (Asia/Manila).
                </p>
            </div>

            <div className="grid cols-2">
                <div className="card">
                    <h2>
                        <span className="dot" /> Grouped Totals
                    </h2>
                    {!summary || summary.groups.length === 0 ? (
                        <div className="empty">No income records for this selection.</div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Period</th>
                                    <th>Transactions</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary.groups.map((g) => (
                                    <tr key={g.period_start}>
                                        <td>{periodLabel(period, g.period_start)}</td>
                                        <td>{g.count}</td>
                                        <td>{peso(g.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="card">
                    <h2>
                        <span className="dot" /> By Mode of Payment
                    </h2>
                    {!summary || summary.by_mode.length === 0 ? (
                        <div className="empty">No payments recorded.</div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Mode</th>
                                    <th>Transactions</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary.by_mode.map((m) => (
                                    <tr key={m.mode_of_payment}>
                                        <td>
                                            <span className="badge blue">{titleCase(m.mode_of_payment)}</span>
                                        </td>
                                        <td>{m.count}</td>
                                        <td>{peso(m.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <div className="card">
                <h2>
                    <span className="dot" /> Income Records {loading && <span className="muted">· loading…</span>}
                </h2>
                {rows.length === 0 ? (
                    <div className="empty">No income records yet.</div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Receipt</th>
                                <th>Date</th>
                                <th>Patient</th>
                                <th>Cashier</th>
                                <th>Mode</th>
                                <th>Status</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.id}>
                                    <td>{r.receipt_no}</td>
                                    <td>{r.issued_at_local}</td>
                                    <td>
                                        {r.patient_name || '—'}
                                        {r.is_senior && <span className="badge blue" style={{ marginLeft: 6 }}>Senior</span>}
                                    </td>
                                    <td>{r.cashier_name || '—'}</td>
                                    <td>{titleCase(r.mode_of_payment)}</td>
                                    <td>
                                        <span className={r.status === 'paid' ? 'badge green' : 'badge warn'}>
                                            {titleCase(r.status)}
                                        </span>
                                    </td>
                                    <td>
                                        {peso(r.amount)}
                                        {Number(r.discount_amount) > 0 && (
                                            <div className="muted" style={{ fontSize: 11 }}>
                                                -{peso(r.discount_amount)} senior
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
