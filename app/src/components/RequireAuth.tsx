import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/appStore';

type RequireAuthProps = {
  children: ReactNode;
  requireCompany?: boolean;
};

export function RequireAuth({ children, requireCompany = false }: RequireAuthProps) {
  const initialized = useAppStore((s) => s.bootstrapped);
  const token = useAppStore((s) => s.token);
  const currentUser = useAppStore((s) => s.currentUser);
  const activeCompany = useAppStore((s) => s.activeCompany);
  const companies = useAppStore((s) => s.companies);
  const location = useLocation();

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-600">
        Loading...
      </div>
    );
  }

  if (!token || !currentUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (requireCompany) {
    if (companies.length === 0) {
      return <Navigate to="/companies/new" replace />;
    }
    if (!activeCompany) {
      return <Navigate to="/companies/select" replace />;
    }
  }

  return <>{children}</>;
}
