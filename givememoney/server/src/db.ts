import { createRequire } from "node:module";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import type BetterSqlite3 from "better-sqlite3";

// Prefer the Termux/Android fork when present; fall back to upstream better-sqlite3.
// On Termux, install via `npm run install:termux` (see givememoney/README.md).
const require = createRequire(import.meta.url);

function loadDatabase(): typeof BetterSqlite3 {
  try {
    return require("@mmmbuto/better-sqlite3-termux") as typeof BetterSqlite3;
  } catch {
    return require("better-sqlite3") as typeof BetterSqlite3;
  }
}

const Database = loadDatabase();

export type User = {
  id: number;
  email: string;
  name: string;
  message_template: string;
  target_amount_cents: number;
  payment_link: string | null;
  created_at: string;
};

export type Contact = {
  id: number;
  user_id: number;
  name: string;
  email: string | null;
  phone: string | null;
  messaged: number;
  created_at: string;
};

export type MoneyRequest = {
  id: number;
  user_id: number;
  contact_id: number;
  amount_cents: number;
  message: string;
  payment_link: string | null;
  status: "pending" | "sent" | "failed";
  email_sent: number;
  sms_sent: number;
  created_at: string;
  sent_at: string | null;
};

export type UserStats = {
  totalContacts: number;
  messaged: number;
  pending: number;
  totalRequests: number;
  targetAmountCents: number;
};

const DEFAULT_TEMPLATE =
  "Hi {name}, I need your help! Can you lend me some money?";

let db: BetterSqlite3.Database;

export function initDb(dbPath: string) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      message_template TEXT NOT NULL DEFAULT 'Hi {name}, I need your help! Can you lend me some money?',
      target_amount_cents INTEGER NOT NULL DEFAULT 100000,
      payment_link TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      messaged INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS money_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      amount_cents INTEGER NOT NULL,
      message TEXT NOT NULL,
      payment_link TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      email_sent INTEGER NOT NULL DEFAULT 0,
      sms_sent INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      sent_at TEXT
    );
  `);

  migrateUsersTable();
  migrateContactsTable();

  return db;
}

function migrateUsersTable() {
  const cols = getDb()
    .prepare("PRAGMA table_info(users)")
    .all() as { name: string }[];
  const names = new Set(cols.map((c) => c.name));

  if (!names.has("message_template")) {
    getDb().exec(
      `ALTER TABLE users ADD COLUMN message_template TEXT NOT NULL DEFAULT '${DEFAULT_TEMPLATE.replace(/'/g, "''")}'`
    );
  }
  if (!names.has("target_amount_cents")) {
    getDb().exec(
      "ALTER TABLE users ADD COLUMN target_amount_cents INTEGER NOT NULL DEFAULT 100000"
    );
  }
  if (!names.has("payment_link")) {
    getDb().exec("ALTER TABLE users ADD COLUMN payment_link TEXT");
  }
}

function migrateContactsTable() {
  const cols = getDb()
    .prepare("PRAGMA table_info(contacts)")
    .all() as { name: string }[];
  const names = new Set(cols.map((c) => c.name));
  if (!names.has("messaged")) {
    getDb().exec(
      "ALTER TABLE contacts ADD COLUMN messaged INTEGER NOT NULL DEFAULT 0"
    );
  }
}

export function getDb() {
  if (!db) throw new Error("Database not initialized");
  return db;
}

export function createUser(email: string, name: string, password: string): User {
  const passwordHash = bcrypt.hashSync(password, 10);
  const stmt = getDb().prepare(
    "INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)"
  );
  const result = stmt.run(email.toLowerCase().trim(), name.trim(), passwordHash);
  return getUserById(Number(result.lastInsertRowid))!;
}

export function getUserByEmail(email: string) {
  return getDb()
    .prepare(
      "SELECT id, email, name, password_hash, message_template, target_amount_cents, payment_link, created_at FROM users WHERE email = ?"
    )
    .get(email.toLowerCase().trim()) as
    | (User & { password_hash: string })
    | undefined;
}

export function getUserById(id: number): User | undefined {
  return getDb()
    .prepare(
      "SELECT id, email, name, message_template, target_amount_cents, payment_link, created_at FROM users WHERE id = ?"
    )
    .get(id) as User | undefined;
}

export function verifyPassword(user: { password_hash: string }, password: string) {
  return bcrypt.compareSync(password, user.password_hash);
}

