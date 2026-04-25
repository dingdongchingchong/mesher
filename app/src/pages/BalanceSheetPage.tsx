import { useState } from 'react';
import {
  Button,
  EmptyState,
  ErrorText,
  Input,
  Label,
  PageCard,
} from '../components/ui';
import { exportBalanceSheetPdf } from '../reports/pdf';
import { useAppStore } from '../store/appStore';
import { formatCurrency } from '../utils/format';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function BalanceSheetPage() {
  const activeCompany = useAppStore((s) => s.activeCompany);
  const report = useAppStore((s) => s.balanceSheet);
  const loading = useAppStore((s) => s.loading.balanceSheet);
  const loadBalanceSheet = useAppStore((s) => s.loadBalanceSheet);

  const [asOfDate, setAsOfDate] = useState(today());
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const runReport = async () => {
    if (!activeCompany) {
      return;
    }
    setError(null);
    try {
      await loadBalanceSheet(asOfDate);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run report');
    }
  };

  const onExport = async () => {
    if (!activeCompany || !report) {
      return;
    }
    setExporting(true);
    setError(null);
    try {
      await exportBalanceSheetPdf(activeCompany.name, report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const renderSection = (
    title: string,
    rows: Array<{ account_id: number; account_name: string; total: number }>,
  ) => (
    <div className="rounded-xl border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <div className="mt-3 space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">No rows in this section.</p>
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
      <PageCard title="Balance Sheet" subtitle="Simplified cash-basis balance sheet as-of a date.">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="as-of-date">As of date</Label>
            <Input type="date" value={asOfDate} onChange={(event) => setAsOfDate(event.target.value)} />
          </div>
          <div className="flex items-end gap-2 md:col-span-2">
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
          description="Run a report to view assets, liabilities, and equity balances."
        />
      ) : (
        <PageCard title={`Results (as of ${report.asOf})`}>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-sky-50 p-4">
              <div className="text-xs uppercase text-slate-500">Assets</div>
              <div className="mt-1 text-xl font-semibold text-sky-700">
                {formatCurrency(report.totalAssets)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-amber-50 p-4">
              <div className="text-xs uppercase text-slate-500">Liabilities</div>
              <div className="mt-1 text-xl font-semibold text-amber-700">
                {formatCurrency(report.totalLiabilities)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-violet-50 p-4">
              <div className="text-xs uppercase text-slate-500">Equity</div>
              <div className="mt-1 text-xl font-semibold text-violet-700">
                {formatCurrency(report.totalEquity)}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {renderSection('Assets', report.assets)}
            {renderSection('Liabilities', report.liabilities)}
            {renderSection('Equity', report.equity)}
          </div>
        </PageCard>
      )}
    </div>
  );
}
