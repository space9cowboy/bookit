import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiRequest, toApiError } from './api';

interface State<T> {
  data?: T;
  error?: ApiError;
  loading: boolean;
}

/** GET déclaratif : recharge quand `path` change ou quand `reload()` est appelé. */
export function useApi<T>(path: string) {
  const [state, setState] = useState<State<T>>({ loading: true });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((previous) => ({ data: previous.data, loading: true }));
    apiRequest<T>(path)
      .then((data) => !cancelled && setState({ data, loading: false }))
      .catch((err) => !cancelled && setState({ error: toApiError(err), loading: false }));
    return () => {
      cancelled = true;
    };
  }, [path, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const setData = useCallback((data: T) => setState({ data, loading: false }), []);

  return { ...state, reload, setData };
}
