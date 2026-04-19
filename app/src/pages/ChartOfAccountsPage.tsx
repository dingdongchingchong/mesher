import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../lib/api';
import { useAppStore } from '../store/appStore';
import type { Account, AccountType } from '../types';
import { Button, Card, EmptyState, ErrorText, Input, Label, Select } from '../components/ui';

const ACCOUNT_TYPES: AccountType[] = ['income', 'expense', 'asset', 'liability', 'equity'];

export function ChartOfAccountsPage() {
  const activeCompany = useAppStore((state) => state.activeCompany);
  const accounts = useAppStore((state) => state.accounts);
  const activeRole = useAppStore((state) => state.activeRole);
  const refreshAccounts = useAppStore((state) => state.refreshAccounts);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<AccountType>('expense');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canDelete = activeRole === 'owner' || activeRole === 'admin';

  const grouped = useMemo(() => {
    return ACCOUNT_TYPES.map((accountType) => ({
      type: accountType,
      rows: accounts.filter((account) => account.type === accountType),
    }));
  }, [accounts]);

  const submitCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeCompany) return;
    if (!name.trim()) {
      setError('Account name is required');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const token = useAppStore.getState().token;
      if (!token) throw new Error('Not authenticated');
      await api.accounts.create(token, activeCompany.id, name.trim(), type, code.trim() || undefined);
      setName('');
      setCode('');
      await refreshAccounts();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not create account');
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (account: Account) => {
    setEditingId(account.id);
    setEditName(account.name);
    setEditCode(account.code ?? '');
  };

  const saveEdit = async (account: Account) => {
    if (!activeCompany) return;
    if (!editName.trim()) {
      setError('Account name is required');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const token = useAppStore.getState().token;
      if (!token) throw new Error('Not authenticated');
      await api.accounts.update(
        token,
        activeCompany.id,
        account.id,
        editName.trim(),
        editCode.trim() || undefined,
      );
      setEditingId(null);
      await refreshAccounts();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Could not update account');
    } finally {
      setBusy(false);
    }
  };

  const setAccountActive = async (account: Account, isActive: boolean) => {
    if (!activeCompany) return;
    setBusy(true);
    setError(null);
    try {
      const token = useAppStore.getState().token;
      if (!token) throw new Error('Not authenticated');
      await api.accounts.setActive(token, activeCompany.id, account.id, isActive);
      await refreshAccounts();
    } catch (stateError) {
      setError(stateError instanceof Error ? stateError.message : 'Could not update account state');
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async (account: Account) => {
    if (!activeCompany) return;
    if (!window.confirm(`Delete "${account.name}"?`)) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const token = useAppStore.getState().token;
      if (!token) throw new Error('Not authenticated');
      await api.accounts.delete(token, activeCompany.id, account.id);
      await refreshAccounts();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete account');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Chart of Accounts</h2>
        <p className="mt-1 text-sm text-slate-600">All accounts are scoped to the active company.</p>
        <form className="grid gap-3 md:grid-cols-4" onSubmit={submitCreate}>
          <div className="space-y-1">
            <Label htmlFor="new-account-name">Name</Label>
            <Input
              id="new-account-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Account name"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-account-code">Code (optional)</Label>
            <Input
              id="new-account-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="4000"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-account-type">Type</Label>
            <Select
              id="new-account-type"
              value={type}
              onChange={(event) => setType(event.target.value as AccountType)}
            >
              {ACCOUNT_TYPES.map((accountType) => (
                <option key={accountType} value={accountType}>
                  {accountType}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={busy}>
              Add account
            </Button>
          </div>
        </form>
        {error ? <ErrorText>{error}</ErrorText> : null}
      </Card>

      {grouped.map((group) => (
        <Card key={group.type}>
          <h3 className="text-base font-semibold text-slate-900">{group.type.toUpperCase()}</h3>
          {group.rows.length === 0 ? (
            <EmptyState title={`No ${group.type} accounts`} description="Create one to get started." />
          ) : (
            <div className="space-y-3">
              {group.rows.map((account) => {
                const editing = editingId === account.id;
                return (
                  <div key={account.id} className="rounded-xl border border-slate-200 p-3">
                    {editing ? (
                      <div className="grid gap-2 md:grid-cols-4">
                        <Input value={editName} onChange={(event) => setEditName(event.target.value)} />
                        <Input value={editCode} onChange={(event) => setEditCode(event.target.value)} />
                        <div className="text-sm text-slate-600 md:col-span-2">{account.type}</div>
                        <div className="flex gap-2 md:col-span-4">
                          <Button type="button" onClick={() => void saveEdit(account)} disabled={busy}>
                            Save
                          </Button>
                          <button
                            type="button"
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-medium text-slate-900">
                            {account.name}{' '}
                            {!account.is_active && (
                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700">
                                inactive
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-slate-500">
                            {account.code ? `Code ${account.code} · ` : ''}
                            Transactions: {account.transaction_count}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
                            onClick={() => startEdit(account)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
                            onClick={() => void setAccountActive(account, !account.is_active)}
                            disabled={busy}
                          >
                            {account.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          {canDelete ? (
                            <button
                              type="button"
                              className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700"
                              onClick={() => void deleteAccount(account)}
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
