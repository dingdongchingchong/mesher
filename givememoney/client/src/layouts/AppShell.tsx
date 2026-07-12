import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <header className="border-b border-emerald-800/60 bg-emerald-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 font-bold text-xl">
            <span>💸</span>
            <span>GiveMeMoney</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-emerald-300 hidden sm:inline">Hi, {user?.name}</span>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="text-emerald-400 hover:text-emerald-200 transition"
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
