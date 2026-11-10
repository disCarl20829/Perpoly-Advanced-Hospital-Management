import { useCallback, useEffect, useRef, useState } from 'react';
import axiosClient from './axiosClient.js';

/**
 * Near-real-time data refresh using Axios polling.
 *
 * Example (after the real endpoint and auth contract are confirmed):
 *   const { data, loading, error, refresh } = useAxiosPolling({
 *     url: '/api/your-existing-endpoint', intervalMs: 8000,
 *     // config: { headers: { Authorization: `Bearer ${token}` } }
 *   });
 *
 * Important: polling is NOT push-based real time; use WebSockets/SSE for
 * instant updates. No routes have been invented in this module.
 */
export function useAxiosPolling({ url, config = {}, intervalMs = 8000, enabled = true, initialData = null, transform = response => response.data }) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled && url));
  const seq = useRef(0);
  const transformRef = useRef(transform);
  const configRef = useRef(config);
  transformRef.current = transform;
  configRef.current = config;
  const refresh = useCallback(async (signal) => {
    if (!enabled || !url) return;
    const request = ++seq.current;
    try {
      const response = await axiosClient.get(url, { ...configRef.current, signal });
      if (request !== seq.current || signal?.aborted) return;
      setData(transformRef.current(response));
      setError(null);
    } catch (err) {
      if (axiosClient.isCancel?.(err) || err?.code === 'ERR_CANCELED' || signal?.aborted || request !== seq.current) return;
      setError(err);
    } finally {
      if (request === seq.current && !signal?.aborted) setLoading(false);
    }
  }, [url, enabled]);

  useEffect(() => {
    if (!enabled || !url) { setLoading(false); return; }
    const controller = new AbortController();
    const run = () => {
      if (document.visibilityState !== 'hidden') refresh(controller.signal);
    };
    setLoading(true);
    run();
    const timer = window.setInterval(run, Math.max(intervalMs, 2000));
    const onVisible = () => { if (!document.hidden) run(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      controller.abort();
      ++seq.current;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [url, enabled, intervalMs, refresh]);
  return { data, error, loading, refresh: () => refresh() };
}
