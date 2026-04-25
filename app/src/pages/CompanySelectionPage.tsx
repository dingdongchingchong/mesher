import { useNavigate } from 'react-router-dom';
import { Button, Card, EmptyState } from '../components/ui';
import { useAppStore } from '../store/appStore';
import { formatMonthLabel } from '../utils/format';

export function CompanySelectionPage() {
  const navigate = useNavigate();
  const companies = useAppStore((state) => state.companies);
  const switchCompany = useAppStore((state) => state.switchCompany);

  if (companies.length === 0) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-4xl space-y-4">
          <EmptyState
            title="No companies yet"
            description="Create your first company to begin recording cash-basis transactions."
          />
          <Button onClick={() => navigate('/companies/new')}>Create company</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-4">
        <Card>
          <h1 className="text-xl font-semibold text-slate-900">Select company</h1>
          <p className="mt-1 text-sm text-slate-600">
            Choose the company context to continue. All data is scoped to the active company.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {companies.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">{item.name}</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs uppercase text-slate-700">
                    {item.role}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Fiscal year starts in {formatMonthLabel(item.fiscal_year_start)}
                </p>
                <Button
                  className="mt-3"
                  onClick={async () => {
                    await switchCompany(item.id);
                    navigate('/dashboard');
                  }}
                >
                  Enter company
                </Button>
              </div>
            ))}
          </div>
        </Card>
        <Button variant="secondary" onClick={() => navigate('/companies/new')}>
          Create new company
        </Button>
      </div>
    </div>
  );
}
