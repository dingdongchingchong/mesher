import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/ui';
import { useAppStore } from '../store/appStore';
import { CompanySwitcher } from '../components/CompanySwitcher';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/accounts', label: 'Chart of Accounts' },
  { to: '/reports/profit-loss', label: 'Profit & Loss' },
  { to: '/reports/balance-sheet', label: 'Balance Sheet' },
  { to: '/settings/company', label: 'Company' },
  { to: '/settings/profile', label: 'Profile' },
];

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = useAppStore((s) => s.currentUser);
  const logout = useAppStore((s) => s.logout);
  const activeRole = useAppStore((s) => s.activeRole);

  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded bg-emerald-600 px-2 py-1 text-xs font-bold uppercase tracking-wide text-white">
              mvpmvp
            </div>
            <h1 className="text-lg font-semibold text-slate-900">Desktop Accounting</h1>
          </div>
          <div className="flex items-center gap-3">
            <CompanySwitcher />
            <span className="text-sm text-slate-600">{currentUser?.name}</span>
            <Button variant="secondary" onClick={onLogout}>
              Log out
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid w-full max-w-7xl grid-cols-[240px_minmax(0,1fr)] gap-6 px-6 py-6">
        <aside>
          <Card className="p-3">
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const active = location.pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`rounded-md px-3 py-2 text-sm font-medium ${
                      active ? 'bg-emerald-100 text-emerald-800' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-500">
              Active role:{' '}
              <span className="font-semibold uppercase text-slate-700">{activeRole ?? '-'}</span>
            </div>
          </Card>
        </aside>
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
