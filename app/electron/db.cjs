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

function nowIso() {
  return new Date().toISOString();
}

function monthBounds(date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1));
  const last = new Date(Date.UTC(year, month + 1, 0));
  return {
    start: first.toISOString().slice(0, 10),
    end: last.toISOString().slice(0, 10),
  };
}

function normalizeRole(role) {
  if (role === 'owner' || role === 'admin' || role === 'member') {
    return role;
  }
  return 'member';
}

function seedDefaultAccounts(database, companyId) {
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

function loadCompaniesForUser(database, userId) {
  const rows = database
    .prepare(
      `
      SELECT c.id, c.name, c.fiscal_year_start, c.created_at, cu.role
      FROM companies c
      JOIN company_users cu ON cu.company_id = c.id
      WHERE cu.user_id = ?
      ORDER BY c.name ASC
      `
    )
    .all(userId);

  return rows.map((row) => ({
    ...row,
    role: normalizeRole(row.role),
  }));
}

function deleteCompanyHard(database, companyId) {
  database.prepare(`DELETE FROM companies WHERE id = ?`).run(companyId);
}

function registerIpcHandlers(ipcMain) {
  const bcrypt = require('bcryptjs');
  const SALT_ROUNDS = 10;
  const VALID_ROLES = new Set(['owner', 'admin', 'member']);
  const UPDATABLE_ROLES = new Set(['admin', 'member']);

  function mapUser(row) {
    return row
      ? { id: row.id, email: row.email, name: row.name, created_at: row.created_at }
      : null;
  }

  function mapCompany(row) {
    return row
      ? {
          id: row.id,
          name: row.name,
          fiscal_year_start: row.fiscal_year_start,
          created_at: row.created_at,
        }
      : null;
  }

  function mapAccount(row) {
    return {
      id: row.id,
      company_id: row.company_id,
      name: row.name,
      type: row.type,
      code: row.code,
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
      transaction_count: Number(row.transaction_count ?? 0),
    };
  }

  function mapTx(row) {
    return {
      id: row.id,
      company_id: row.company_id,
      account_id: row.account_id,
      date: row.date,
      amount: Number(row.amount),
      description: row.description ?? '',
      created_by: row.created_by ?? null,
      created_at: row.created_at,
      account_name: row.account_name,
      account_type: row.account_type,
    };
  }

  function ensureDate(value) {
    const text = String(value ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      throw new Error('Date must be YYYY-MM-DD');
    }
    return text;
  }

  function ensureAmount(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount === 0) {
      throw new Error('Amount must be a non-zero number');
    }
    return amount;
  }

  function userByEmail(database, email) {
    return database
      .prepare(`SELECT * FROM users WHERE lower(email) = lower(?)`)
      .get(String(email ?? '').trim());
  }

  function authCtx(database, token, activeCompanyId) {
    const session = database
      .prepare(`SELECT user_id FROM sessions WHERE token = ?`)
      .get(String(token ?? ''));
    if (!session) {
      throw new Error('Unauthorized');
    }

    const user = database
      .prepare(`SELECT id, email, name, created_at FROM users WHERE id = ?`)
      .get(session.user_id);
    if (!user) {
      throw new Error('Unauthorized');
    }

    const companies = loadCompaniesForUser(database, user.id).map((row) => ({
      id: row.id,
      name: row.name,
      fiscal_year_start: row.fiscal_year_start,
      created_at: row.created_at,
      role: row.role,
    }));

    let activeCompany = null;
    let activeRole = null;
    if (activeCompanyId != null) {
      const chosen = companies.find((company) => company.id === Number(activeCompanyId));
      if (!chosen) {
        throw new Error('Unauthorized');
      }
      activeCompany = {
        id: chosen.id,
        name: chosen.name,
        fiscal_year_start: chosen.fiscal_year_start,
        created_at: chosen.created_at,
      };
      activeRole = chosen.role;
    }

    return {
      token: String(token ?? ''),
      user: mapUser(user),
      companies,
      activeCompany,
      activeRole,
    };
  }

  function ensureCompanyRole(database, userId, companyId) {
    const row = database
      .prepare(`SELECT role FROM company_users WHERE company_id = ? AND user_id = ?`)
      .get(companyId, userId);
    if (!row) {
      throw new Error('Unauthorized');
    }
    return normalizeRole(row.role);
  }

  function ensureCompanyAccess(database, token, companyId) {
    const ctx = authCtx(database, token, companyId);
    const role = ensureCompanyRole(database, ctx.user.id, companyId);
    return { ctx, role };
  }

  function ensureAccount(database, companyId, accountId) {
    const account = database
      .prepare(`SELECT * FROM accounts WHERE id = ? AND company_id = ?`)
      .get(accountId, companyId);
    if (!account) {
      throw new Error('Account not found for active company');
    }
    return account;
  }

  function checkRole(role, allowed) {
    if (!allowed.includes(role)) {
      throw new Error('Forbidden');
    }
  }

  ipcMain.handle('auth:register', (_event, payload) => {
    const database = getDb();
    const name = String(payload?.name ?? '').trim();
    const email = String(payload?.email ?? '').trim().toLowerCase();
    const password = String(payload?.password ?? '');
    const confirmPassword = String(payload?.confirmPassword ?? '');

    if (!name || !email) {
      throw new Error('Name and email are required');
    }
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match');
    }
    if (userByEmail(database, email)) {
      throw new Error('Email already registered');
    }

    const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
    const result = database
      .prepare(`INSERT INTO users(email, password_hash, name) VALUES (?, ?, ?)`)
      .run(email, passwordHash, name);
    const user = database
      .prepare(`SELECT id, email, name, created_at FROM users WHERE id = ?`)
      .get(result.lastInsertRowid);

    const token = `${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    database.prepare(`INSERT INTO sessions(token, user_id) VALUES (?, ?)`).run(token, user.id);

    return {
      token,
      user: mapUser(user),
      companies: [],
      activeCompany: null,
      activeRole: null,
    };
  });

  ipcMain.handle('auth:login', (_event, payload) => {
    const database = getDb();
    const email = String(payload?.email ?? '').trim().toLowerCase();
    const password = String(payload?.password ?? '');
    const user = userByEmail(database, email);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      throw new Error('Invalid credentials');
    }

    const token = `${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    database.prepare(`INSERT INTO sessions(token, user_id) VALUES (?, ?)`).run(token, user.id);

    const companies = loadCompaniesForUser(database, user.id).map((row) => ({
      id: row.id,
      name: row.name,
      fiscal_year_start: row.fiscal_year_start,
      created_at: row.created_at,
      role: row.role,
    }));

    return {
      token,
      user: mapUser(user),
      companies,
      activeCompany: null,
      activeRole: null,
    };
  });

  ipcMain.handle('auth:logout', (_event, payload) => {
    const database = getDb();
    const token = String(payload?.token ?? '');
    if (token) {
      database.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
    }
    return { ok: true };
  });

  ipcMain.handle('auth:bootstrap', (_event, payload) => {
    const database = getDb();
    const token = String(payload?.token ?? '');
    if (!token) {
      return {
        token: null,
        user: null,
        companies: [],
        activeCompany: null,
        activeRole: null,
      };
    }
    return authCtx(database, token, payload?.activeCompanyId ?? null);
  });

  ipcMain.handle('companies:list', (_event, payload) => {
    const database = getDb();
    const ctx = authCtx(database, payload?.token, null);
    return ctx.companies;
  });

  ipcMain.handle('companies:create', (_event, payload) => {
    const database = getDb();
    const ctx = authCtx(database, payload?.token, null);
    const name = String(payload?.name ?? '').trim();
    const fiscalYearStart = Number(payload?.fiscalYearStart ?? 1);
    if (!name) {
      throw new Error('Company name is required');
    }
    if (!Number.isInteger(fiscalYearStart) || fiscalYearStart < 1 || fiscalYearStart > 12) {
      throw new Error('Fiscal year start must be between 1 and 12');
    }

    const tx = database.transaction(() => {
      const companyInsert = database
        .prepare(`INSERT INTO companies(name, fiscal_year_start) VALUES (?, ?)`)
        .run(name, fiscalYearStart);
      const companyId = Number(companyInsert.lastInsertRowid);
      database
        .prepare(`INSERT INTO company_users(company_id, user_id, role) VALUES (?, ?, 'owner')`)
        .run(companyId, ctx.user.id);
      seedDefaultAccounts(database, companyId);
      return companyId;
    });

    const companyId = tx();
    const company = database.prepare(`SELECT * FROM companies WHERE id = ?`).get(companyId);
    return {
      company: mapCompany(company),
      role: 'owner',
    };
  });

  ipcMain.handle('companies:update', (_event, payload) => {
    const database = getDb();
    const companyId = Number(payload?.companyId);
    const { role } = ensureCompanyAccess(database, payload?.token, companyId);
    checkRole(role, ['owner', 'admin']);
    const name = String(payload?.name ?? '').trim();
    const fiscalYearStart = Number(payload?.fiscalYearStart ?? 1);
    if (!name) {
      throw new Error('Company name is required');
    }
    if (!Number.isInteger(fiscalYearStart) || fiscalYearStart < 1 || fiscalYearStart > 12) {
      throw new Error('Fiscal year start must be between 1 and 12');
    }

    database
      .prepare(`UPDATE companies SET name = ?, fiscal_year_start = ? WHERE id = ?`)
      .run(name, fiscalYearStart, companyId);
    const updated = database.prepare(`SELECT * FROM companies WHERE id = ?`).get(companyId);
    return mapCompany(updated);
  });

  ipcMain.handle('companies:delete', (_event, payload) => {
    const database = getDb();
    const companyId = Number(payload?.companyId);
    const { role } = ensureCompanyAccess(database, payload?.token, companyId);
    checkRole(role, ['owner']);
    deleteCompanyHard(database, companyId);
    return { ok: true };
  });

  ipcMain.handle('companies:members:list', (_event, payload) => {
    const database = getDb();
    const companyId = Number(payload?.companyId);
    const { role } = ensureCompanyAccess(database, payload?.token, companyId);
    checkRole(role, ['owner', 'admin', 'member']);
    const rows = database
      .prepare(
        `
        SELECT cu.id, cu.company_id, cu.user_id, cu.role, cu.created_at, u.email, u.name
        FROM company_users cu
        JOIN users u ON u.id = cu.user_id
        WHERE cu.company_id = ?
        ORDER BY u.name ASC
        `
      )
      .all(companyId);
    return rows.map((row) => ({
      id: row.id,
      company_id: row.company_id,
      user_id: row.user_id,
      role: normalizeRole(row.role),
      email: row.email,
      name: row.name,
      created_at: row.created_at,
    }));
  });

  ipcMain.handle('companies:members:add', (_event, payload) => {
    const database = getDb();
    const companyId = Number(payload?.companyId);
    const { role } = ensureCompanyAccess(database, payload?.token, companyId);
    checkRole(role, ['owner', 'admin']);
    const email = String(payload?.email ?? '').trim().toLowerCase();
    const nextRole = normalizeRole(payload?.role ?? 'member');
    if (!VALID_ROLES.has(nextRole) || nextRole === 'owner') {
      throw new Error('Invalid role');
    }
    const user = userByEmail(database, email);
    if (!user) {
      throw new Error('User with that email does not exist');
    }
    database
      .prepare(
        `
        INSERT INTO company_users(company_id, user_id, role)
        VALUES (?, ?, ?)
        ON CONFLICT(company_id, user_id) DO UPDATE SET role = excluded.role
        `
      )
      .run(companyId, user.id, nextRole);
    return { ok: true };
  });

  ipcMain.handle('companies:members:updateRole', (_event, payload) => {
    const database = getDb();
    const companyId = Number(payload?.companyId);
    const membershipId = Number(payload?.membershipId);
    const { role } = ensureCompanyAccess(database, payload?.token, companyId);
    checkRole(role, ['owner', 'admin']);
    const nextRole = normalizeRole(payload?.role);
    if (!UPDATABLE_ROLES.has(nextRole)) {
      throw new Error('Only admin/member roles may be assigned');
    }
    const membership = database
      .prepare(`SELECT id, role FROM company_users WHERE id = ? AND company_id = ?`)
      .get(membershipId, companyId);
    if (!membership) {
      throw new Error('Membership not found');
    }
    if (normalizeRole(membership.role) === 'owner') {
      throw new Error('Owner role cannot be changed');
    }
    database.prepare(`UPDATE company_users SET role = ? WHERE id = ?`).run(nextRole, membershipId);
    return { ok: true };
  });

  ipcMain.handle('companies:members:remove', (_event, payload) => {
    const database = getDb();
    const companyId = Number(payload?.companyId);
    const membershipId = Number(payload?.membershipId);
    const { role } = ensureCompanyAccess(database, payload?.token, companyId);
    checkRole(role, ['owner', 'admin']);
    const membership = database
      .prepare(`SELECT id, role FROM company_users WHERE id = ? AND company_id = ?`)
      .get(membershipId, companyId);
    if (!membership) {
      throw new Error('Membership not found');
    }
    if (normalizeRole(membership.role) === 'owner') {
      throw new Error('Owner cannot be removed');
    }
    database.prepare(`DELETE FROM company_users WHERE id = ?`).run(membershipId);
    return { ok: true };
  });

  ipcMain.handle('accounts:list', (_event, payload) => {
    const database = getDb();
    const companyId = Number(payload?.companyId);
    ensureCompanyAccess(database, payload?.token, companyId);
    const rows = database
      .prepare(
        `
        SELECT a.*, COALESCE(COUNT(t.id), 0) AS transaction_count
        FROM accounts a
        LEFT JOIN transactions t ON t.account_id = a.id AND t.company_id = a.company_id
        WHERE a.company_id = ?
        GROUP BY a.id
        ORDER BY
          CASE a.type
            WHEN 'income' THEN 1
            WHEN 'expense' THEN 2
            WHEN 'asset' THEN 3
            WHEN 'liability' THEN 4
            WHEN 'equity' THEN 5
            ELSE 99
          END,
          a.name ASC
        `
      )
      .all(companyId);
    return rows.map(mapAccount);
  });

  ipcMain.handle('accounts:create', (_event, payload) => {
    const database = getDb();
    const companyId = Number(payload?.companyId);
    const { role } = ensureCompanyAccess(database, payload?.token, companyId);
    checkRole(role, ['owner', 'admin', 'member']);
    const name = String(payload?.name ?? '').trim();
    const type = String(payload?.type ?? '').trim();
    const code = String(payload?.code ?? '').trim() || null;
    if (!name || !['income', 'expense', 'asset', 'liability', 'equity'].includes(type)) {
      throw new Error('Invalid account');
    }
    const inserted = database
      .prepare(
        `INSERT INTO accounts(company_id, name, type, code, is_active) VALUES (?, ?, ?, ?, 1)`
      )
      .run(companyId, name, type, code);
    return mapAccount(database.prepare(`SELECT * FROM accounts WHERE id = ?`).get(inserted.lastInsertRowid));
  });

  ipcMain.handle('accounts:update', (_event, payload) => {
    const database = getDb();
    const companyId = Number(payload?.companyId);
    const accountId = Number(payload?.accountId);
    const { role } = ensureCompanyAccess(database, payload?.token, companyId);
    checkRole(role, ['owner', 'admin', 'member']);
    ensureAccount(database, companyId, accountId);
    const name = String(payload?.name ?? '').trim();
    const code = String(payload?.code ?? '').trim() || null;
    if (!name) {
      throw new Error('Account name is required');
    }
    database
      .prepare(`UPDATE accounts SET name = ?, code = ? WHERE id = ? AND company_id = ?`)
      .run(name, code, accountId, companyId);
    return mapAccount(database.prepare(`SELECT * FROM accounts WHERE id = ?`).get(accountId));
  });

  ipcMain.handle('accounts:setActive', (_event, payload) => {
    const database = getDb();
    const companyId = Number(payload?.companyId);
    const accountId = Number(payload?.accountId);
    const { role } = ensureCompanyAccess(database, payload?.token, companyId);
    checkRole(role, ['owner', 'admin', 'member']);
    ensureAccount(database, companyId, accountId);
    database
      .prepare(`UPDATE accounts SET is_active = ? WHERE id = ? AND company_id = ?`)
      .run(payload?.isActive ? 1 : 0, accountId, companyId);
    return { ok: true };
  });

  ipcMain.handle('accounts:delete', (_event, payload) => {
    const database = getDb();
    const companyId = Number(payload?.companyId);
    const accountId = Number(payload?.accountId);
    const { role } = ensureCompanyAccess(database, payload?.token, companyId);
    checkRole(role, ['owner', 'admin']);
    ensureAccount(database, companyId, accountId);
    const count = database
      .prepare(`SELECT COUNT(*) AS c FROM transactions WHERE company_id = ? AND account_id = ?`)
      .get(companyId, accountId).c;
    if (count > 0) {
      throw new Error('Cannot delete account with transactions');
    }
    database.prepare(`DELETE FROM accounts WHERE id = ? AND company_id = ?`).run(accountId, companyId);
    return { ok: true };
  });

  ipcMain.handle('transactions:list', (_event, payload) => {
    const database = getDb();
    const companyId = Number(payload?.companyId);
    ensureCompanyAccess(database, payload?.token, companyId);

    const where = ['t.company_id = ?'];
    const args = [companyId];
    if (payload?.accountId) {
      where.push('t.account_id = ?');
      args.push(Number(payload.accountId));
    }
    if (payload?.fromDate) {
      where.push('t.date >= ?');
      args.push(ensureDate(payload.fromDate));
    }
    if (payload?.toDate) {
      where.push('t.date <= ?');
      args.push(ensureDate(payload.toDate));
    }

    const validSort = new Set(['date', 'amount', 'created_at', 'description']);
    const sortBy = validSort.has(payload?.sortBy) ? payload.sortBy : 'date';
    const sortDir = String(payload?.sortDir ?? 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const rows = database
      .prepare(
        `
        SELECT t.*, a.name AS account_name, a.type AS account_type
        FROM transactions t
        JOIN accounts a ON a.id = t.account_id AND a.company_id = t.company_id
        WHERE ${where.join(' AND ')}
        ORDER BY ${sortBy} ${sortDir}, t.id DESC
        `
      )
      .all(...args);
    return rows.map(mapTx);
  });

  ipcMain.handle('transactions:create', (_event, payload) => {
    const database = getDb();
    const companyId = Number(payload?.companyId);
    const { ctx, role } = ensureCompanyAccess(database, payload?.token, companyId);
    checkRole(role, ['owner', 'admin', 'member']);
    const accountId = Number(payload?.accountId);
    const date = ensureDate(payload?.date);
    const amount = ensureAmount(payload?.amount);
    const description = String(payload?.description ?? '').trim() || null;
    const account = ensureAccount(database, companyId, accountId);
    if (!account.is_active) {
      throw new Error('Cannot post transaction to inactive account');
    }
    const inserted = database
      .prepare(
        `
        INSERT INTO transactions(company_id, account_id, date, amount, description, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
        `
      )
      .run(companyId, accountId, date, amount, description, ctx.user.id);
    const row = database
      .prepare(
        `
        SELECT t.*, a.name AS account_name, a.type AS account_type
        FROM transactions t
        JOIN accounts a ON a.id = t.account_id AND a.company_id = t.company_id
        WHERE t.id = ?
        `
      )
      .get(inserted.lastInsertRowid);
    return mapTx(row);
  });

  ipcMain.handle('transactions:update', (_event, payload) => {
    const database = getDb();
    const companyId = Number(payload?.companyId);
    const txId = Number(payload?.transactionId);
    const { role } = ensureCompanyAccess(database, payload?.token, companyId);
    checkRole(role, ['owner', 'admin', 'member']);
    const existing = database
      .prepare(`SELECT * FROM transactions WHERE id = ? AND company_id = ?`)
      .get(txId, companyId);
    if (!existing) {
      throw new Error('Transaction not found');
    }
    const accountId = Number(payload?.accountId ?? existing.account_id);
    const date = ensureDate(payload?.date ?? existing.date);
    const amount = ensureAmount(payload?.amount ?? existing.amount);
    const description = String(payload?.description ?? '').trim() || null;
    const account = ensureAccount(database, companyId, accountId);
    if (!account.is_active) {
      throw new Error('Cannot post transaction to inactive account');
    }
    database
      .prepare(
        `
        UPDATE transactions
        SET account_id = ?, date = ?, amount = ?, description = ?
        WHERE id = ? AND company_id = ?
        `
      )
      .run(accountId, date, amount, description, txId, companyId);
    const row = database
      .prepare(
        `
        SELECT t.*, a.name AS account_name, a.type AS account_type
        FROM transactions t
        JOIN accounts a ON a.id = t.account_id AND a.company_id = t.company_id
        WHERE t.id = ?
        `
      )
      .get(txId);
    return mapTx(row);
  });

  ipcMain.handle('transactions:delete', (_event, payload) => {
    const database = getDb();
    const companyId = Number(payload?.companyId);
    const txId = Number(payload?.transactionId);
    const { role } = ensureCompanyAccess(database, payload?.token, companyId);
    checkRole(role, ['owner', 'admin', 'member']);
    const deleted = database
      .prepare(`DELETE FROM transactions WHERE id = ? AND company_id = ?`)
      .run(txId, companyId);
    if (deleted.changes === 0) {
      throw new Error('Transaction not found');
    }
    return { ok: true };
  });

  ipcMain.handle('dashboard:summary', (_event, payload) => {
    const database = getDb();
    const companyId = Number(payload?.companyId);
    ensureCompanyAccess(database, payload?.token, companyId);
    const { start, end } = monthBounds(new Date());
    const totals = database
      .prepare(
        `
        SELECT
          COALESCE(SUM(CASE WHEN a.type = 'income' THEN t.amount ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN a.type = 'expense' THEN ABS(t.amount) ELSE 0 END), 0) AS expenses
        FROM transactions t
        JOIN accounts a ON a.id = t.account_id AND a.company_id = t.company_id
        WHERE t.company_id = ?
          AND t.date BETWEEN ? AND ?
        `
      )
      .get(companyId, start, end);
    const recent = database
      .prepare(
        `
        SELECT t.*, a.name AS account_name, a.type AS account_type
        FROM transactions t
        JOIN accounts a ON a.id = t.account_id AND a.company_id = t.company_id
        WHERE t.company_id = ?
        ORDER BY t.date DESC, t.id DESC
        LIMIT 10
        `
      )
      .all(companyId)
      .map(mapTx);
    return {
      monthStart: start,
      monthEnd: end,
      income: Number(totals?.income ?? 0),
      expenses: Number(totals?.expenses ?? 0),
      net: Number(totals?.income ?? 0) - Number(totals?.expenses ?? 0),
      recentTransactions: recent,
    };
  });

  function reportRange(preset, startDate, endDate) {
    const now = new Date();
    const iso = (date) => date.toISOString().slice(0, 10);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
    const ytdStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const lastMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
    const lastYearStart = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
    const lastYearEnd = new Date(Date.UTC(now.getUTCFullYear() - 1, 11, 31));

    if (preset === 'ytd') return { from: iso(ytdStart), to: iso(now) };
    if (preset === 'last_month') return { from: iso(lastMonthStart), to: iso(lastMonthEnd) };
    if (preset === 'last_year') return { from: iso(lastYearStart), to: iso(lastYearEnd) };
    if (preset === 'custom') {
      const from = ensureDate(startDate);
      const to = ensureDate(endDate);
      if (from > to) throw new Error('Custom date range must have from <= to');
      return { from, to };
    }
    return { from: iso(monthStart), to: iso(monthEnd) };
  }

  ipcMain.handle('reports:profitAndLoss', (_event, payload) => {
    const database = getDb();
    const companyId = Number(payload?.companyId);
    ensureCompanyAccess(database, payload?.token, companyId);
    const range = reportRange(payload?.preset, payload?.from, payload?.to);

    const rows = database
      .prepare(
        `
        SELECT
          a.id AS account_id,
          a.name AS account_name,
          a.type AS account_type,
          COALESCE(SUM(t.amount), 0) AS total
        FROM accounts a
        LEFT JOIN transactions t
          ON t.account_id = a.id
         AND t.company_id = a.company_id
         AND t.date BETWEEN ? AND ?
        WHERE a.company_id = ?
          AND a.type IN ('income', 'expense')
        GROUP BY a.id
        ORDER BY a.type, a.name
        `
      )
      .all(range.from, range.to, companyId);

    const income = rows
      .filter((row) => row.account_type === 'income')
      .map((row) => ({ account_id: row.account_id, account_name: row.account_name, total: Number(row.total) }));
    const expenses = rows
      .filter((row) => row.account_type === 'expense')
      .map((row) => ({ account_id: row.account_id, account_name: row.account_name, total: Math.abs(Number(row.total)) }));
    const totalIncome = income.reduce((sum, row) => sum + row.total, 0);
    const totalExpenses = expenses.reduce((sum, row) => sum + row.total, 0);
    return {
      range,
      income,
      expenses,
      totalIncome,
      totalExpenses,
      net: totalIncome - totalExpenses,
      generatedAt: nowIso(),
    };
  });

  ipcMain.handle('reports:balanceSheet', (_event, payload) => {
    const database = getDb();
    const companyId = Number(payload?.companyId);
    ensureCompanyAccess(database, payload?.token, companyId);
    const asOf = ensureDate(payload?.asOf ?? new Date().toISOString().slice(0, 10));

    const rows = database
      .prepare(
        `
        SELECT
          a.id AS account_id,
          a.name AS account_name,
          a.type AS account_type,
          COALESCE(SUM(t.amount), 0) AS total
        FROM accounts a
        LEFT JOIN transactions t
          ON t.account_id = a.id
         AND t.company_id = a.company_id
         AND t.date <= ?
        WHERE a.company_id = ?
          AND a.type IN ('asset', 'liability', 'equity')
        GROUP BY a.id
        ORDER BY a.type, a.name
        `
      )
      .all(asOf, companyId);

    const section = (type) =>
      rows
        .filter((row) => row.account_type === type)
        .map((row) => ({ account_id: row.account_id, account_name: row.account_name, total: Number(row.total) }));

    const assets = section('asset');
    const liabilities = section('liability');
    const equity = section('equity');
    return {
      asOf,
      assets,
      liabilities,
      equity,
      totalAssets: assets.reduce((sum, row) => sum + row.total, 0),
      totalLiabilities: liabilities.reduce((sum, row) => sum + row.total, 0),
      totalEquity: equity.reduce((sum, row) => sum + row.total, 0),
      generatedAt: nowIso(),
    };
  });

  ipcMain.handle('profile:updateName', (_event, payload) => {
    const database = getDb();
    const ctx = authCtx(database, payload?.token, null);
    const name = String(payload?.name ?? '').trim();
    if (!name) {
      throw new Error('Display name is required');
    }
    database.prepare(`UPDATE users SET name = ? WHERE id = ?`).run(name, ctx.user.id);
    return mapUser(database.prepare(`SELECT id, email, name, created_at FROM users WHERE id = ?`).get(ctx.user.id));
  });

  ipcMain.handle('profile:changePassword', (_event, payload) => {
    const database = getDb();
    const ctx = authCtx(database, payload?.token, null);
    const currentPassword = String(payload?.currentPassword ?? '');
    const newPassword = String(payload?.newPassword ?? '');
    const confirmPassword = String(payload?.confirmPassword ?? '');
    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters');
    }
    if (newPassword !== confirmPassword) {
      throw new Error('New password and confirmation do not match');
    }
    const row = database.prepare(`SELECT password_hash FROM users WHERE id = ?`).get(ctx.user.id);
    if (!bcrypt.compareSync(currentPassword, row.password_hash)) {
      throw new Error('Current password is incorrect');
    }
    const hash = bcrypt.hashSync(newPassword, SALT_ROUNDS);
    database.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(hash, ctx.user.id);
    return { ok: true };
  });
}

module.exports = {
  initDb,
  getDb,
  nowIso,
  monthBounds,
  normalizeRole,
  seedDefaultAccounts,
  loadCompaniesForUser,
  deleteCompanyHard,
  registerIpcHandlers,
};
