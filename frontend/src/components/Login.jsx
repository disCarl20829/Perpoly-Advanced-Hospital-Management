import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';

export default function Login() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        setBusy(true);
        try {
            await login(email, password);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="login-wrap">
            <form className="login-card" onSubmit={submit}>
                <div className="logo-row">
                    <img src="/logo.jpg" alt="PerPoly logo" />
                    <div>
                        <div className="t1">PerPoly</div>
                        <div className="t2">Hospital Management System</div>
                    </div>
                </div>

                <h1>Sign in</h1>
                <p className="sub">Use your staff account to continue.</p>

                {error && <div className="alert error">{error}</div>}

                <div className="field">
                    <label>Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@hospital.ph"
                        required
                    />
                </div>

                <div className="field">
                    <label>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                    />
                </div>

                <button className="btn green" style={{ width: '100%' }} disabled={busy}>
                    {busy ? 'Signing in…' : 'Sign in'}
                </button>
            </form>
        </div>
    );
}
