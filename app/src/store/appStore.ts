import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';
import type {
  Account,
  BalanceSheetResult,
  Company,
  CompanyMember,
  CompanySummary,
  DashboardSummary,
  DatePreset,
  LedgerTransaction,
  ProfitLossResult,
  Role,
  User,
} from '../types';

type LoadingState = {
  dashboard: boolean;
  accounts: boolean;
  transactions: boolean;
  profitLoss: boolean;
  balanceSheet: boolean;
  members: boolean;
  companies: boolean;
};

type AuthActionResult = {
  needsCompanyCreation: boolean;
  needsCompanySelection: boolean;
};

type PersistedSession = {
  token: string | null;
  currentUser: User | null;
  companies: CompanySummary[];
  activeCompany: Company | null;
  activeRole: Role | null;
};

interface AppState extends PersistedSession {
  accounts: Account[];
  transactions: LedgerTransaction[];
  dashboard: DashboardSummary | null;
  profitLoss: ProfitLossResult | null;
  balanceSheet: BalanceSheetResult | null;
  members: CompanyMember[];
  loading: LoadingState;
  error: string | null;
  bootstrapped: boolean;

  setError: (message: string | null) => void;
  setCurrentUser: (user: User | null) => void;
  setCompanies: (companies: CompanySummary[]) => void;
  setActiveCompany: (company: Company | null, role: Role | null) => void;
  resetCompanyData: () => void;
  hydrateFromBootstrap: (payload: {
    token: string | null;
    user: User | null;
    companies: CompanySummary[];
    activeCompany: Company | null;
    activeRole: Role | null;
  }) => void;
  clearSession: () => void;

  bootstrap: () => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    confirmPassword: string,
  ) => Promise<AuthActionResult>;
  login: (email: string, password: string) => Promise<AuthActionResult>;
  logout: () => Promise<void>;

  reloadCompanies: () => Promise<void>;
  createCompany: (name: string, fiscalYearStart: number) => Promise<void>;
  switchCompany: (companyId: number) => Promise<void>;

  refreshDashboard: () => Promise<void>;
  refreshAccounts: () => Promise<void>;
  refreshTransactions: (opts?: {
    accountId?: number | null;
    fromDate?: string;
    toDate?: string;
    sortBy?: 'date' | 'amount' | 'created_at' | 'description';
    sortDir?: 'asc' | 'desc';
  }) => Promise<void>;
  loadProfitLoss: (preset: DatePreset, fromDate?: string, toDate?: string) => Promise<void>;
  loadBalanceSheet: (asOf: string) => Promise<void>;
  loadMembers: () => Promise<void>;
}

const defaultLoading: LoadingState = {
  dashboard: false,
  accounts: false,
  transactions: false,
  profitLoss: false,
  balanceSheet: false,
  members: false,
  companies: false,
};

function actionResult(companies: CompanySummary[]): AuthActionResult {
  if (companies.length === 0) {
    return { needsCompanyCreation: true, needsCompanySelection: false };
  }
  return { needsCompanyCreation: false, needsCompanySelection: true };
}

function sortCompanies(companies: CompanySummary[]) {
  return [...companies].sort((a, b) => a.name.localeCompare(b.name));
}

