import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/appStore';
import type { CompanyRole } from '../types';
import { Button, Card, Field, Input, Select } from '../components/ui';

export function CompanySettingsPage() {
  const activeCompany = useAppStore((state) => state.activeCompany);
  const activeRole = useAppStore((state) => state.activeRole);
  const currentUser = useAppStore((state) => state.currentUser);
  const members = useAppStore((state) => state.members);
  const memberships = useAppStore((state) => state.memberships);
  const setMemberships = useAppStore((state) => state.setMemberships);
  const setActiveCompany = useAppStore((state) => state.setActiveCompany);
  const fetchMembers = useAppStore((state) => state.fetchMembers);
  const logout = useAppStore((state) => state.logout);

  const [name, setName] = useState('');
  const [fiscalMonth, setFiscalMonth] = useState('1');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<CompanyRole>('member');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeCompany) return;
    setName(activeCompany.name);
    setFiscalMonth(String(activeCompany.fiscal_year_start));
  }, [activeCompany]);

  useEffect(() => {
    if (!activeCompany) return;
    void fetchMembers();
  }, [activeCompany, fetchMembers]);

  if (!activeCompany || !currentUser) {
    return (
      <Card title="Company settings">
        <p className="text-sm text-slate-500">Select a company to manage settings.</p>
      </Card>
    );
  }

  const canManageCompany = activeRole === 'owner' || activeRole === 'admin';
  const isOwner = activeRole === 'owner';
  const canManageUsers = canManageCompany;

  const ownedCount = members.filter((member) => member.role === 'owner').length;
  const roleOptions: CompanyRole[] = ['member', 'admin'];

  async function onSaveCompany(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageCompany) return;
    setError(null);
    setSaving(true);
    try {
      const updated = await window.api.companies.update({
        token: useAppStore.getState().token!,
        companyId: activeCompany.id,
        name,
        fiscalYearStart: Number(fiscalMonth),
      });
      const updatedMemberships = memberships.map((membership) =>
        membership.id === updated.id
          ? { ...membership, name: updated.name, fiscal_year_start: updated.fiscal_year_start }
          : membership
      );
      setMemberships(updatedMemberships);
      const selected = updatedMemberships.find((item) => item.id === updated.id);
      if (selected) {
        setActiveCompany(selected, activeRole);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to update company');
    } finally {
      setSaving(false);
    }
  }

  async function onInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageUsers) return;
    setError(null);
    setSaving(true);
    try {
      await window.api.companies.addMember({
        token: useAppStore.getState().token!,
        companyId: activeCompany.id,
        email: inviteEmail,
        role: inviteRole,
      });
      setInviteEmail('');
      setInviteRole('member');
      await fetchMembers();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to invite member');
    } finally {
      setSaving(false);
    }
  }

  async function onRoleChange(membershipId: number, role: CompanyRole) {
    if (!canManageUsers) return;
    setError(null);
    setSaving(true);
    try {
      await window.api.companies.updateMemberRole({
        token: useAppStore.getState().token!,
        companyId: activeCompany.id,
        membershipId,
        role,
      });
      await fetchMembers();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to update role');
    } finally {
      setSaving(false);
    }
  }

  async function onRemove(membershipId: number) {
    if (!canManageUsers) return;
    if (!window.confirm('Remove this member from the company?')) return;
    setError(null);
    setSaving(true);
    try {
      await window.api.companies.removeMember({
        token: useAppStore.getState().token!,
        companyId: activeCompany.id,
        membershipId,
      });
      await fetchMembers();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to remove member');
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteCompany() {
    if (!isOwner) return;
    const phrase = activeCompany.name;
    const confirmText = window.prompt(
      `Type "${phrase}" to permanently delete this company and all data.`
    );
    if (confirmText !== phrase) {
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await window.api.companies.delete({
        token: useAppStore.getState().token!,
        companyId: activeCompany.id,
      });
      const updated = memberships.filter((m) => m.id !== activeCompany.id);
      setMemberships(updated);
      if (updated.length > 0) {
        const next = updated[0];
        setActiveCompany(next, next.role);
      } else {
        setActiveCompany(null, null);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to delete company');
    } finally {
      setSaving(false);
    }
  }

  const nonOwnerRoleOptions = useMemo(
    () =>
      roleOptions.map((role) => (
        <option key={role} value={role}>
          {role}
        </option>
      )),
    []
  );

  return (
    <div className="space-y-4">
      <Card title="Company settings" subtitle="Edit name and fiscal year start month.">
        <form className="grid gap-3 md:grid-cols-3" onSubmit={onSaveCompany}>
          <Field label="Company name">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={!canManageCompany || saving}
              required
            />
          </Field>
          <Field label="Fiscal year start month">
            <Select
              value={fiscalMonth}
              onChange={(event) => setFiscalMonth(event.target.value)}
              disabled={!canManageCompany || saving}
            >
              {Array.from({ length: 12 }, (_, index) => {
                const month = index + 1;
                return (
                  <option key={month} value={month}>
                    {month}
                  </option>
                );
              })}
            </Select>
          </Field>
          <div className="flex items-end">
            <Button disabled={!canManageCompany || saving} type="submit">
              Save company
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Manage users" subtitle="Owner/admin can add members by email.">
        {!canManageUsers ? (
          <p className="text-sm text-slate-500">You do not have permission to manage users.</p>
        ) : (
          <>
            <form className="grid gap-3 md:grid-cols-3" onSubmit={onInvite}>
              <Field label="User email">
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  disabled={saving}
                  required
                />
              </Field>
              <Field label="Role">
                <Select
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value as CompanyRole)}
                  disabled={saving}
                >
                  {nonOwnerRoleOptions}
                </Select>
              </Field>
              <div className="flex items-end">
                <Button disabled={saving} type="submit">
                  Add member
                </Button>
              </div>
            </form>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-2">Name</th>
                    <th className="pb-2">Email</th>
                    <th className="pb-2">Role</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {members.map((member) => (
                    <tr key={member.id}>
                      <td className="py-2">{member.name}</td>
                      <td className="py-2 text-slate-600">{member.email}</td>
                      <td className="py-2">
                        {member.role === 'owner' ? (
                          <span className="rounded bg-slate-100 px-2 py-1 text-xs uppercase">
                            owner
                          </span>
                        ) : (
                          <select
                            value={member.role}
                            onChange={(event) =>
                              void onRoleChange(member.id, event.target.value as CompanyRole)
                            }
                            disabled={saving}
                            className="rounded border border-slate-300 px-2 py-1"
                          >
                            {nonOwnerRoleOptions}
                          </select>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        {member.role !== 'owner' ? (
                          <button
                            className="text-xs font-medium text-rose-600"
                            onClick={() => void onRemove(member.id)}
                            disabled={saving}
                          >
                            Remove
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">
                            {ownedCount > 1 ? 'Owner' : 'Primary owner'}
                          </span>
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

      <Card title="Danger zone" subtitle="Permanent actions.">
        <div className="flex items-center justify-between rounded border border-rose-200 bg-rose-50 p-3">
          <div>
            <div className="font-medium text-rose-900">Delete company</div>
            <p className="text-sm text-rose-800">
              Hard delete company, accounts, transactions, and memberships.
            </p>
          </div>
          <Button variant="danger" disabled={!isOwner || saving} onClick={onDeleteCompany}>
            Delete
          </Button>
        </div>
      </Card>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <button className="hidden" onClick={() => void logout()} type="button" />
    </div>
  );
}
