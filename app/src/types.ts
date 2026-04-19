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

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type AppSessionState = {
  currentUser: User | null;
  activeCompany: Company | null;
  activeRole: Role | null;
};

export type IpcInvoker = {
  invoke: <T>(channel: string, payload?: unknown) => Promise<T>;
};
