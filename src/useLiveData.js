import { useCallback, useEffect, useState } from 'react';

// Veriyi periyodik olarak (polling) yeniler; böylece değişiklikler sayfa yenilemeden görünür.
export default function useLiveData(fetcher, intervalMs = 5000) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setData(await fetcher());
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [fetcher]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, intervalMs);
    return () => clearInterval(t);
  }, [refresh, intervalMs]);

  return { data, error, refresh };
}
