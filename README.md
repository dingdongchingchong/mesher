# Bare-Bones Accounting Software MVP Draft

This document defines a **minimum viable product (MVP)** for a lightweight accounting app inspired by QuickBooks basics.
The goal is to support very small businesses and freelancers who need simple bookkeeping without advanced accounting features.

---

## 1) MVP Goal

Build a simple web application where a business owner can:

1. Set up their company
2. Record income and expenses
3. Send invoices
4. Track who owes them money
5. View core financial reports

If this MVP works, users should be able to run basic monthly bookkeeping without spreadsheets.

---

## 2) Target Users

- **Freelancers** (one-person businesses)
- **Small service businesses** (consulting, design, repair, agencies)
- **Early-stage founders** handling their own books

---

## 3) Core MVP Features (Must Have)

### A. Organization Setup
- Create a company profile (name, legal name, tax ID, currency, timezone, fiscal year start)
- Choose accounting method (cash or accrual; default to cash for MVP)

### B. Chart of Accounts (Simple)
- Provide a default chart of accounts template:
  - Assets (Bank, Accounts Receivable)
  - Liabilities (Accounts Payable)
  - Income (Service Income, Product Sales)
  - Expenses (Rent, Software, Utilities, Payroll, Misc)
- Allow add/edit/deactivate account

### C. Customers and Vendors
- CRUD for customers and vendors
- Basic fields: name, email, phone, billing address, notes

### D. Invoicing
- Create and send invoice (email + shareable link)
- Invoice statuses: Draft, Sent, Paid, Overdue
- Add line items (description, quantity, unit price, tax)
- Record payment against invoice (full/partial)

### E. Expense Tracking
- Manually record expense transactions
- Attach receipt file (optional in MVP)
- Assign payee/vendor, date, amount, category(account), notes

### F. Bank Transactions (MVP Lite)
- CSV import of bank transactions (no direct bank API in MVP)
- Map imported rows to accounts/categories
- Mark rows as reviewed

### G. Basic Journal Entries
- Auto-create journal entries for invoices, payments, and expenses
- Manual journal entry screen (restricted to admin role)

### H. Essential Reports
- Profit & Loss (date range)
- Balance Sheet (as-of date)
- Accounts Receivable Aging
- Export reports to CSV and PDF

---

## 4) MVP Workflow (Happy Path)

1. User creates company
2. User adds customers and vendors
3. User sends invoices to customers
4. User records received payments
5. User records expenses (or imports bank CSV)
6. User reviews P&L + Balance Sheet at month-end

---

## 5) Non-Goals (Explicitly Out of Scope for MVP)

- Payroll processing
- Inventory management
- Multi-entity consolidation
- Full tax filing automation
- Multi-currency accounting
- Direct bank feeds/open banking integrations
- Complex approval workflows
- Advanced audit controls/SOX-level compliance

---

## 6) Functional Requirements

### Authentication & Access
- Email/password login
- Roles:
  - **Owner/Admin**: full access
  - **Accountant/Bookkeeper**: no billing/admin settings

### Data Integrity
- Every financial transaction must be associated with valid ledger accounts
- Entries must remain immutable after period close (period close can be a soft lock in MVP)
- Maintain basic audit log for create/update/delete operations

### Search & Filtering
- Filter invoices by status/date/customer
- Filter expenses by date/vendor/category

---

## 7) Minimal Data Model

Suggested core entities:

- `organizations`
- `users`
- `organization_users` (role mapping)
- `accounts` (chart of accounts)
- `customers`
- `vendors`
- `invoices`
- `invoice_items`
- `payments`
- `expenses`
- `bank_imports`
- `bank_transactions`
- `journal_entries`
- `journal_entry_lines`
- `attachments`
- `audit_logs`

---

## 8) API Surface (High Level)

- `POST /auth/register`, `POST /auth/login`
- `GET/POST/PATCH /organizations`
- `GET/POST/PATCH /accounts`
- `GET/POST/PATCH /customers`
- `GET/POST/PATCH /vendors`
- `GET/POST/PATCH /invoices`
- `POST /invoices/:id/send`
- `POST /invoices/:id/payments`
- `GET/POST/PATCH /expenses`
- `POST /bank-imports` (upload CSV)
- `POST /bank-imports/:id/match`
- `GET /reports/profit-loss`
- `GET /reports/balance-sheet`
- `GET /reports/ar-aging`

---

## 9) UX Priorities for MVP

- Fast entry screens (few clicks, keyboard friendly)
- Clear status labels (Draft/Sent/Paid/Overdue)
- Dashboard cards:
  - Outstanding invoices
  - This month income
  - This month expenses
  - Net income (month-to-date)

---

## 10) Security & Compliance Baseline

- Encrypt data in transit (TLS) and at rest
- Secure password hashing
- Role-based authorization checks on all finance endpoints
- Basic backup + restore strategy

---

## 11) Success Metrics

For first MVP validation:

- Users can create/send invoice in < 3 minutes
- At least 80% of test users can reconcile a month using app data
- Report values match transaction ledger totals with zero mismatch bugs

---

## 12) Phased Delivery Plan

### Phase 1 (Core Bookkeeping)
- Auth, organization setup, chart of accounts, customers/vendors, expenses

### Phase 2 (Revenue Operations)
- Invoices, payment recording, receivables tracking

### Phase 3 (Reporting + Import)
- Reports, CSV bank import, reconciliation improvements

### Phase 4 (Polish)
- PDF exports, audit logs, usability improvements

---

## 13) Future Upgrades (Post-MVP)

- Direct bank feed integrations
- Tax estimation and filing workflow
- Payroll module
- Mobile app
- Accountant collaboration portal
