import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Label,
  Select,
  Table,
} from '../components/ui';
import { useAppStore } from '../store/appStore';
import type { Transaction } from '../types';
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
  const loadTransactions = useAppStore((s) => s.loadTransactions);
  const createTransaction = useAppStore((s) => s.createTransaction);
  const updateTransaction = useAppStore((s) => s.updateTransaction);
  const deleteTransaction = useAppStore((s) => s.deleteTransaction);

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
    await loadTransactions(activeCompany.id, {
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

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
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
      if (form.id) {
        await updateTransaction(activeCompany.id, form.id, {
          accountId: parsedAccountId,
          date: form.date,
          amount: parsedAmount,
          description: form.description.trim(),
        });
      } else {
        await createTransaction(activeCompany.id, {
          accountId: parsedAccountId,
          date: form.date,
          amount: parsedAmount,
          description: form.description.trim(),
        });
      }
      setForm(emptyForm());
      await refreshWithFilters();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save transaction');
    }
  }

  function onEdit(tx: Transaction) {
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
      await deleteTransaction(activeCompany.id, transactionId);
      await refreshWithFilters();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete transaction');
    }
  }

  return (
    <div className="space-y-4">
      <Card title={form.id ? 'Edit transaction' : 'Add transaction'}>
        <form className="grid gap-3 md:grid-cols-4" onSubmit={onSubmit}>
          <Field>
            <Label htmlFor="tx-date">Date</Label>
            <Input
              id="tx-date"
              type="date"
              value={form.date}
              onChange={(event) => setForm((f) => ({ ...f, date: event.target.value }))}
              required
            />
          </Field>
          <Field>
            <Label htmlFor="tx-account">Account</Label>
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
          <Field>
            <Label htmlFor="tx-amount">Amount</Label>
            <Input
              id="tx-amount"
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(event) => setForm((f) => ({ ...f, amount: event.target.value }))}
              required
            />
          </Field>
          <Field>
            <Label htmlFor="tx-description">Description</Label>
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

      <Card title="Transactions">
        <div className="mb-4 grid gap-3 md:grid-cols-5">
          <Field>
            <Label htmlFor="filter-account">Account</Label>
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
          <Field>
            <Label htmlFor="filter-from">From</Label>
            <Input
              id="filter-from"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </Field>
          <Field>
            <Label htmlFor="filter-to">To</Label>
            <Input
              id="filter-to"
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </Field>
          <Field>
            <Label htmlFor="filter-sort-by">Sort by</Label>
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
          <Field>
            <Label htmlFor="filter-sort-dir">Direction</Label>
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
          <Table
            columns={[
              {
                key: 'date',
                header: 'Date',
              },
              {
                key: 'description',
                header: 'Description',
                render: (_value, row) => row.description || '-',
              },
              {
                key: 'account_name',
                header: 'Account',
                render: (_value, row) => (
                  <div className="flex items-center gap-2">
                    <span>{row.account_name}</span>
                    <Badge>{row.account_type}</Badge>
                  </div>
                ),
              },
              {
                key: 'amount',
                header: 'Amount',
                className: 'text-right',
                render: (value) => (
                  <span className={Number(value) >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                    {formatCurrency(Number(value))}
                  </span>
                ),
              },
              {
                key: 'id',
                header: 'Actions',
                render: (_value, row) => (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => onEdit(row as Transaction)}
                    >
                      Edit
                    </Button>
                    <Button type="button" variant="danger" onClick={() => onDelete(row.id)}>
                      Delete
                    </Button>
                  </div>
                ),
              },
            ]}
            rows={transactions}
          />
        )}
      </Card>
    </div>
  );
}
