import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";

export type User = {
  id: number;
  email: string;
  name: string;
  created_at: string;
};

export type Contact = {
  id: number;
  user_id: number;
  name: string;
  email: string | null;
  phone: string | null;
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

let db: Database.Database;

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
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
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

  return db;
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
    .prepare("SELECT id, email, name, password_hash, created_at FROM users WHERE email = ?")
    .get(email.toLowerCase().trim()) as (User & { password_hash: string }) | undefined;
}

export function getUserById(id: number): User | undefined {
  return getDb()
    .prepare("SELECT id, email, name, created_at FROM users WHERE id = ?")
    .get(id) as User | undefined;
}

export function verifyPassword(user: { password_hash: string }, password: string) {
  return bcrypt.compareSync(password, user.password_hash);
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
  const result = stmt.run(userId, name.trim(), email?.trim() || null, phone?.trim() || null);
  return getContactById(Number(result.lastInsertRowid))!;
}

export function getContactsByUser(userId: number): Contact[] {
  return getDb()
    .prepare("SELECT * FROM contacts WHERE user_id = ? ORDER BY name")
    .all(userId) as Contact[];
}

export function getContactById(id: number): Contact | undefined {
  return getDb().prepare("SELECT * FROM contacts WHERE id = ?").get(id) as Contact | undefined;
}

export function deleteContact(userId: number, contactId: number): boolean {
  const result = getDb()
    .prepare("DELETE FROM contacts WHERE id = ? AND user_id = ?")
    .run(contactId, userId);
  return result.changes > 0;
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
    .prepare(`
      SELECT mr.*, c.name as contact_name, c.email as contact_email, c.phone as contact_phone
      FROM money_requests mr
      JOIN contacts c ON c.id = mr.contact_id
      WHERE mr.user_id = ?
      ORDER BY mr.created_at DESC
    `)
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
    .prepare(`
      UPDATE money_requests
      SET email_sent = ?, sms_sent = ?, status = ?, sent_at = datetime('now')
      WHERE id = ?
    `)
    .run(emailSent ? 1 : 0, smsSent ? 1 : 0, status, id);
}
