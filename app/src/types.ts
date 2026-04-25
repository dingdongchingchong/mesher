export type Role = 'owner' | 'admin' | 'member';
export type AccountType = 'income' | 'expense' | 'asset' | 'liability' | 'equity';
export type DatePreset = 'current_month' | 'ytd' | 'last_month' | 'last_year' | 'custom';

export type User = {
  id: number;
  email: string;
  name: string;
  created_at: string;
};

export type Company = {
  id: number;
  name: string;
  fiscal_year_start: number;
  created_at: string;
};

export type CompanySummary = Company & {
  role: Role;
};

export type CompanyMember = {
  id: number;
  company_id: number;
  user_id: number;
  role: Role;
  email: string;
  name: string;
  created_at: string;
};

export type Account = {
  id: number;
  company_id: number;
  name: string;
  type: AccountType;
  code: string | null;
  is_active: boolean;
  created_at: string;
  transaction_count: number;
};

export type LedgerTransaction = {
  id: number;
  company_id: number;
  account_id: number;
  date: string;
  amount: number;
  description: string;
  created_by: number | null;
  created_at: string;
  account_name: string;
  account_type: AccountType;
};

export type DashboardSummary = {
  monthStart: string;
  monthEnd: string;
  income: number;
  expenses: number;
  net: number;
  recentTransactions: LedgerTransaction[];
};

export type ProfitLossRow = {
  account_id: number;
  account_name: string;
  total: number;
};

export type ProfitLossResult = {
  range: {
    from: string;
    to: string;
  };
  income: ProfitLossRow[];
  expenses: ProfitLossRow[];
  totalIncome: number;
  totalExpenses: number;
  net: number;
  generatedAt: string;
};

export type BalanceSheetRow = {
  account_id: number;
  account_name: string;
  total: number;
};

export type BalanceSheetResult = {
  asOf: string;
  assets: BalanceSheetRow[];
  liabilities: BalanceSheetRow[];
  equity: BalanceSheetRow[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  generatedAt: string;
};

export type AuthResponse = {
  token: string | null;
  user: User | null;
  companies: CompanySummary[];
  activeCompany: Company | null;
  activeRole: Role | null;
};

export interface IpcApi {
  auth: {
    register: (name: string, email: string, password: string, confirmPassword: string) => Promise<AuthResponse>;
    login: (email: string, password: string) => Promise<AuthResponse>;
    logout: (token: string | null) => Promise<{ ok: boolean }>;
    bootstrap: (token: string, activeCompanyId?: number | null) => Promise<AuthResponse>;
  };
  companies: {
    list: (token: string) => Promise<CompanySummary[]>;
    create: (token: string, name: string, fiscalYearStart: number) => Promise<{ company: Company; role: Role }>;
    update: (token: string, companyId: number, name: string, fiscalYearStart: number) => Promise<Company>;
    delete: (token: string, companyId: number) => Promise<{ ok: boolean }>;
    members: (token: string, companyId: number) => Promise<CompanyMember[]>;
    addMember: (
      token: string,
      companyId: number,
      email: string,
      role: 'admin' | 'member',
    ) => Promise<{ ok: boolean }>;
    updateMemberRole: (
      token: string,
      companyId: number,
      membershipId: number,
      role: 'admin' | 'member',
    ) => Promise<{ ok: boolean }>;
    removeMember: (token: string, companyId: number, membershipId: number) => Promise<{ ok: boolean }>;
  };
  accounts: {
    list: (token: string, companyId: number) => Promise<Account[]>;
    create: (
      token: string,
      companyId: number,
      name: string,
      type: AccountType,
      code?: string,
    ) => Promise<Account>;
    update: (token: string, companyId: number, accountId: number, name: string, code?: string) => Promise<Account>;
    setActive: (token: string, companyId: number, accountId: number, isActive: boolean) => Promise<{ ok: boolean }>;
    delete: (token: string, companyId: number, accountId: number) => Promise<{ ok: boolean }>;
  };
  transactions: {
    list: (
      token: string,
      companyId: number,
      opts?: {
        accountId?: number | null;
        fromDate?: string;
        toDate?: string;
        sortBy?: 'date' | 'amount' | 'created_at' | 'description';
        sortDir?: 'asc' | 'desc';
      },
    ) => Promise<LedgerTransaction[]>;
    create: (
      token: string,
      companyId: number,
      accountId: number,
      date: string,
      amount: number,
      description: string,
    ) => Promise<LedgerTransaction>;
    update: (
      token: string,
      companyId: number,
      transactionId: number,
      accountId: number,
      date: string,
      amount: number,
      description: string,
    ) => Promise<LedgerTransaction>;
    delete: (token: string, companyId: number, transactionId: number) => Promise<{ ok: boolean }>;
  };
  dashboard: {
    summary: (token: string, companyId: number) => Promise<DashboardSummary>;
  };
  reports: {
    profitLoss: (
      token: string,
      companyId: number,
      preset: DatePreset,
      startDate?: string,
      endDate?: string,
    ) => Promise<ProfitLossResult>;
    balanceSheet: (token: string, companyId: number, asOfDate: string) => Promise<BalanceSheetResult>;
  };
  profile: {
    updateName: (token: string, name: string) => Promise<User>;
    changePassword: (
      token: string,
      currentPassword: string,
      newPassword: string,
      confirmPassword: string,
    ) => Promise<{ ok: boolean }>;
  };
}
