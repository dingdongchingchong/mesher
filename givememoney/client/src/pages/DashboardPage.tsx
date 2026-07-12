import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Contact, MoneyRequest } from "../types";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

export function DashboardPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [requests, setRequests] = useState<MoneyRequest[]>([]);
  const [tab, setTab] = useState<"ask" | "contacts" | "history">("ask");

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactError, setContactError] = useState("");

  const [selectedContact, setSelectedContact] = useState<number | "">("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("Hey! Could you help me out with this?");
  const [paymentLink, setPaymentLink] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(true);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const [c, r] = await Promise.all([api.getContacts(), api.getRequests()]);
    setContacts(c.contacts);
    setRequests(r.requests);
  }, []);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

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

      const channels = [
        result.emailSent && "email",
        result.smsSent && "SMS",
      ]
        .filter(Boolean)
        .join(" and ");

      setSendSuccess(`Request sent via ${channels}!`);
      setAmount("");
      await load();
      setTab("history");
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  const selected = contacts.find((c) => c.id === selectedContact);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-emerald-300 mt-1">
          Add contacts, then ask them for money by email and text.
        </p>
      </div>

      <div className="flex gap-2 border-b border-emerald-800 pb-2">
        {(["ask", "contacts", "history"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition ${
              tab === t
                ? "bg-emerald-800 text-emerald-50"
                : "text-emerald-400 hover:text-emerald-200"
            }`}
          >
            {t === "ask" ? "Ask for money" : t === "contacts" ? "Contacts" : "History"}
          </button>
        ))}
      </div>

      {tab === "ask" && (
        <div className="grid md:grid-cols-2 gap-8">
          <form
            onSubmit={handleSend}
            className="bg-emerald-900/30 border border-emerald-800 rounded-2xl p-6 space-y-4"
          >
            <h2 className="text-lg font-semibold">Send a money request</h2>

            {sendError && (
              <div className="bg-red-900/40 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">
                {sendError}
              </div>
            )}
            {sendSuccess && (
              <div className="bg-emerald-800/60 border border-emerald-600 text-emerald-100 px-4 py-3 rounded-lg text-sm">
                {sendSuccess}
              </div>
            )}

            <label className="block">
              <span className="text-sm text-emerald-300">Who to ask</span>
              <select
                required
                value={selectedContact}
                onChange={(e) =>
                  setSelectedContact(e.target.value ? Number(e.target.value) : "")
                }
                className="mt-1 w-full rounded-lg bg-emerald-950 border border-emerald-700 px-4 py-2.5"
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
              <p className="text-sm text-emerald-400">
                Add a contact first in the Contacts tab.
              </p>
            )}

            <label className="block">
              <span className="text-sm text-emerald-300">Amount (USD)</span>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50.00"
                className="mt-1 w-full rounded-lg bg-emerald-950 border border-emerald-700 px-4 py-2.5"
              />
            </label>

            <label className="block">
              <span className="text-sm text-emerald-300">Your message</span>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-1 w-full rounded-lg bg-emerald-950 border border-emerald-700 px-4 py-2.5 resize-none"
              />
            </label>

            <label className="block">
              <span className="text-sm text-emerald-300">Payment link (optional)</span>
              <input
                type="url"
                value={paymentLink}
                onChange={(e) => setPaymentLink(e.target.value)}
                placeholder="https://venmo.com/..."
                className="mt-1 w-full rounded-lg bg-emerald-950 border border-emerald-700 px-4 py-2.5"
              />
            </label>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  disabled={!selected?.email}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="rounded"
                />
                Email
                {selected && !selected.email && (
                  <span className="text-emerald-500">(no email)</span>
                )}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sendSms}
                  disabled={!selected?.phone}
                  onChange={(e) => setSendSms(e.target.checked)}
                  className="rounded"
                />
                Text message
                {selected && !selected.phone && (
                  <span className="text-emerald-500">(no phone)</span>
                )}
              </label>
            </div>

            <button
              type="submit"
              disabled={sending || contacts.length === 0}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold py-3 rounded-lg transition disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send request 💸"}
            </button>
          </form>

          <div className="bg-emerald-900/20 border border-emerald-800/60 rounded-2xl p-6">
            <h3 className="font-semibold mb-3">Preview</h3>
            {selected ? (
              <div className="text-sm space-y-2 text-emerald-200">
                <p>
                  To: <strong>{selected.name}</strong>
                </p>
                <p>
                  Amount:{" "}
                  <strong>{amount ? formatMoney(Math.round(parseFloat(amount) * 100)) : "—"}</strong>
                </p>
                <p className="whitespace-pre-wrap border-l-2 border-emerald-600 pl-3 italic">
                  {message}
                </p>
                {paymentLink && (
                  <p className="text-emerald-400 truncate">Link: {paymentLink}</p>
                )}
              </div>
            ) : (
              <p className="text-emerald-400 text-sm">Select a contact to preview.</p>
            )}
          </div>
        </div>
      )}

      {tab === "contacts" && (
        <div className="grid md:grid-cols-2 gap-8">
          <form
            onSubmit={handleAddContact}
            className="bg-emerald-900/30 border border-emerald-800 rounded-2xl p-6 space-y-4"
          >
            <h2 className="text-lg font-semibold">Add a contact</h2>
            {contactError && (
              <div className="bg-red-900/40 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">
                {contactError}
              </div>
            )}
            <label className="block">
              <span className="text-sm text-emerald-300">Name</span>
              <input
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="mt-1 w-full rounded-lg bg-emerald-950 border border-emerald-700 px-4 py-2.5"
              />
            </label>
            <label className="block">
              <span className="text-sm text-emerald-300">Email</span>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="mt-1 w-full rounded-lg bg-emerald-950 border border-emerald-700 px-4 py-2.5"
              />
            </label>
            <label className="block">
              <span className="text-sm text-emerald-300">Phone</span>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+1 555 123 4567"
                className="mt-1 w-full rounded-lg bg-emerald-950 border border-emerald-700 px-4 py-2.5"
              />
            </label>
            <p className="text-xs text-emerald-500">Provide at least email or phone.</p>
            <button
              type="submit"
              className="w-full bg-emerald-700 hover:bg-emerald-600 font-semibold py-2.5 rounded-lg transition"
            >
              Add contact
            </button>
          </form>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Your contacts ({contacts.length})</h2>
            {contacts.length === 0 ? (
              <p className="text-emerald-400 text-sm">No contacts yet.</p>
            ) : (
              contacts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between bg-emerald-900/30 border border-emerald-800 rounded-xl px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-emerald-400">
                      {[c.email, c.phone].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteContact(c.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Request history</h2>
          {requests.length === 0 ? (
            <p className="text-emerald-400 text-sm">No requests sent yet.</p>
          ) : (
            requests.map((r) => (
              <div
                key={r.id}
                className="bg-emerald-900/30 border border-emerald-800 rounded-xl px-4 py-4 flex flex-wrap gap-4 justify-between"
              >
                <div>
                  <p className="font-medium">
                    {formatMoney(r.amount_cents)} from {r.contact_name}
                  </p>
                  <p className="text-sm text-emerald-400 mt-1 line-clamp-2">{r.message}</p>
                  <p className="text-xs text-emerald-500 mt-2">{formatDate(r.created_at)}</p>
                </div>
                <div className="text-right text-sm">
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      r.status === "sent"
                        ? "bg-emerald-800 text-emerald-200"
                        : r.status === "failed"
                          ? "bg-red-900 text-red-200"
                          : "bg-yellow-900 text-yellow-200"
                    }`}
                  >
                    {r.status}
                  </span>
                  <p className="text-emerald-500 mt-2 text-xs">
                    {r.email_sent ? "✉️ email" : ""}
                    {r.email_sent && r.sms_sent ? " · " : ""}
                    {r.sms_sent ? "📱 sms" : ""}
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
