import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { saveAs } from '@react-pdf/renderer';
import { useAppStore } from '../store/appStore';
import { Button, Card, Label } from '../components/ui';
import { formatCurrency } from '../utils/format';
import { profitLossPdf } from '../reports/pdf';
import type { DatePreset } from '../types';

const PRESETS: Array<{ key: DatePreset; label: string }> = [
  { key: 'current_month', label: 'Current month' },
  { key: 'ytd', label: 'Year to date' },
  { key: 'last_month', label: 'Last month' },
  { key: 'last_year', label: 'Last year' },
  { key: 'custom', label: 'Custom' },
];

export function ProfitLossPage() {
  const activeCompany = useAppStore((state) => state.activeCompany);
  const report = useAppStore((state) => state.profitLossReport);
  const loadReport = useAppStore((state) => state.loadProfitLossReport);
  const [preset, setPreset] = useState<DatePreset>('current_month');
  const [fromDate, setFromDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(
    () => ({
      income: report?.totalIncome ?? 0,
      expenses: report?.totalExpenses ?? 0,
      net: report?.net ?? 0,
    }),
    [report],
  );

  async function runReport() {
    if (!activeCompany) return;
    setLoading(true);
    setError(null);
    try {
      await loadReport(activeCompany.id, preset, fromDate, toDate);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to run report');
    } finally {
      setLoading(false);
    }
  }

  async function exportPdf() {
    if (!activeCompany || !report) return;
    const blob = await saveAs(
      profitLossPdf(activeCompany.name, report),
      `profit-loss-${report.range.from}-${report.range.to}.pdf`,
    );
    return blob;
  }

  return (
    <div className="space-y-4">
      <Card title="Profit & Loss" subtitle="Cash basis report with date presets and custom ranges">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <Label htmlFor="preset">Preset</Label>
            <select
              id="preset"
              value={preset}
              onChange={(event) => setPreset(event.target.value as DatePreset)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {PRESETS.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="from">From</Label>
            <input
              id="from"
              type="date"
              value={fromDate}
              disabled={preset !== 'custom'}
              onChange={(event) => setFromDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="to">To</Label>
            <input
              id="to"
              type="date"
              value={toDate}
              disabled={preset !== 'custom'}
              onChange={(event) => setToDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={runReport} disabled={loading}>
              {loading ? 'Running...' : 'Run report'}
            </Button>
            <Button variant="secondary" onClick={exportPdf} disabled={!report}>
              Export PDF
            </Button>
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </Card>

      {!report ? (
        <Card>
          <p className="text-sm text-slate-600">Run a report to view results.</p>
        </Card>
      ) : (
        <Card title={`Results (${report.range.from} → ${report.range.to})`}>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs uppercase text-slate-500">Income</p>
              <p className="text-xl font-semibold text-emerald-700">{formatCurrency(totals.income)}</p>
            </div>
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
              <p className="text-xs uppercase text-slate-500">Expenses</p>
              <p className="text-xl font-semibold text-rose-700">{formatCurrency(totals.expenses)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-100 p-4">
              <p className="text-xs uppercase text-slate-500">Net</p>
              <p className={`text-xl font-semibold ${totals.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {formatCurrency(totals.net)}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-3">
              <h3 className="font-semibold text-slate-900">Income accounts</h3>
              <div className="mt-2 space-y-1 text-sm">
                {report.income.map((row) => (
                  <div className="flex justify-between" key={row.account_id}>
                    <span>{row.account_name}</span>
                    <span className="font-medium">{formatCurrency(row.total)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <h3 className="font-semibold text-slate-900">Expense accounts</h3>
              <div className="mt-2 space-y-1 text-sm">
                {report.expenses.map((row) => (
                  <div className="flex justify-between" key={row.account_id}>
                    <span>{row.account_name}</span>
                    <span className="font-medium">{formatCurrency(row.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
