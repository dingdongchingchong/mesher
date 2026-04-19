const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const DEFAULT_ACCOUNTS = [
  { name: 'Sales Revenue', type: 'income' },
  { name: 'Other Income', type: 'income' },
  { name: 'Rent', type: 'expense' },
  { name: 'Utilities', type: 'expense' },
  { name: 'Payroll', type: 'expense' },
  { name: 'Office Supplies', type: 'expense' },
  { name: 'Software & Subscriptions', type: 'expense' },
  { name: 'Meals & Entertainment', type: 'expense' },
  { name: 'Travel', type: 'expense' },
  { name: 'Professional Services', type: 'expense' },
  { name: 'Marketing & Advertising', type: 'expense' },
  { name: 'Other Expenses', type: 'expense' },
  { name: 'Checking Account', type: 'asset' },
  { name: 'Savings Account', type: 'asset' },
  { name: 'Petty Cash', type: 'asset' },
  { name: 'Credit Card', type: 'liability' },
  { name: 'Loans Payable', type: 'liability' },
  { name: "Owner's Equity", type: 'equity' },
  { name: 'Retained Earnings', type: 'equity' },
];

let db;

function ensureDbDir(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

function initDb(dbPath) {
  if (db) {
    return db;
  }
  ensureDbDir(dbPath);
  db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      fiscal_year_start INTEGER DEFAULT 1 CHECK(fiscal_year_start >= 1 AND fiscal_year_start <= 12),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS company_users (
      id INTEGER PRIMARY KEY,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT CHECK(role IN ('owner', 'admin', 'member')) DEFAULT 'member',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(company_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('income', 'expense', 'asset', 'liability', 'equity')) NOT NULL,
      code TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
      date DATE NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_company_users_user ON company_users(user_id);
    CREATE INDEX IF NOT EXISTS idx_company_users_company ON company_users(company_id);
    CREATE INDEX IF NOT EXISTS idx_accounts_company ON accounts(company_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_company_date ON transactions(company_id, date);
    CREATE INDEX IF NOT EXISTS idx_transactions_account_company ON transactions(company_id, account_id);
  `);

  return db;
}

function getDb() {
  if (!db) {
    throw new Error('Database has not been initialized');
  }
  return db;
}

function seedDefaultAccounts(companyId) {
  const database = getDb();
  const stmt = database.prepare(
    `
    INSERT INTO accounts(company_id, name, type, code, is_active)
    VALUES (?, ?, ?, NULL, 1)
    `
  );

  const tx = database.transaction((rows) => {
    for (const row of rows) {
      stmt.run(companyId, row.name, row.type);
    }
  });
  tx(DEFAULT_ACCOUNTS);
}

module.exports = {
  initDb,
  getDb,
  seedDefaultAccounts,
};
