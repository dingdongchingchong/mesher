import { FormEvent, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useAppStore } from '../store/appStore';
import type { Account, AccountType } from '../types';
import { EmptyState, ErrorText, Input, Label, PageCard, PrimaryButton, Select } from '../components/ui';

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
      await api.createAccount({
        companyId: activeCompany.id,
        name: name.trim(),
        type,
        code: code.trim() || null,
      });
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
      await api.updateAccount({
        companyId: activeCompany.id,
        accountId: account.id,
        name: editName.trim(),
        code: editCode.trim() || null,
      });
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
      await api.setAccountActive({
        companyId: activeCompany.id,
        accountId: account.id,
        isActive,
      });
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
      await api.deleteAccount({
        companyId: activeCompany.id,
        accountId: account.id,
      });
      await refreshAccounts();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete account');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageCard title="Chart of Accounts" subtitle="All accounts are scoped to the active company.">
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
            <PrimaryButton type="submit" disabled={busy}>
              Add account
            </PrimaryButton>
          </div>
        </form>
        {error ? <ErrorText>{error}</ErrorText> : null}
      </PageCard>

      {grouped.map((group) => (
        <PageCard key={group.type} title={group.type.toUpperCase()}>
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
                          <PrimaryButton type="button" onClick={() => void saveEdit(account)} disabled={busy}>
                            Save
                          </PrimaryButton>
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
        </PageCard>
      ))}
    </div>
  );
}
