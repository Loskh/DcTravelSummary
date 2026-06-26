import { useEffect, useMemo, useState } from 'react';
import { Landing } from './components/Landing';
import { Report } from './components/Report';
import { parse } from './lib/parse';
import { computeStats } from './lib/stats';
import { DEMO } from './lib/demo';
import { CONFIG } from './lib/config';
import type { Parsed } from './lib/types';

export default function App() {
  const [data, setData] = useState<Parsed | null>(null);
  const [error, setError] = useState('');

  const stats = useMemo(() => (data ? computeStats(data.orders, data.fetchedAt) : null), [data]);

  function handleImport(input: string | object) {
    try {
      setError('');
      setData(parse(input));
    } catch (e) {
      setError('解析失败：' + (e instanceof Error ? e.message : String(e)));
    }
  }

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (CONFIG.ALLOWED_SENDER_ORIGINS.indexOf(e.origin) < 0) return;
      const d = e.data;
      if (d && d.type === 'DC_TRAVEL_DATA' && d.payload) {
        try {
          setError('');
          setData(parse(d.payload));
        } catch (err) {
          setError('数据解析失败：' + (err instanceof Error ? err.message : String(err)));
        }
      }
    }
    window.addEventListener('message', onMsg);
    try {
      if (window.opener) window.opener.postMessage({ type: 'DC_TRAVEL_READY' }, '*');
    } catch {
      /* ignore */
    }
    return () => window.removeEventListener('message', onMsg);
  }, []);

  return (
    <>
      {stats ? (
        <Report
          stats={stats}
          onRestart={() => {
            setData(null);
            setError('');
          }}
        />
      ) : (
        <Landing onImport={handleImport} onDemo={() => handleImport(DEMO)} error={error} />
      )}
    </>
  );
}