export function updateUserSettings(
  userId: number,
  settings: {
    messageTemplate?: string;
    targetAmountCents?: number;
    paymentLink?: string | null;
  }
): User {
  const user = getUserById(userId);
  if (!user) throw new Error("User not found");

  const messageTemplate = settings.messageTemplate ?? user.message_template;
  const targetAmountCents =
    settings.targetAmountCents ?? user.target_amount_cents;
  const paymentLink =
    settings.paymentLink !== undefined
      ? settings.paymentLink
      : user.payment_link;

  getDb()
    .prepare(
      `UPDATE users
       SET message_template = ?, target_amount_cents = ?, payment_link = ?
       WHERE id = ?`
    )
    .run(messageTemplate, targetAmountCents, paymentLink, userId);

  return getUserById(userId)!;
}

export function createContact(
  userId: number,
  name: string,
  email: string | null,
  phone: string | null
): Contact {
  const stmt = getDb().prepare(
    "INSERT INTO contacts (user_id, name, email, phone) VALUES (?, ?, ?, ?)"
  );
  const result = stmt.run(
    userId,
    name.trim(),
    email?.trim() || null,
    phone?.trim() || null
  );
  return getContactById(Number(result.lastInsertRowid))!;
}

export function getContactsByUser(userId: number): Contact[] {
  return getDb()
    .prepare("SELECT * FROM contacts WHERE user_id = ? ORDER BY name")
    .all(userId) as Contact[];
}

export function getContactById(id: number): Contact | undefined {
  return getDb().prepare("SELECT * FROM contacts WHERE id = ?").get(id) as
    | Contact
    | undefined;
}

export function deleteContact(userId: number, contactId: number): boolean {
  const result = getDb()
    .prepare("DELETE FROM contacts WHERE id = ? AND user_id = ?")
    .run(contactId, userId);
  return result.changes > 0;
}

export function markContactMessaged(contactId: number) {
  getDb()
    .prepare("UPDATE contacts SET messaged = 1 WHERE id = ?")
    .run(contactId);
}

export function createMoneyRequest(
  userId: number,
  contactId: number,
  amountCents: number,
  message: string,
  paymentLink: string | null
): MoneyRequest {
  const stmt = getDb().prepare(`
    INSERT INTO money_requests (user_id, contact_id, amount_cents, message, payment_link)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(userId, contactId, amountCents, message, paymentLink);
  return getMoneyRequestById(Number(result.lastInsertRowid))!;
}

export function getMoneyRequestsByUser(userId: number) {
  return getDb()
    .prepare(
      `
      SELECT mr.*, c.name as contact_name, c.email as contact_email, c.phone as contact_phone
      FROM money_requests mr
      JOIN contacts c ON c.id = mr.contact_id
      WHERE mr.user_id = ?
      ORDER BY mr.created_at DESC
    `
    )
    .all(userId) as (MoneyRequest & {
    contact_name: string;
    contact_email: string | null;
    contact_phone: string | null;
  })[];
}

export function getMoneyRequestById(id: number): MoneyRequest | undefined {
  return getDb().prepare("SELECT * FROM money_requests WHERE id = ?").get(id) as
    | MoneyRequest
    | undefined;
}

export function updateMoneyRequestSent(
  id: number,
  emailSent: boolean,
  smsSent: boolean,
  status: "sent" | "failed"
) {
  getDb()
    .prepare(
      `
      UPDATE money_requests
      SET email_sent = ?, sms_sent = ?, status = ?, sent_at = datetime('now')
      WHERE id = ?
    `
    )
    .run(emailSent ? 1 : 0, smsSent ? 1 : 0, status, id);
}

export function getUserStats(userId: number): UserStats {
  const user = getUserById(userId)!;
  const contacts = getDb()
    .prepare(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN messaged = 1 THEN 1 ELSE 0 END) as messaged
       FROM contacts WHERE user_id = ?`
    )
    .get(userId) as { total: number; messaged: number | null };

  const totalContacts = contacts.total || 0;
  const messaged = contacts.messaged || 0;
  const requestCount = getDb()
    .prepare("SELECT COUNT(*) as c FROM money_requests WHERE user_id = ?")
    .get(userId) as { c: number };

  return {
    totalContacts,
    messaged,
    pending: Math.max(0, totalContacts - messaged),
    totalRequests: requestCount.c || 0,
    targetAmountCents: user.target_amount_cents,
  };
}

export function renderMessageTemplate(
  template: string,
  vars: { name: string; amount: string; sender: string }
) {
  return template
    .replaceAll("{name}", vars.name)
    .replaceAll("{amount}", vars.amount)
    .replaceAll("{sender}", vars.sender);
}
