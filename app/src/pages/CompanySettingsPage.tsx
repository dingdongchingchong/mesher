import { useState } from 'react';
import { api } from '../lib/api';
import { useAppStore } from '../store/appStore';
import { Button, Card, ErrorText, Field, Input, Select } from '../components/ui';
import type { Role } from '../types';
import { formatMonthLabel } from '../utils/format';

export function CompanySettingsPage() {
  const token = useAppStore((state) => state.token);
  const selectedCompany = useAppStore((state) => state.activeCompany);
  const activeRole = useAppStore((state) => state.activeRole);
  const companies = useAppStore((state) => state.companies);
  const reloadCompanies = useAppStore((state) => state.reloadCompanies);
  const switchCompany = useAppStore((state) => state.switchCompany);
  const loadMembers = useAppStore((state) => state.loadMembers);
  const members = useAppStore((state) => state.members);

  const [nameDraft, setNameDraft] = useState('');
  const [fiscalYearStartDraft, setFiscalYearStartDraft] = useState('1');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!selectedCompany || !token) {
    return (
      <Card>
        <p className="text-sm text-slate-600">No active company.</p>
      </Card>
    );
  }

  const activeCompany = selectedCompany;
  const authToken = token;
  const name = nameDraft || activeCompany.name;
  const fiscalYearStart = fiscalYearStartDraft || String(activeCompany.fiscal_year_start);

  const canManageCompany = activeRole === 'owner' || activeRole === 'admin';
  const canManageUsers = canManageCompany;
  const isOwner = activeRole === 'owner';

  async function onSaveCompany(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageCompany) return;
    setError(null);
    setBusy(true);
    try {
      const updated = await api.companies.update(
        authToken,
        activeCompany.id,
        name.trim(),
        Number(fiscalYearStart),
      );

      await reloadCompanies();
      await switchCompany(updated.id);
      setNameDraft('');
      setFiscalYearStartDraft('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to update company');
    } finally {
      setBusy(false);
    }
  }

  async function onInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageUsers) return;
    setError(null);
    setBusy(true);
    try {
      await api.companies.addMember(authToken, activeCompany.id, inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      setInviteRole('member');
      await loadMembers();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to add member');
    } finally {
      setBusy(false);
    }
  }

  async function onChangeRole(membershipId: number, nextRole: Role) {
    if (!canManageUsers || nextRole === 'owner') return;
    setError(null);
    setBusy(true);
    try {
      await api.companies.updateMemberRole(authToken, activeCompany.id, membershipId, nextRole);
      await loadMembers();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to change role');
    } finally {
      setBusy(false);
    }
  }

  async function onRemoveMember(membershipId: number) {
    if (!canManageUsers) return;
    if (!window.confirm('Remove this member from the company?')) return;
    setError(null);
    setBusy(true);
    try {
      await api.companies.removeMember(authToken, activeCompany.id, membershipId);
      await loadMembers();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to remove member');
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteCompany() {
    if (!isOwner) return;
    const confirmation = window.prompt(
      `Type "${activeCompany.name}" to permanently delete this company.`,
    );
    if (confirmation !== activeCompany.name) return;
    setError(null);
    setBusy(true);
    try {
      await api.companies.delete(authToken, activeCompany.id);
      const nextCompanies = companies.filter((company) => company.id !== activeCompany.id);
      await reloadCompanies();
      if (nextCompanies.length > 0) {
        const first = nextCompanies[0];
        await switchCompany(first.id);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to delete company');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Company settings</h2>
        <p className="mt-1 text-sm text-slate-600">
          Active company: {activeCompany.name} (fiscal year starts {formatMonthLabel(activeCompany.fiscal_year_start)})
        </p>
        <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={onSaveCompany}>
          <Field label="Company name">
            <Input
              value={name}
              onChange={(event) => setNameDraft(event.target.value)}
              disabled={!canManageCompany || busy}
              required
            />
          </Field>
          <Field label="Fiscal year start month">
            <Select
              value={fiscalYearStart}
              onChange={(event) => setFiscalYearStartDraft(event.target.value)}
              disabled={!canManageCompany || busy}
            >
              {Array.from({ length: 12 }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={!canManageCompany || busy}>
              Save company
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Manage users</h2>
        {!canManageUsers ? (
          <p className="mt-2 text-sm text-slate-600">Only owner/admin can manage users.</p>
        ) : (
          <>
            <form className="mt-3 grid gap-3 md:grid-cols-3" onSubmit={onInvite}>
              <Field label="Email">
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  required
                />
              </Field>
              <Field label="Role">
                <Select
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value as 'admin' | 'member')}
                >
                  <option value="member">member</option>
                  <option value="admin">admin</option>
                </Select>
              </Field>
              <div className="flex items-end">
                <Button type="submit" disabled={busy}>
                  Add member
                </Button>
              </div>
            </form>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-2 py-2">Name</th>
                    <th className="px-2 py-2">Email</th>
                    <th className="px-2 py-2">Role</th>
                    <th className="px-2 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id} className="border-t border-slate-100">
                      <td className="px-2 py-2">{member.name}</td>
                      <td className="px-2 py-2 text-slate-600">{member.email}</td>
                      <td className="px-2 py-2">
                        {member.role === 'owner' ? (
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs uppercase">
                            owner
                          </span>
                        ) : (
                          <select
                            value={member.role}
                            onChange={(event) => void onChangeRole(member.id, event.target.value as Role)}
                            className="rounded border border-slate-300 px-2 py-1"
                            disabled={busy}
                          >
                            <option value="member">member</option>
                            <option value="admin">admin</option>
                          </select>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {member.role === 'owner' ? null : (
                          <Button
                            type="button"
                            variant="danger"
                            onClick={() => void onRemoveMember(member.id)}
                            disabled={busy}
                          >
                            Remove
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-rose-700">Danger zone</h2>
        <p className="mt-1 text-sm text-rose-600">
          Delete company performs a hard delete of all company data.
        </p>
        <div className="mt-3">
          <Button type="button" variant="danger" disabled={!isOwner || busy} onClick={onDeleteCompany}>
            Delete company
          </Button>
        </div>
      </Card>
      {error ? <ErrorText>{error}</ErrorText> : null}
    </div>
  );
}
