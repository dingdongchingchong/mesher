import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';

export function AppBootstrap({ children }: { children: ReactNode }) {
  const initialized = useAppStore((state) => state.bootstrapped);
  const bootstrap = useAppStore((state) => state.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-600">
        Loading...
      </div>
    );
  }

  return <>{children}</>;
}
