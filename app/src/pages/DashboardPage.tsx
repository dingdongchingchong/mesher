import { useMemo } from 'react';
import { StatCard } from '../components/ui';
import { useAppStore } from '../store/appStore';
import { formatCurrency } from '../utils/format';

export function DashboardPage() {
  const dashboard = useAppStore((state) => state.dashboard);
  const activeCompany = useAppStore((state) => state.activeCompany);

  const rows = useMemo(() => dashboard?.recentTransactions ?? [], [dashboard]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-600">
          {activeCompany ? `Current company: ${activeCompany.name}` : 'No active company selected'}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="Current month income" value={formatCurrency(dashboard?.income ?? 0)} />
        <StatCard label="Current month expenses" value={formatCurrency(dashboard?.expenses ?? 0)} />
        <StatCard
          label="Net"
          value={formatCurrency(dashboard?.net ?? 0)}
          emphasis={(dashboard?.net ?? 0) >= 0 ? 'positive' : 'negative'}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-900">Recent transactions</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Account</th>
                <th className="px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                    No transactions yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{row.date}</td>
                    <td className="px-3 py-2">{row.description || '-'}</td>
                    <td className="px-3 py-2">{row.account_name}</td>
                    <td
                      className={`px-3 py-2 text-right font-medium ${
                        row.amount >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {formatCurrency(row.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
