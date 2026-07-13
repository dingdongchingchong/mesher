import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between">
        <span className="brand-mark text-2xl text-[var(--moss)]">GiveMeMoney</span>
        <div className="flex items-center gap-3">
          <Link to="/login" className="btn btn-ghost text-sm py-2 px-4">
            Sign in
          </Link>
          <Link to="/register" className="btn btn-primary text-sm py-2 px-4">
            Create account
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="hero-glow mx-4 sm:mx-auto max-w-5xl rounded-[1.75rem] min-h-[72vh] flex items-end px-6 sm:px-10 py-12 text-[#f7f3e8] shadow-[0_30px_80px_rgba(15,61,46,0.25)]">
          <div className="max-w-2xl animate-rise">
            <h1 className="brand-mark text-5xl sm:text-7xl leading-[0.95] tracking-tight">
              GiveMeMoney
            </h1>
            <p className="mt-5 text-lg sm:text-xl text-[color-mix(in_srgb,#f7f3e8_86%,transparent)] max-w-lg animate-rise-delay">
              Create an account. Add the people who owe you. We email and text them asking for money — for you.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 animate-rise-delay">
              <Link to="/register" className="btn btn-gold">
                Start asking
              </Link>
              <Link to="/login" className="btn btn-ghost border-[color-mix(in_srgb,#f7f3e8_35%,transparent)] text-[#f7f3e8]">
                I already have an account
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-16 grid md:grid-cols-3 gap-10">
        <div className="animate-rise">
          <h2 className="brand-mark text-2xl text-[var(--moss)] mb-2">Account</h2>
          <p className="text-[var(--ink-soft)] text-sm leading-relaxed">
            Register once. Your name appears on every money request you send.
          </p>
        </div>
        <div className="animate-rise-delay">
          <h2 className="brand-mark text-2xl text-[var(--moss)] mb-2">Contacts</h2>
          <p className="text-[var(--ink-soft)] text-sm leading-relaxed">
            Save emails and phone numbers for the people you want to ask.
          </p>
        </div>
        <div className="animate-rise-delay">
          <h2 className="brand-mark text-2xl text-[var(--moss)] mb-2">Ask</h2>
          <p className="text-[var(--ink-soft)] text-sm leading-relaxed">
            Send one request or blast your whole list with a reusable template.
          </p>
        </div>
      </section>
    </div>
  );
}
