import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import Icon from './Icon.jsx';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password); // The repository's authentication method is unchanged.
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="pp-login-scene">
      <div className="pp-login-frame">
        <section className="pp-login-showcase" aria-label="PerPoly introduction">
          <div className="pp-login-showcase-brand">
            <span className="pp-login-brand-icon"><img src="/logo.jpg" alt="" /></span>
            <span>PerPoly<strong>.</strong></span>
          </div>
          <div className="pp-login-showcase-main">
            <div className="pp-showcase-kicker"><Icon name="sparkle" size={14}/> A more connected workspace</div>
            <h2>Better systems.<br/><em>Better care.</em></h2>
            <p>Manage day-to-day hospital operations with a clear, focused workspace built for your team.</p>
            <div className="pp-showcase-features">
              <span><Icon name="receipt" size={18}/> Billing</span>
              <span><Icon name="flask" size={18}/> Laboratory</span>
              <span><Icon name="boxes" size={18}/> Inventory</span>
            </div>
          </div>
          <div className="pp-login-showcase-footer"><Icon name="shield" size={17}/> Staff-only access</div>
          <div aria-hidden="true" className="pp-login-decoration pp-login-decoration-one"/>
          <div aria-hidden="true" className="pp-login-decoration pp-login-decoration-two"/>
        </section>
        <section className="pp-login-form-side">
          <div className="pp-login-form-inner">
            <div className="pp-login-mobile-brand"><img src="/logo.jpg" alt=""/>PerPoly</div>
            <span className="pp-login-welcome">STAFF PORTAL</span>
            <h1>Welcome back</h1>
            <p className="pp-login-subtitle">Sign in to continue to your hospital workspace.</p>
            <form onSubmit={submit} className="pp-login-form">
              {error && <div className="alert error" role="alert">{error}</div>}
              <div className="field">
                <label htmlFor="pp-login-email">Email address</label>
                <div className="pp-input-with-icon"><Icon name="mail" size={19}/><input id="pp-login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" placeholder="name@hospital.ph" required /></div>
              </div>
              <div className="field">
                <label htmlFor="pp-login-password">Password</label>
                <div className="pp-input-with-icon"><Icon name="lock" size={19}/><input id="pp-login-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Enter your password" required />
                  <button type="button" className="pp-password-toggle" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}><Icon name={showPassword ? 'eyeoff' : 'eye'} size={19}/></button>
                </div>
              </div>
              <button className="pp-signin-submit" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in to workspace'} {!busy && <Icon name="arrow" size={18}/>}</button>
            </form>
            <p className="pp-login-hint"><Icon name="shield" size={16}/> Access is restricted to authorized staff.</p>
          </div>
          <div className="pp-login-bottom">© {new Date().getFullYear()} PerPoly Hospital Management</div>
        </section>
      </div>
    </main>
  );
}
