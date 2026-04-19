import type {
  Account,
  BalanceSheetResult,
  Company,
  CompanyMember,
  DashboardSummary,
  DatePreset,
  ProfitLossResult,
  SessionPayload,
  Transaction,
  User,
} from '../types';

function ensureApi() {
  if (!window.api) {
    throw new Error('Desktop API unavailable. Run this app in Electron.');
  }
  return window.api;
}

export const api = {
  auth: {
    register: (name: string, email: string, password: string, confirmPassword: string) =>
      ensureApi().register({ name, email, password, confirmPassword }) as Promise<SessionPayload>,
    login: (email: string, password: string) =>
      ensureApi().login({ email, password }) as Promise<SessionPayload>,
    logout: (token: string) => ensureApi().logout({ token }),
    bootstrap: (token: string, activeCompanyId?: number | null) =>
      ensureApi().bootstrap({ token, activeCompanyId }) as Promise<SessionPayload | null>,
  },
  companies: {
    list: (token: string) => ensureApi().listCompanies({ token }) as Promise<Company[]>,
    create: (token: string, name: string, fiscalYearStart: number) =>
      ensureApi().createCompany({ token, name, fiscalYearStart }) as Promise<{
        company: Company;
        role: 'owner';
      }>,
    update: (token: string, companyId: number, name: string, fiscalYearStart: number) =>
      ensureApi().updateCompany({ token, companyId, name, fiscalYearStart }) as Promise<Company>,
    delete: (token: string, companyId: number) => ensureApi().deleteCompany({ token, companyId }),
    members: (token: string, companyId: number) =>
      ensureApi().listCompanyMembers({ token, companyId }) as Promise<CompanyMember[]>,
    addMember: (token: string, companyId: number, email: string, role: 'admin' | 'member') =>
      ensureApi().addCompanyMember({ token, companyId, email, role }),
    updateMemberRole: (
      token: string,
      companyId: number,
      membershipId: number,
      role: 'admin' | 'member',
    ) => ensureApi().updateCompanyMemberRole({ token, companyId, membershipId, role }),
    removeMember: (token: string, companyId: number, membershipId: number) =>
      ensureApi().removeCompanyMember({ token, companyId, membershipId }),
  },
  accounts: {
    list: (token: string, companyId: number) =>
      ensureApi().listAccounts({ token, companyId }) as Promise<Account[]>,
    create: (
      token: string,
      companyId: number,
      name: string,
      type: Account['type'],
      code?: string,
    ) =>
      ensureApi().createAccount({ token, companyId, name, type, code: code ?? '' }) as Promise<Account>,
    update: (token: string, companyId: number, accountId: number, name: string, code?: string) =>
      ensureApi().updateAccount({ token, companyId, accountId, name, code: code ?? '' }) as Promise<Account>,
    setActive: (token: string, companyId: number, accountId: number, isActive: boolean) =>
      ensureApi().setAccountActive({ token, companyId, accountId, isActive }),
    delete: (token: string, companyId: number, accountId: number) =>
      ensureApi().deleteAccount({ token, companyId, accountId }),
  },
  transactions: {
    list: (
      token: string,
      companyId: number,
      args?: {
        accountId?: number | null;
        fromDate?: string;
        toDate?: string;
        sortBy?: 'date' | 'amount' | 'created_at' | 'description';
        sortDir?: 'asc' | 'desc';
      },
    ) =>
      ensureApi().listTransactions({
        token,
        companyId,
        accountId: args?.accountId ?? null,
        fromDate: args?.fromDate ?? '',
        toDate: args?.toDate ?? '',
        sortBy: args?.sortBy ?? 'date',
        sortDir: args?.sortDir ?? 'desc',
      }) as Promise<Transaction[]>,
    create: (
      token: string,
      companyId: number,
      accountId: number,
      date: string,
      amount: number,
      description: string,
    ) =>
      ensureApi().createTransaction({
        token,
        companyId,
        accountId,
        date,
        amount,
        description,
      }) as Promise<Transaction>,
    update: (
      token: string,
      companyId: number,
      transactionId: number,
      accountId: number,
      date: string,
      amount: number,
      description: string,
    ) =>
      ensureApi().updateTransaction({
        token,
        companyId,
        transactionId,
        accountId,
        date,
        amount,
        description,
      }) as Promise<Transaction>,
    delete: (token: string, companyId: number, transactionId: number) =>
      ensureApi().deleteTransaction({ token, companyId, transactionId }),
  },
  dashboard: {
    summary: (token: string, companyId: number) =>
      ensureApi().dashboardSummary({ token, companyId }) as Promise<DashboardSummary>,
  },
  reports: {
    profitLoss: (
      token: string,
      companyId: number,
      preset: DatePreset,
      startDate?: string,
      endDate?: string,
    ) =>
      ensureApi().profitLossReport({
        token,
        companyId,
        preset,
        startDate: startDate ?? '',
        endDate: endDate ?? '',
      }) as Promise<ProfitLossResult>,
    balanceSheet: (token: string, companyId: number, asOfDate: string) =>
      ensureApi().balanceSheetReport({ token, companyId, asOfDate }) as Promise<BalanceSheetResult>,
  },
  profile: {
    updateName: (token: string, name: string) =>
      ensureApi().updateProfileName({ token, name }) as Promise<User>,
    changePassword: (
      token: string,
      currentPassword: string,
      newPassword: string,
      confirmPassword: string,
    ) =>
      ensureApi().changeProfilePassword({
        token,
        currentPassword,
        newPassword,
        confirmPassword,
      }),
  },
};
