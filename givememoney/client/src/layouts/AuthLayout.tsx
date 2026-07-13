import { Link } from "react-router-dom";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <Link to="/" className="brand-mark text-4xl text-[var(--moss)] mb-8 animate-rise">
        GiveMeMoney
      </Link>
      <div className="panel w-full max-w-md p-8 shadow-[0_20px_60px_rgba(20,38,28,0.08)] animate-rise-delay">
        {children}
      </div>
      <p className="mt-6 text-[var(--ink-soft)] text-sm text-center max-w-md animate-rise-delay">
        Create an account and we&apos;ll email or text people asking for money on your behalf.
      </p>
    </div>
  );
}