const baseState: PersistedSession = {
  token: null,
  currentUser: null,
  companies: [],
  activeCompany: null,
  activeRole: null,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...baseState,
      accounts: [],
      transactions: [],
      dashboard: null,
      profitLoss: null,
      balanceSheet: null,
      members: [],
      loading: defaultLoading,
      error: null,
      bootstrapped: false,

      setError: (message) => set({ error: message }),
      setCurrentUser: (user) => set({ currentUser: user }),
      setCompanies: (companies) => set({ companies: sortCompanies(companies) }),
      setActiveCompany: (company, role) => set({ activeCompany: company, activeRole: role }),

      resetCompanyData: () =>
        set({
          accounts: [],
          transactions: [],
          dashboard: null,
          profitLoss: null,
          balanceSheet: null,
          members: [],
        }),

      hydrateFromBootstrap: (payload) => {
        set({
          token: payload.token,
          currentUser: payload.user,
          companies: sortCompanies(payload.companies),
          activeCompany: payload.activeCompany,
          activeRole: payload.activeRole,
          bootstrapped: true,
          error: null,
        });
      },

      clearSession: () => {
        set({
          ...baseState,
          accounts: [],
          transactions: [],
          dashboard: null,
          profitLoss: null,
          balanceSheet: null,
          members: [],
          loading: defaultLoading,
          error: null,
          bootstrapped: true,
        });
      },

      bootstrap: async () => {
        const { token, activeCompany } = get();
        if (!token) {
          set({ bootstrapped: true });
          return;
        }
        try {
          const payload = await api.auth.bootstrap(token, activeCompany?.id ?? null);
          get().hydrateFromBootstrap(payload);
        } catch (error) {
          set({
            ...baseState,
            bootstrapped: true,
            error: error instanceof Error ? error.message : 'Failed to bootstrap session',
          });
        }
      },

      register: async (name, email, password, confirmPassword) => {
        const payload = await api.auth.register(name, email, password, confirmPassword);
        get().hydrateFromBootstrap(payload);
        return actionResult(payload.companies);
      },

      login: async (email, password) => {
        const payload = await api.auth.login(email, password);
        get().hydrateFromBootstrap(payload);
        return actionResult(payload.companies);
      },

      logout: async () => {
        const token = get().token;
        try {
          await api.auth.logout(token);
        } finally {
          get().clearSession();
        }
      },

      reloadCompanies: async () => {
        const token = get().token;
        if (!token) return;
        set((state) => ({ loading: { ...state.loading, companies: true } }));
        try {
          const companies = await api.companies.list(token);
          const current = get().activeCompany;
          const match = current ? companies.find((item) => item.id === current.id) : null;
          set({
            companies: sortCompanies(companies),
            activeCompany: match
              ? {
                  id: match.id,
                  name: match.name,
                  fiscal_year_start: match.fiscal_year_start,
                  created_at: match.created_at,
                }
              : null,
            activeRole: match?.role ?? null,
          });
        } finally {
          set((state) => ({ loading: { ...state.loading, companies: false } }));
        }
      },

      createCompany: async (name, fiscalYearStart) => {
        const token = get().token;
        if (!token) throw new Error('Not authenticated');
        const created = await api.companies.create(token, name, fiscalYearStart);
        const companies = await api.companies.list(token);
        set({
          companies: sortCompanies(companies),
          activeCompany: created.company,
          activeRole: created.role,
          error: null,
        });
        get().resetCompanyData();
      },

      switchCompany: async (companyId) => {
        const match = get().companies.find((item) => item.id === companyId);
        if (!match) {
          throw new Error('Company not found');
        }
        get().resetCompanyData();
        set({
          activeCompany: {
            id: match.id,
            name: match.name,
            fiscal_year_start: match.fiscal_year_start,
            created_at: match.created_at,
          },
          activeRole: match.role,
          error: null,
        });
      },

      refreshDashboard: async () => {
        const { token, activeCompany } = get();
        if (!token || !activeCompany) return;
        set((state) => ({ loading: { ...state.loading, dashboard: true } }));
        try {
          const dashboard = await api.dashboard.summary(token, activeCompany.id);
          set({ dashboard });
        } finally {
          set((state) => ({ loading: { ...state.loading, dashboard: false } }));
        }
      },

      refreshAccounts: async () => {
        const { token, activeCompany } = get();
        if (!token || !activeCompany) return;
        set((state) => ({ loading: { ...state.loading, accounts: true } }));
        try {
          const accounts = await api.accounts.list(token, activeCompany.id);
          set({ accounts });
        } finally {
          set((state) => ({ loading: { ...state.loading, accounts: false } }));
        }
      },

      refreshTransactions: async (opts) => {
        const { token, activeCompany } = get();
        if (!token || !activeCompany) return;
        set((state) => ({ loading: { ...state.loading, transactions: true } }));
        try {
          const transactions = await api.transactions.list(token, activeCompany.id, opts);
          set({ transactions });
        } finally {
          set((state) => ({ loading: { ...state.loading, transactions: false } }));
        }
      },

      loadProfitLoss: async (preset, fromDate, toDate) => {
        const { token, activeCompany } = get();
        if (!token || !activeCompany) return;
        set((state) => ({ loading: { ...state.loading, profitLoss: true } }));
        try {
          const profitLoss = await api.reports.profitLoss(token, activeCompany.id, preset, fromDate, toDate);
          set({ profitLoss });
        } finally {
          set((state) => ({ loading: { ...state.loading, profitLoss: false } }));
        }
      },

      loadBalanceSheet: async (asOf) => {
        const { token, activeCompany } = get();
        if (!token || !activeCompany) return;
        set((state) => ({ loading: { ...state.loading, balanceSheet: true } }));
        try {
          const balanceSheet = await api.reports.balanceSheet(token, activeCompany.id, asOf);
          set({ balanceSheet });
        } finally {
          set((state) => ({ loading: { ...state.loading, balanceSheet: false } }));
        }
      },

      loadMembers: async () => {
        const { token, activeCompany } = get();
        if (!token || !activeCompany) return;
        set((state) => ({ loading: { ...state.loading, members: true } }));
        try {
          const members = await api.companies.members(token, activeCompany.id);
          set({ members });
        } finally {
          set((state) => ({ loading: { ...state.loading, members: false } }));
        }
      },
    }),
    {
      name: 'mvpmvp-session',
      partialize: (state) => ({
        token: state.token,
        currentUser: state.currentUser,
        companies: state.companies,
        activeCompany: state.activeCompany,
        activeRole: state.activeRole,
      }),
    },
  ),
);
