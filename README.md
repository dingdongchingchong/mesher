# Product Requirements Document
## Desktop Cash-Basis Accounting App -- MVP

---

## Overview

A desktop accounting application for small businesses. Cash-basis only. Users log in, create or join companies, and switch between company instances. All accounting data is strictly scoped to the active company.

---

## Tech Stack

- **Framework:** Tauri (Rust backend) + React (TypeScript) frontend
- **Database:** SQLite via `better-sqlite3` or Tauri's built-in SQLite plugin
- **Auth:** Local auth only (no OAuth) -- bcrypt password hashing
- **State:** Zustand for global app state (active company, current user)
- **Styling:** Tailwind CSS
- **Reports:** Rendered in-app, exportable to PDF via `@react-pdf/renderer`

> If you prefer Electron over Tauri, substitute accordingly -- the data model and logic are identical.

---

## Core Data Model

Design this schema first. Everything else depends on it.

### `users`
```sql
id          INTEGER PRIMARY KEY
email       TEXT UNIQUE NOT NULL
password_hash TEXT NOT NULL
name        TEXT NOT NULL
created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
```

### `companies`
```sql
id          INTEGER PRIMARY KEY
name        TEXT NOT NULL
fiscal_year_start INTEGER DEFAULT 1  -- month number (1=January)
created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
```

### `company_users` (junction -- one user can belong to many companies)
```sql
id          INTEGER PRIMARY KEY
company_id  INTEGER REFERENCES companies(id)
user_id     INTEGER REFERENCES users(id)
role        TEXT CHECK(role IN ('owner','admin','member')) DEFAULT 'member'
created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
UNIQUE(company_id, user_id)
```

### `accounts` (chart of accounts -- scoped to company)
```sql
id          INTEGER PRIMARY KEY
company_id  INTEGER REFERENCES companies(id)
name        TEXT NOT NULL
type        TEXT CHECK(type IN ('income','expense','asset','liability','equity')) NOT NULL
code        TEXT  -- optional account code e.g. "4000"
is_active   BOOLEAN DEFAULT 1
created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
```

### `transactions` (every cash movement -- scoped to company)
```sql
id          INTEGER PRIMARY KEY
company_id  INTEGER REFERENCES companies(id)
account_id  INTEGER REFERENCES accounts(id)
date        DATE NOT NULL
amount      REAL NOT NULL  -- positive = money in, negative = money out
description TEXT
created_by  INTEGER REFERENCES users(id)
created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
```

> **Cash basis rule:** A transaction is recorded only when cash actually moves. No invoices, no receivables, no payables. Every row in `transactions` represents real cash movement.

---

## Session State

Store the following in app state (Zustand), persisted to localStorage or a local config file:

```typescript
{
  currentUser: User | null,
  activeCompany: Company | null,
  activeRole: 'owner' | 'admin' | 'member' | null
}
```

**Switching companies** = update `activeCompany` and `activeRole`. All data queries must filter by `activeCompany.id`. No exceptions.

---

## Auth Flow

### New User -- Registration
1. User opens app for the first time -> shown Login screen
2. "Create Account" link -> Registration form (name, email, password, confirm password)
3. On submit: validate, hash password with bcrypt, insert into `users`
4. Auto-login after registration -> redirect to Company Selection screen

### Returning User -- Login
1. Email + password form
2. Verify against `users` table (bcrypt compare)
3. On success -> load all companies for this user from `company_users` join
4. If user belongs to 0 companies -> redirect to Create Company screen
5. If user belongs to 1+ companies -> redirect to Company Selection screen

### Password rules
- Minimum 8 characters
- Store only bcrypt hash, never plaintext

---

## Company Flow

### Create a Company
1. User enters company name (required), fiscal year start month (optional, default January)
2. Insert into `companies`, insert into `company_users` with role = 'owner'
3. Seed default chart of accounts (see below)
4. Set as active company -> redirect to Dashboard

### Join an Existing Company
- MVP: Owner invites by adding user's email directly in Company Settings
- Lookup user by email -> insert into `company_users` with role = 'member'
- No email sending required for MVP -- owner tells the user verbally

### Company Selection Screen
- List all companies the current user belongs to
- Show role badge next to each
- Click to switch -> set as active company -> go to Dashboard
- "Create New Company" button always visible

