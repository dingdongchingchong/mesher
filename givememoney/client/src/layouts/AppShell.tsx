import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-[color-mix(in_srgb,var(--moss)_12%,transparent)] bg-[color-mix(in_srgb,var(--paper)_88%,transparent)] backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="brand-mark text-2xl text-[var(--moss)]">
            GiveMeMoney
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-[var(--ink-soft)] hidden sm:inline">
              Hi, {user?.name}
            </span>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="text-[var(--moss-mid)] hover:text-[var(--moss)] font-semibold transition"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
