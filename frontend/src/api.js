// Central API client.
// All requests go through /api, which Vite proxies to the Node backend
// (see vite.config.js) so we don't have to deal with CORS.

const API_BASE = '/api';

export async function apiRequest(path, options = {}) {
    const token = localStorage.getItem('accessToken');

    const res = await fetch(`${API_BASE}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        ...options
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        const err = new Error(data.message || 'Request failed');
        err.status = res.status;
        throw err;
    }

    return data;
}

export const api = {
    get: (path) => apiRequest(path),
    post: (path, body) => apiRequest(path, { method: 'POST', body: JSON.stringify(body) }),
    put: (path, body) => apiRequest(path, { method: 'PUT', body: JSON.stringify(body) }),
    del: (path) => apiRequest(path, { method: 'DELETE' })
};
