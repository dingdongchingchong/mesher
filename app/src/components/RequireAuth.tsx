import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/appStore';

export function RequireAuth() {
  const bootstrapped = useAppStore((s) => s.bootstrapped);
  const token = useAppStore((s) => s.token);
  const currentUser = useAppStore((s) => s.currentUser);
  const location = useLocation();

  if (!bootstrapped) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-600">
        Loading...
      </div>
    );
  }

  if (!token || !currentUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