### Company Switcher (in-app)
- Persistent in the top navigation bar: shows active company name + dropdown arrow
- Click -> dropdown lists all user's companies
- Select -> switch active company (update Zustand state) -> reload current view scoped to new company
- "Add / Create Company" option at bottom of dropdown

---

## Default Chart of Accounts (seeded on company creation)

### Income
- Sales Revenue
- Other Income

### Expenses
- Rent
- Utilities
- Payroll
- Office Supplies
- Software & Subscriptions
- Meals & Entertainment
- Travel
- Professional Services
- Marketing & Advertising
- Other Expenses

### Assets
- Checking Account
- Savings Account
- Petty Cash

### Liabilities
- Credit Card
- Loans Payable

### Equity
- Owner's Equity
- Retained Earnings

> User can add, rename, or deactivate accounts. Cannot delete accounts that have transactions.

---

## Features (MVP Scope)

### 1. Dashboard
- Current month income (sum of income transactions)
- Current month expenses (sum of expense transactions)
- Net (income minus expenses)
- Recent transactions list (last 10)
- All figures scoped to active company

### 2. Transactions
- List view: date, description, account, amount -- sortable, filterable by date range and account
- Add transaction form: date (default today), account (dropdown from chart of accounts), amount, description
- Edit transaction
- Delete transaction (with confirmation)
- Positive amounts = money in (income/asset increase), negative = money out (expense/liability)

### 3. Chart of Accounts
- List all accounts grouped by type
- Add new account
- Edit account name and code
- Deactivate account (hides from dropdowns, preserves historical data)
- Show transaction count per account

### 4. Reports

#### Profit & Loss (Cash Basis)
- Date range selector (default: current month, presets for YTD, last month, last year, custom)
- Income section: each income account + total
- Expenses section: each expense account + total
- Net Profit/Loss at bottom
- Export to PDF

#### Balance Sheet (Simplified, Cash Basis)
- As of a selected date
- Assets section
- Liabilities section
- Equity section
- Export to PDF

### 5. Company Settings
- Edit company name
- Edit fiscal year start
- Manage users (owner/admin only): see member list, add by email, change role, remove
- Danger zone: delete company (owner only, requires confirmation, hard delete)

### 6. User Settings
- Edit display name
- Change password (requires current password)
- View list of companies user belongs to

---

## Navigation Structure

```
App Shell
|- Top Bar: [Logo] [Company Switcher] [User Menu]
`- Sidebar
    |- Dashboard
    |- Transactions
    |- Chart of Accounts
    |- Reports
    |   |- Profit & Loss
    |   `- Balance Sheet
    `- Settings
        |- Company
        `- Profile
```

---

## Out of Scope (Do Not Build)

- Invoicing or accounts receivable
- Accounts payable / vendor bills
- Bank reconciliation
- Payroll
- Inventory
- Multi-currency
- Tax calculations or tax forms
- Email sending
- Cloud sync or multi-device
- Mobile app
- Audit log

---

## Build Order

Build in this exact sequence. Each phase must be functional before starting the next.

**Phase 1 -- Foundation**
1. Database schema (all tables above)
2. User registration and login
3. Company creation and company_users seeding
4. Company selection screen
5. Company switcher in nav

**Phase 2 -- Core Accounting**
6. Chart of accounts (view, add, edit, deactivate)
7. Transactions (list, add, edit, delete)
8. Dashboard with live calculations

**Phase 3 -- Reports**
9. Profit & Loss report with date range
10. Balance Sheet report
11. PDF export for both reports

**Phase 4 -- Settings & Polish**
12. Company settings + user management
13. User profile settings
14. Empty states, error handling, loading states

---

## Key Engineering Rules

1. **Every database query must filter by `company_id`** -- never query `transactions` or `accounts` without a `WHERE company_id = ?` clause
2. **Never store amounts as integers (cents)** for MVP -- REAL is fine for simplicity
3. **Active company comes from Zustand state** -- components never derive it from the URL or local storage independently
4. **Switching companies re-fetches all data** -- do not cache across company switches
5. **All reports are computed at query time** -- no pre-aggregated summary tables for MVP
