import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../layouts/AuthLayout";
import { useAuth } from "../store/auth";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <h1 className="brand-mark text-3xl text-[var(--moss)] mb-2">Welcome back</h1>
      <p className="text-sm text-[var(--ink-soft)] mb-6">Sign in to keep asking.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-[color-mix(in_srgb,var(--danger)_10%,white)] border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] text-[var(--danger)] px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        <label className="block text-sm font-semibold text-[var(--ink-soft)]">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
          />
        </label>
        <label className="block text-sm font-semibold text-[var(--ink-soft)]">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
          />
        </label>
        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-[var(--ink-soft)]">
        No account?{" "}
        <Link to="/register" className="text-[var(--moss)] font-semibold underline-offset-2 hover:underline">
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
}
