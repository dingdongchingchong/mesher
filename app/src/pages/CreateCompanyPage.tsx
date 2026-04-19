import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { Button, ErrorText, Field, Input, Select } from '../components/ui';
import { useAppStore } from '../store/appStore';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function CreateCompanyPage() {
  const navigate = useNavigate();
  const createCompany = useAppStore((state) => state.createCompany);
  const loading = useAppStore((state) => state.loading.companies);

  const [name, setName] = useState('');
  const [fiscalYearStart, setFiscalYearStart] = useState('1');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await createCompany(name, Number(fiscalYearStart));
      navigate('/dashboard');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create company');
    }
  }

  return (
    <AuthLayout
      title="Create a company"
      subtitle="Set up your workspace and seed the default chart of accounts."
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field label="Company name">
          <Input
            id="company-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </Field>
        <Field label="Fiscal year start month">
          <Select
            id="fiscal-start"
            value={fiscalYearStart}
            onChange={(event) => setFiscalYearStart(event.target.value)}
          >
            {MONTHS.map((month, index) => (
              <option key={month} value={index + 1}>
                {month}
              </option>
            ))}
          </Select>
        </Field>
        {error ? <ErrorText>{error}</ErrorText> : null}
        <Button type="submit" loading={loading} className="w-full">
          Create company
        </Button>
      </form>
    </AuthLayout>
  );
}
