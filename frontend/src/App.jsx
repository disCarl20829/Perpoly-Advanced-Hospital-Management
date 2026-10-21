import { useAuth } from './auth/AuthContext.jsx';
import Login from './components/Login.jsx';
import Layout from './components/Layout.jsx';

export default function App() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="login-wrap">
                <div className="muted">Loading…</div>
            </div>
        );
    }

    return user ? <Layout /> : <Login />;
}
