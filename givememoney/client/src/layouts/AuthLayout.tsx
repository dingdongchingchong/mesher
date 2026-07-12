import { Link } from "react-router-dom";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <Link to="/" className="flex items-center gap-2 font-bold text-3xl mb-8">
        <span>💸</span>
        <span>GiveMeMoney</span>
      </Link>
      <div className="w-full max-w-md bg-emerald-900/40 border border-emerald-800 rounded-2xl p-8 shadow-xl">
        {children}
      </div>
      <p className="mt-6 text-emerald-400/70 text-sm text-center max-w-md">
        Create an account and we&apos;ll message or email people asking for money on your behalf.
      </p>
    </div>
  );
}
