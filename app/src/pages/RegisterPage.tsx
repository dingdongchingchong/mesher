import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { Button, ErrorText, Field, Input, Notice } from '../components/ui';
import { useAppStore } from '../store/appStore';

export function RegisterPage() {
  const navigate = useNavigate();
  const currentUser = useAppStore((state) => state.currentUser);
  const register = useAppStore((state) => state.register);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await register(name, email, password, confirmPassword);
      if (result.needsCompanyCreation) {
        navigate('/companies/new', { replace: true });
      } else {
        navigate('/companies/select', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Create account" subtitle="Register with local auth (bcrypt password hashing).">
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field label="Name">
          <Input id="name" required value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Email">
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label="Password">
          <Input
            id="password"
            type="password"
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        <Field label="Confirm password">
          <Input
            id="confirmPassword"
            type="password"
            minLength={8}
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </Field>
        {error ? <ErrorText>{error}</ErrorText> : null}
        <Button type="submit" className="w-full" loading={loading}>
          Create account
        </Button>
      </form>
      <Notice className="mt-4">Passwords are hashed with bcrypt and never stored in plain text.</Notice>
      <p className="mt-4 text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-indigo-700 hover:text-indigo-600">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
