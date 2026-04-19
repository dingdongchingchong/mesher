import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useAppStore } from '../store/appStore';
import { Button, Card, ErrorText, Field, Input, Select } from '../components/ui';

export function ProfileSettingsPage() {
  const user = useAppStore((state) => state.currentUser);
  const companies = useAppStore((state) => state.companies);
  const token = useAppStore((state) => state.token);
  const setCurrentUser = useAppStore((state) => state.setCurrentUser);
  const [name, setName] = useState(user?.name ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const companyOptions = useMemo(
    () =>
      companies.map((item) => ({
        id: item.id,
        label: `${item.name} (${item.role})`,
      })),
    [companies],
  );

  async function submitName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !token) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const next = await api.profile.updateName(token, name.trim());
      setCurrentUser(next);
      setMessage('Display name updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setBusy(false);
    }
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api.profile.changePassword(token, currentPassword, newPassword, confirmPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Password updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Profile" subtitle="Update your display name and password.">
        <form className="space-y-3" onSubmit={submitName}>
          <Field label="Display name">
            <Input value={name} onChange={(event) => setName(event.target.value)} required />
          </Field>
          <Button type="submit" loading={busy}>
            Save name
          </Button>
        </form>
      </Card>

      <Card title="Change password">
        <form className="space-y-3" onSubmit={submitPassword}>
          <Field label="Current password">
            <Input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </Field>
          <Field label="New password (min 8 chars)">
            <Input
              type="password"
              value={newPassword}
              minLength={8}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          </Field>
          <Field label="Confirm new password">
            <Input
              type="password"
              value={confirmPassword}
              minLength={8}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </Field>
          <Button type="submit" loading={busy}>
            Change password
          </Button>
        </form>
      </Card>

      <Card title="Your companies">
        {companyOptions.length === 0 ? (
          <p className="text-sm text-slate-500">You are not in any companies yet.</p>
        ) : (
          <div className="space-y-2">
            <Field label="Companies">
              <Select value={String(companyOptions[0].id)} disabled>
                {companyOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </Field>
            <ul className="list-disc pl-5 text-sm text-slate-700">
              {companyOptions.map((item) => (
                <li key={item.id}>{item.label}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {error ? <ErrorText>{error}</ErrorText> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
    </div>
  );
}
