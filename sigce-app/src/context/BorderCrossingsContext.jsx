import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { FALLBACK_BORDER_CROSSINGS, getBorderCrossing as findCrossing } from '../services/borderCrossings';
import { fetchBorderCrossings } from '../services/api';

const BorderCrossingsContext = createContext({
  crossings: FALLBACK_BORDER_CROSSINGS,
  loading: true,
  refresh: async () => {},
  getBorderCrossing: (id) => findCrossing(id),
  resolveCrossingName: (id) => findCrossing(id)?.name || id || '—',
});

export function BorderCrossingsProvider({ children }) {
  const [crossings, setCrossings] = useState(FALLBACK_BORDER_CROSSINGS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBorderCrossings();
      if (Array.isArray(data) && data.length > 0) {
        setCrossings(data);
      }
    } catch {
      setCrossings(FALLBACK_BORDER_CROSSINGS);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getBorderCrossing = useCallback(
    (id) => findCrossing(id, crossings) || findCrossing(id, FALLBACK_BORDER_CROSSINGS),
    [crossings]
  );

  const resolveCrossingName = useCallback(
    (id) => getBorderCrossing(id)?.name || id || '—',
    [getBorderCrossing]
  );

  const value = useMemo(
    () => ({ crossings, loading, refresh, getBorderCrossing, resolveCrossingName }),
    [crossings, loading, refresh, getBorderCrossing, resolveCrossingName]
  );

  return (
    <BorderCrossingsContext.Provider value={value}>
      {children}
    </BorderCrossingsContext.Provider>
  );
}

export function useBorderCrossings() {
  return useContext(BorderCrossingsContext);
}
