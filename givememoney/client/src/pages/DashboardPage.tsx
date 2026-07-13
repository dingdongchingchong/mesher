import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";
import type { Contact, MoneyRequest, Stats } from "../types";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

type Tab = "ask" | "contacts" | "settings" | "history";

export function DashboardPage() {
  const authUser = useAuth((s) => s.user);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [requests, setRequests] = useState<MoneyRequest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tab, setTab] = useState<Tab>("ask");

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactError, setContactError] = useState("");

  const [selectedContact, setSelectedContact] = useState<number | "">("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState("");
  const [sending, setSending] = useState(false);
  const [blasting, setBlasting] = useState(false);

  const [template, setTemplate] = useState("");
  const [targetDollars, setTargetDollars] = useState("1000");
  const [settingsLink, setSettingsLink] = useState("");
  const [settingsMsg, setSettingsMsg] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  async function load() {
    const [c, r, s, me] = await Promise.all([
      api.getContacts(),
      api.getRequests(),
      api.getStats(),
      api.me(),
    ]);
    setContacts(c.contacts);
    setRequests(r.requests);
    setStats(s);

    const tmpl =
      me.user.messageTemplate ||
      "Hi {name}, I need your help! Can you lend me some money?";
    const target = me.user.targetAmountCents ?? 100000;
    const link = me.user.paymentLink || "";

    setTemplate(tmpl);
    setTargetDollars(String(target / 100));
    setSettingsLink(link);

    if (!message) setMessage(tmpl);
    if (!amount) setAmount(String(target / 100));
    if (!paymentLink && link) setPaymentLink(link);
  }

  useEffect(() => {
    load().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    setContactError("");
    try {
      await api.createContact({
        name: contactName,
        email: contactEmail || undefined,
        phone: contactPhone || undefined,
      });
      setContactName("");
      setContactEmail("");
      setContactPhone("");
      await load();
      setTab("ask");
    } catch (err) {
      setContactError(err instanceof Error ? err.message : "Failed to add contact");
    }
  }

  async function handleDeleteContact(id: number) {
    await api.deleteContact(id);
    await load();
    if (selectedContact === id) setSelectedContact("");
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSendError("");
    setSendSuccess("");
    setSending(true);

    const dollars = parseFloat(amount);
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setSendError("Enter a valid amount");
      setSending(false);
      return;
    }

    try {
      const result = await api.sendRequest({
        contactId: Number(selectedContact),
        amountCents: Math.round(dollars * 100),
        message,
        paymentLink: paymentLink || undefined,
        sendEmail,
        sendSms,
      });

      const channels = [result.emailSent && "email", result.smsSent && "SMS"]
        .filter(Boolean)
        .join(" and ");

      setSendSuccess(`Request sent via ${channels}!`);
      await load();
      setTab("history");
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  async function handleBlast(method: "email" | "sms" | "both") {
    setSendError("");
    setSendSuccess("");
    setBlasting(true);
    try {
      const dollars = parseFloat(amount);
      const result = await api.sendAll({
        method,
        amountCents: Number.isFinite(dollars)
          ? Math.round(dollars * 100)
          : undefined,
        message: message || undefined,
        paymentLink: paymentLink || undefined,
      });
      setSendSuccess(
        `Blast complete: ${result.sent} sent, ${result.failed} failed.`
      );
      await load();
      if (result.sent > 0) setTab("history");
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Blast failed");
    } finally {
      setBlasting(false);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSettingsError("");
    setSettingsMsg("");
    setSavingSettings(true);
    try {
      const dollars = parseFloat(targetDollars);
      if (!Number.isFinite(dollars) || dollars <= 0) {
        throw new Error("Enter a valid target amount");
      }
      await api.updateSettings({
        messageTemplate: template,
        targetAmount: dollars,
        paymentLink: settingsLink || null,
      });
      setSettingsMsg("Settings saved.");
      setMessage(template);
      setAmount(String(dollars));
      if (settingsLink) setPaymentLink(settingsLink);
      await load();
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingSettings(false);
    }
  }

  const selected = contacts.find((c) => c.id === selectedContact);

  return (
    <div className="space-y-8 animate-rise">
      <div className="hero-glow rounded-[1.4rem] px-6 py-8 text-[#f7f3e8] shadow-[0_24px_50px_rgba(15,61,46,0.22)]">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--gold-soft)] mb-2">
          {authUser?.name}&apos;s ask desk
        </p>
        <h1 className="brand-mark text-4xl sm:text-5xl leading-tight">
          Ask people for money
        </h1>
        <p className="mt-3 max-w-xl text-[color-mix(in_srgb,#f7f3e8_82%,transparent)]">
          Add contacts, set your template and target, then send email or text
          requests on your behalf.
        </p>
        {stats && (
          <div className="mt-6 grid grid-cols-3 gap-3 max-w-lg">
            <div>
              <div className="brand-mark text-3xl text-[var(--gold-soft)]">
                {stats.totalContacts}
              </div>
              <div className="text-xs uppercase tracking-wide opacity-80">Contacts</div>
            </div>
            <div>
              <div className="brand-mark text-3xl text-[var(--gold-soft)]">
                {stats.messaged}
              </div>
              <div className="text-xs uppercase tracking-wide opacity-80">Messaged</div>
            </div>
            <div>
              <div className="brand-mark text-3xl text-[var(--gold-soft)]">
                {stats.pending}
              </div>
              <div className="text-xs uppercase tracking-wide opacity-80">Pending</div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 p-1 rounded-full bg-white/40 border border-[color-mix(in_srgb,var(--moss)_10%,transparent)] w-fit">
        {(
          [
            ["ask", "Ask"],
            ["contacts", "Contacts"],
            ["settings", "Settings"],
            ["history", "History"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className="tab"
            data-active={tab === key}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "ask" && (
        <div className="grid md:grid-cols-2 gap-8 animate-rise">
          <form onSubmit={handleSend} className="panel p-6 space-y-4">
            <h2 className="brand-mark text-2xl text-[var(--moss)]">Send one request</h2>

            {sendError && (
              <div className="bg-[color-mix(in_srgb,var(--danger)_10%,white)] border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] text-[var(--danger)] px-4 py-3 rounded-lg text-sm">
                {sendError}
              </div>
            )}
            {sendSuccess && (
              <div className="bg-[color-mix(in_srgb,var(--ok)_10%,white)] border border-[color-mix(in_srgb,var(--ok)_30%,transparent)] text-[var(--ok)] px-4 py-3 rounded-lg text-sm">
                {sendSuccess}
              </div>
            )}

            <label className="block text-sm font-semibold text-[var(--ink-soft)]">
              Who to ask
              <select
                required
                value={selectedContact}
                onChange={(e) =>
                  setSelectedContact(e.target.value ? Number(e.target.value) : "")
                }
                className="field"
              >
                <option value="">Select a contact...</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.email ? ` (${c.email})` : ""}
                    {c.phone ? ` (${c.phone})` : ""}
                  </option>
                ))}
              </select>
            </label>

            {contacts.length === 0 && (
              <p className="text-sm text-[var(--ink-soft)]">
                Add a contact first in the Contacts tab.
              </p>
            )}

            <label className="block text-sm font-semibold text-[var(--ink-soft)]">
              Amount (USD)
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50.00"
                className="field"
              />
            </label>

            <label className="block text-sm font-semibold text-[var(--ink-soft)]">
              Your message
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="field resize-none"
              />
              <span className="text-xs font-normal opacity-70">
                Use {"{name}"}, {"{amount}"}, {"{sender}"} placeholders.
              </span>
            </label>

            <label className="block text-sm font-semibold text-[var(--ink-soft)]">
              Payment link (optional)
              <input
                type="url"
                value={paymentLink}
                onChange={(e) => setPaymentLink(e.target.value)}
                placeholder="https://venmo.com/..."
                className="field"
              />
            </label>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  disabled={!selected?.email}
                  onChange={(e) => setSendEmail(e.target.checked)}
                />
                Email
                {selected && !selected.email && (
                  <span className="text-[var(--ink-soft)]">(no email)</span>
                )}
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={sendSms}
                  disabled={!selected?.phone}
                  onChange={(e) => setSendSms(e.target.checked)}
                />
                Text
                {selected && !selected.phone && (
                  <span className="text-[var(--ink-soft)]">(no phone)</span>
                )}
              </label>
            </div>

            <button
              type="submit"
              disabled={sending || contacts.length === 0}
              className="btn btn-primary w-full"
            >
              {sending ? "Sending..." : "Send request"}
            </button>

            <div className="pt-2 border-t border-[color-mix(in_srgb,var(--moss)_12%,transparent)] space-y-2">
              <p className="text-sm font-semibold text-[var(--moss)]">
                Or blast all contacts
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={blasting || contacts.length === 0}
                  className="btn btn-gold"
                  onClick={() => handleBlast("email")}
                >
                  Email all
                </button>
                <button
                  type="button"
                  disabled={blasting || contacts.length === 0}
                  className="btn btn-ghost"
                  onClick={() => handleBlast("sms")}
                >
                  Text all
                </button>
                <button
                  type="button"
                  disabled={blasting || contacts.length === 0}
                  className="btn btn-ghost"
                  onClick={() => handleBlast("both")}
                >
                  Both
                </button>
              </div>
            </div>
          </form>

          <div className="panel p-6 animate-drift">
            <h3 className="brand-mark text-xl text-[var(--moss)] mb-3">Preview</h3>
            {selected ? (
              <div className="text-sm space-y-3 text-[var(--ink-soft)]">
                <p>
                  To: <strong className="text-[var(--ink)]">{selected.name}</strong>
                </p>
                <p>
                  Amount:{" "}
                  <strong className="text-[var(--ink)]">
                    {amount
                      ? formatMoney(Math.round(parseFloat(amount || "0") * 100) || 0)
                      : "—"}
                  </strong>
                </p>
                <p className="whitespace-pre-wrap border-l-2 border-[var(--gold)] pl-3 italic text-[var(--ink)]">
                  {message
                    .replaceAll("{name}", selected.name)
                    .replaceAll(
                      "{amount}",
                      amount
                        ? formatMoney(Math.round(parseFloat(amount || "0") * 100) || 0)
                        : "{amount}"
                    )
                    .replaceAll("{sender}", authUser?.name || "{sender}")}
                </p>
                {paymentLink && (
                  <p className="text-[var(--moss-mid)] truncate">Link: {paymentLink}</p>
                )}
              </div>
            ) : (
              <p className="text-[var(--ink-soft)] text-sm">
                Select a contact to preview the ask.
              </p>
            )}
          </div>
        </div>
      )}

      {tab === "contacts" && (
        <div className="grid md:grid-cols-2 gap-8 animate-rise">
          <form onSubmit={handleAddContact} className="panel p-6 space-y-4">
            <h2 className="brand-mark text-2xl text-[var(--moss)]">Add a contact</h2>
            {contactError && (
              <div className="bg-[color-mix(in_srgb,var(--danger)_10%,white)] border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] text-[var(--danger)] px-4 py-3 rounded-lg text-sm">
                {contactError}
              </div>
            )}
            <label className="block text-sm font-semibold text-[var(--ink-soft)]">
              Name
              <input
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="field"
              />
            </label>
            <label className="block text-sm font-semibold text-[var(--ink-soft)]">
              Email
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="field"
              />
            </label>
            <label className="block text-sm font-semibold text-[var(--ink-soft)]">
              Phone
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+1 555 123 4567"
                className="field"
              />
            </label>
            <p className="text-xs text-[var(--ink-soft)]">Provide at least email or phone.</p>
            <button type="submit" className="btn btn-primary w-full">
              Add contact
            </button>
          </form>

          <div className="space-y-3">
            <h2 className="brand-mark text-2xl text-[var(--moss)]">
              Your contacts ({contacts.length})
            </h2>
            {contacts.length === 0 ? (
              <p className="text-[var(--ink-soft)] text-sm">No contacts yet.</p>
            ) : (
              contacts.map((c) => (
                <div
                  key={c.id}
                  className="panel px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-semibold text-[var(--ink)]">
                      {c.name}
                      {c.messaged ? (
                        <span className="ml-2 text-xs font-medium text-[var(--ok)]">
                          messaged
                        </span>
                      ) : null}
                    </p>
                    <p className="text-sm text-[var(--ink-soft)]">
                      {[c.email, c.phone].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteContact(c.id)}
                    className="btn btn-danger text-sm py-1.5 px-3"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "settings" && (
        <form onSubmit={handleSaveSettings} className="panel p-6 space-y-4 max-w-xl animate-rise">
          <h2 className="brand-mark text-2xl text-[var(--moss)]">Ask settings</h2>
          <p className="text-sm text-[var(--ink-soft)]">
            These defaults power bulk sends and new single requests.
          </p>

          {settingsError && (
            <div className="bg-[color-mix(in_srgb,var(--danger)_10%,white)] border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] text-[var(--danger)] px-4 py-3 rounded-lg text-sm">
              {settingsError}
            </div>
          )}
          {settingsMsg && (
            <div className="bg-[color-mix(in_srgb,var(--ok)_10%,white)] border border-[color-mix(in_srgb,var(--ok)_30%,transparent)] text-[var(--ok)] px-4 py-3 rounded-lg text-sm">
              {settingsMsg}
            </div>
          )}

          <label className="block text-sm font-semibold text-[var(--ink-soft)]">
            Message template
            <textarea
              required
              rows={4}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="field resize-none"
            />
          </label>

          <label className="block text-sm font-semibold text-[var(--ink-soft)]">
            Target amount ($)
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={targetDollars}
              onChange={(e) => setTargetDollars(e.target.value)}
              className="field"
            />
          </label>

          <label className="block text-sm font-semibold text-[var(--ink-soft)]">
            Default payment link
            <input
              type="url"
              value={settingsLink}
              onChange={(e) => setSettingsLink(e.target.value)}
              placeholder="https://paypal.me/you"
              className="field"
            />
          </label>

          <button type="submit" disabled={savingSettings} className="btn btn-primary">
            {savingSettings ? "Saving..." : "Save settings"}
          </button>
        </form>
      )}

      {tab === "history" && (
        <div className="space-y-3 animate-rise">
          <h2 className="brand-mark text-2xl text-[var(--moss)]">Request history</h2>
          {requests.length === 0 ? (
            <p className="text-[var(--ink-soft)] text-sm">No requests sent yet.</p>
          ) : (
            requests.map((r) => (
              <div
                key={r.id}
                className="panel px-4 py-4 flex flex-wrap gap-4 justify-between"
              >
                <div>
                  <p className="font-semibold">
                    {formatMoney(r.amount_cents)} from {r.contact_name}
                  </p>
                  <p className="text-sm text-[var(--ink-soft)] mt-1 line-clamp-2">
                    {r.message}
                  </p>
                  <p className="text-xs text-[var(--ink-soft)] mt-2 opacity-70">
                    {formatDate(r.created_at)}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                      r.status === "sent"
                        ? "bg-[color-mix(in_srgb,var(--ok)_15%,white)] text-[var(--ok)]"
                        : r.status === "failed"
                          ? "bg-[color-mix(in_srgb,var(--danger)_12%,white)] text-[var(--danger)]"
                          : "bg-[color-mix(in_srgb,var(--gold)_18%,white)] text-[var(--ink)]"
                    }`}
                  >
                    {r.status}
                  </span>
                  <p className="text-[var(--ink-soft)] mt-2 text-xs">
                    {[r.email_sent ? "email" : null, r.sms_sent ? "sms" : null]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
