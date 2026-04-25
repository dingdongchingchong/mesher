import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Label,
  Select,
} from '../components/ui';
import { api } from '../lib/api';
import { useAppStore } from '../store/appStore';
import type { LedgerTransaction } from '../types';
import { formatCurrency } from '../utils/format';

type TxForm = {
  id: number | null;
  date: string;
  accountId: string;
  amount: string;
  description: string;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): TxForm {
  return {
    id: null,
    date: todayIso(),
    accountId: '',
    amount: '',
    description: '',
  };
}

export function TransactionsPage() {
  const activeCompany = useAppStore((s) => s.activeCompany);
  const accounts = useAppStore((s) => s.accounts);
  const transactions = useAppStore((s) => s.transactions);
  const token = useAppStore((s) => s.token);
  const refreshTransactions = useAppStore((s) => s.refreshTransactions);
  const refreshDashboard = useAppStore((s) => s.refreshDashboard);

  const [form, setForm] = useState<TxForm>(emptyForm());
  const [accountId, setAccountId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'description'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [error, setError] = useState<string | null>(null);

  const activeAccounts = useMemo(
    () => accounts.filter((account) => account.is_active),
    [accounts],
  );

  async function refreshWithFilters() {
    if (!activeCompany) return;
    await refreshTransactions({
      accountId: accountId ? Number(accountId) : undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      sortBy,
      sortDir,
    });
  }

  async function onApplyFilters() {
    setError(null);
    try {
      await refreshWithFilters();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeCompany) return;
    setError(null);

    const parsedAccountId = Number(form.accountId);
    const parsedAmount = Number(form.amount);
    if (!parsedAccountId || Number.isNaN(parsedAmount) || !form.date) {
      setError('Date, account, and amount are required.');
      return;
    }
    if (parsedAmount === 0) {
      setError('Amount must be non-zero.');
      return;
    }

    try {
      if (!token) {
        throw new Error('Not authenticated');
      }
      if (form.id) {
        await api.transactions.update(
          token,
          activeCompany.id,
          form.id,
          parsedAccountId,
          form.date,
          parsedAmount,
          form.description.trim(),
        );
      } else {
        await api.transactions.create(
          token,
          activeCompany.id,
          parsedAccountId,
          form.date,
          parsedAmount,
          form.description.trim(),
        );
      }
      setForm(emptyForm());
      await refreshWithFilters();
      await refreshDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save transaction');
    }
  }

  function onEdit(tx: LedgerTransaction) {
    setForm({
      id: tx.id,
      date: tx.date,
      accountId: String(tx.account_id),
      amount: String(tx.amount),
      description: tx.description ?? '',
    });
  }

  async function onDelete(transactionId: number) {
    if (!activeCompany) return;
    if (!window.confirm('Delete this transaction?')) return;
    setError(null);
    try {
      if (!token) {
        throw new Error('Not authenticated');
      }
      await api.transactions.delete(token, activeCompany.id, transactionId);
      await refreshWithFilters();
      await refreshDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete transaction');
    }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {form.id ? 'Edit transaction' : 'Add transaction'}
          </h2>
        </div>
        <form className="grid gap-3 md:grid-cols-4" onSubmit={onSubmit}>
          <Field label="Date">
            <Label htmlFor="tx-date" className="sr-only">
              Date
            </Label>
            <Input
              id="tx-date"
              type="date"
              value={form.date}
              onChange={(event) => setForm((f) => ({ ...f, date: event.target.value }))}
              required
            />
          </Field>
          <Field label="Account">
            <Label htmlFor="tx-account" className="sr-only">
              Account
            </Label>
            <Select
              id="tx-account"
              value={form.accountId}
              onChange={(event) => setForm((f) => ({ ...f, accountId: event.target.value }))}
              required
            >
              <option value="">Select account</option>
              {activeAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Amount">
            <Label htmlFor="tx-amount" className="sr-only">
              Amount
            </Label>
            <Input
              id="tx-amount"
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(event) => setForm((f) => ({ ...f, amount: event.target.value }))}
              required
            />
          </Field>
          <Field label="Description">
            <Label htmlFor="tx-description" className="sr-only">
              Description
            </Label>
            <Input
              id="tx-description"
              value={form.description}
              onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))}
              placeholder="Optional"
            />
          </Field>

          {error ? <p className="text-sm text-rose-600 md:col-span-4">{error}</p> : null}
          <div className="flex gap-2 md:col-span-4">
            <Button type="submit">{form.id ? 'Update transaction' : 'Add transaction'}</Button>
            {form.id ? (
              <Button type="button" variant="secondary" onClick={() => setForm(emptyForm())}>
                Cancel edit
              </Button>
            ) : null}
          </div>
        </form>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Transactions</h2>
        <div className="mb-4 grid gap-3 md:grid-cols-5">
          <Field label="Account">
            <Label htmlFor="filter-account" className="sr-only">
              Account
            </Label>
            <Select
              id="filter-account"
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
            >
              <option value="">All accounts</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="From">
            <Label htmlFor="filter-from" className="sr-only">
              From
            </Label>
            <Input
              id="filter-from"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </Field>
          <Field label="To">
            <Label htmlFor="filter-to" className="sr-only">
              To
            </Label>
            <Input
              id="filter-to"
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </Field>
          <Field label="Sort by">
            <Label htmlFor="filter-sort-by" className="sr-only">
              Sort by
            </Label>
            <Select
              id="filter-sort-by"
              value={sortBy}
              onChange={(event) =>
                setSortBy(event.target.value as 'date' | 'amount' | 'description')
              }
            >
              <option value="date">Date</option>
              <option value="amount">Amount</option>
              <option value="description">Description</option>
            </Select>
          </Field>
          <Field label="Direction">
            <Label htmlFor="filter-sort-dir" className="sr-only">
              Direction
            </Label>
            <Select
              id="filter-sort-dir"
              value={sortDir}
              onChange={(event) => setSortDir(event.target.value as 'asc' | 'desc')}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </Select>
          </Field>
        </div>
        <div className="mb-4">
          <Button onClick={onApplyFilters}>Apply filters</Button>
        </div>

        {transactions.length === 0 ? (
          <EmptyState
            title="No transactions"
            description="Create the first cash movement for this company."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Account</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{row.date}</td>
                    <td className="px-3 py-2">{row.description || '-'}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span>{row.account_name}</span>
                        <Badge>{row.account_type}</Badge>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className={row.amount >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                        {formatCurrency(row.amount)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <Button type="button" variant="secondary" onClick={() => onEdit(row)}>
                          Edit
                        </Button>
                        <Button type="button" variant="danger" onClick={() => onDelete(row.id)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
