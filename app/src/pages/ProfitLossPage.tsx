import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useAppStore } from '../store/appStore';
import { exportProfitLossPdf } from '../reports/pdf';
import { Button, EmptyState, ErrorText, Input, Label, PageCard, Select } from '../components/ui';
import type { DatePreset, ProfitLossResult } from '../types';
import { formatCurrency } from '../utils/format';

const PRESETS: Array<{ key: DatePreset; label: string }> = [
  { key: 'current_month', label: 'Current month' },
  { key: 'ytd', label: 'Year to date' },
  { key: 'last_month', label: 'Last month' },
  { key: 'last_year', label: 'Last year' },
  { key: 'custom', label: 'Custom' },
];

const today = format(new Date(), 'yyyy-MM-dd');

export function ProfitLossPage() {
  const activeCompany = useAppStore((s) => s.activeCompany);
  const report = useAppStore((s) => s.profitLoss);
  const loading = useAppStore((s) => s.loading.profitLoss);
  const loadProfitLoss = useAppStore((s) => s.loadProfitLoss);

  const [preset, setPreset] = useState<DatePreset>('current_month');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const totals = useMemo(
    () => ({
      income: report?.totalIncome ?? 0,
      expenses: report?.totalExpenses ?? 0,
      net: report?.net ?? 0,
    }),
    [report],
  );

  const runReport = async () => {
    if (!activeCompany) return;
    setError(null);
    try {
      await loadProfitLoss(preset, startDate, endDate);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to run report');
    }
  };

  const onExport = async () => {
    if (!activeCompany || !report) return;
    setExporting(true);
    setError(null);
    try {
      await exportProfitLossPdf(activeCompany.name, report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const section = (title: string, rows: ProfitLossResult['income']) => (
    <div className="rounded-xl border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <div className="mt-3 space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">No data in this period.</p>
        ) : (
          rows.map((row) => (
            <div key={row.account_id} className="flex items-center justify-between text-sm">
              <span>{row.account_name}</span>
              <span className="font-medium">{formatCurrency(row.total)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <PageCard title="Profit & Loss" subtitle="Cash basis report for income and expenses.">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="preset">Preset</Label>
            <Select
              id="preset"
              value={preset}
              onChange={(event) => setPreset(event.target.value as DatePreset)}
            >
              {PRESETS.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="start-date">Start date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              disabled={preset !== 'custom'}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="end-date">End date</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              disabled={preset !== 'custom'}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={runReport} loading={loading}>
              Run report
            </Button>
            <Button variant="secondary" onClick={onExport} disabled={!report || exporting}>
              {exporting ? 'Exporting...' : 'Export PDF'}
            </Button>
          </div>
        </div>
        {error ? <ErrorText>{error}</ErrorText> : null}
      </PageCard>

      {!report ? (
        <EmptyState
          title="No report generated"
          description="Run a report to see income, expenses, and net results."
        />
      ) : (
        <PageCard title={`Results (${report.range.from} to ${report.range.to})`}>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-emerald-50 p-4">
              <div className="text-xs uppercase text-slate-500">Income</div>
              <div className="mt-1 text-xl font-semibold text-emerald-700">
                {formatCurrency(totals.income)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-rose-50 p-4">
              <div className="text-xs uppercase text-slate-500">Expenses</div>
              <div className="mt-1 text-xl font-semibold text-rose-700">
                {formatCurrency(totals.expenses)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-100 p-4">
              <div className="text-xs uppercase text-slate-500">Net</div>
              <div
                className={`mt-1 text-xl font-semibold ${totals.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}
              >
                {formatCurrency(totals.net)}
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {section('Income', report.income)}
            {section('Expenses', report.expenses)}
          </div>
        </PageCard>
      )}
    </div>
  );
}
