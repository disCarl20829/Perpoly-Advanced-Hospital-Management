import axios from 'axios';

/**
 * Optional shared HTTP client for components migrated to Axios.
 * Existing authentication/refresh logic must remain in the repository's
 * original API helper until its token contract has been checked.
 * Same-origin Vite /api requests are forwarded to the Express backend.
 */
export const axiosClient = axios.create({
  baseURL: '/',
  timeout: 15000,
  withCredentials: true,
  headers: { Accept: 'application/json' },
});

export default axiosClient;
