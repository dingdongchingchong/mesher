import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAppStore } from '../store/appStore';

export function AppBootstrap({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const hydrate = useAppStore((state) => state.hydrateFromBootstrap);
  const clear = useAppStore((state) => state.clearSession);
  const token = useAppStore((state) => state.token);
  const activeCompany = useAppStore((state) => state.activeCompany);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) {
        setReady(true);
        return;
      }
      try {
        const payload = await api.auth.bootstrap(token, activeCompany?.id ?? null);
        if (!active) return;
        hydrate(payload);
      } catch {
        if (!active) return;
        clear();
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [token, activeCompany?.id, hydrate, clear]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-600">
        Loading...
      </div>
    );
  }

  return <>{children}</>;
}
