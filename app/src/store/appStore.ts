import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../lib/api'
import type {
  Account,
  BalanceSheetReport,
  Company,
  CompanyMember,
  DashboardSummary,
  DatePreset,
  ProfitLossReport,
  Role,
  Transaction,
  User,
} from '../types'

type LoadingState = {
  dashboard: boolean
  accounts: boolean
  transactions: boolean
  profitLoss: boolean
  balanceSheet: boolean
  members: boolean
}

type AuthActionResult = {
  needsCompanyCreation: boolean
  needsCompanySelection: boolean
}

interface AppState {
  token: string | null
  currentUser: User | null
  companies: Array<Company & { role: Role }>
  activeCompany: Company | null
  activeRole: Role | null

  accounts: Account[]
  transactions: Transaction[]
  dashboard: DashboardSummary | null
  profitLoss: ProfitLossReport | null
  balanceSheet: BalanceSheetReport | null
  companyMembers: CompanyMember[]

  loading: LoadingState
  error: string | null
  initialized: boolean

  setError: (message: string | null) => void
  clearDataForCompanySwitch: () => void
  bootstrap: () => Promise<void>
  register: (
    name: string,
    email: string,
    password: string,
    confirmPassword: string,
  ) => Promise<AuthActionResult>
  login: (email: string, password: string) => Promise<AuthActionResult>
  logout: () => Promise<void>

  loadCompanies: () => Promise<void>
  createCompany: (name: string, fiscalYearStart: number) => Promise<void>
  switchCompany: (companyId: number) => Promise<void>

  refreshDashboard: () => Promise<void>
  refreshAccounts: () => Promise<void>
  refreshTransactions: (opts?: {
    accountId?: number
    fromDate?: string
    toDate?: string
    sortBy?: 'date' | 'amount' | 'created_at' | 'description'
    sortDir?: 'asc' | 'desc'
  }) => Promise<void>
  loadProfitLoss: (
    preset: DatePreset,
    fromDate?: string,
    toDate?: string,
  ) => Promise<void>
  loadBalanceSheet: (asOf: string) => Promise<void>
  loadMembers: () => Promise<void>
}

const defaultLoading: LoadingState = {
  dashboard: false,
  accounts: false,
  transactions: false,
  profitLoss: false,
  balanceSheet: false,
  members: false,
}

function toAuthActionResult(companies: Array<Company & { role: Role }>): AuthActionResult {
  if (companies.length === 0) {
    return { needsCompanyCreation: true, needsCompanySelection: false }
  }
  return { needsCompanyCreation: false, needsCompanySelection: true }
}

function sortCompanies(companies: Array<Company & { role: Role }>) {
  return [...companies].sort((a, b) => a.name.localeCompare(b.name))
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      token: null,
      currentUser: null,
      companies: [],
      activeCompany: null,
      activeRole: null,

      accounts: [],
      transactions: [],
      dashboard: null,
      profitLoss: null,
      balanceSheet: null,
      companyMembers: [],

      loading: defaultLoading,
      error: null,
      initialized: false,

      setError: (message) => set({ error: message }),

      clearDataForCompanySwitch: () =>
        set({
          accounts: [],
          transactions: [],
          dashboard: null,
          profitLoss: null,
          balanceSheet: null,
          companyMembers: [],
        }),

      bootstrap: async () => {
        const { token, activeCompany } = get()
        if (!token) {
          set({ initialized: true })
          return
        }
        try {
          const response = await api.authBootstrap(token, activeCompany?.id ?? null)
          if (!response.user) {
            set({
              token: null,
              currentUser: null,
              companies: [],
              activeCompany: null,
              activeRole: null,
              initialized: true,
            })
            return
          }

          set({
            token: response.token,
            currentUser: response.user,
            companies: sortCompanies(response.companies),
            activeCompany: response.activeCompany,
            activeRole: response.activeRole,
            initialized: true,
          })
        } catch (error) {
          set({
            token: null,
            currentUser: null,
            companies: [],
            activeCompany: null,
            activeRole: null,
            initialized: true,
            error: error instanceof Error ? error.message : 'Failed to initialize app',
          })
        }
      },

      register: async (name, email, password, confirmPassword) => {
        const response = await api.register(name, email, password, confirmPassword)
        set({
          token: response.token,
          currentUser: response.user,
          companies: sortCompanies(response.companies),
          activeCompany: response.activeCompany,
          activeRole: response.activeRole,
          error: null,
        })
        return toAuthActionResult(response.companies)
      },

      login: async (email, password) => {
        const response = await api.login(email, password)
        set({
          token: response.token,
          currentUser: response.user,
          companies: sortCompanies(response.companies),
          activeCompany: response.activeCompany,
          activeRole: response.activeRole,
          error: null,
        })
        return toAuthActionResult(response.companies)
      },

      logout: async () => {
        const token = get().token
        try {
          await api.logout(token)
        } finally {
          set({
            token: null,
            currentUser: null,
            companies: [],
            activeCompany: null,
            activeRole: null,
            accounts: [],
            transactions: [],
            dashboard: null,
            profitLoss: null,
            balanceSheet: null,
            companyMembers: [],
            loading: defaultLoading,
            error: null,
          })
        }
      },

      loadCompanies: async () => {
        const token = get().token
        const companies = await api.listCompanies(token)
        const activeCompany = get().activeCompany
        const stillActive = activeCompany
          ? companies.find((company) => company.id === activeCompany.id)
          : null
        set({
          companies: sortCompanies(companies),
          activeCompany: stillActive
            ? {
                id: stillActive.id,
                name: stillActive.name,
                fiscal_year_start: stillActive.fiscal_year_start,
                created_at: stillActive.created_at,
              }
            : null,
          activeRole: stillActive?.role ?? null,
        })
      },

      createCompany: async (name, fiscalYearStart) => {
        const token = get().token
        const created = await api.createCompany(token, name, fiscalYearStart)
        const companies = await api.listCompanies(token)
        set({
          companies: sortCompanies(companies),
          activeCompany: created.company,
          activeRole: created.role,
          error: null,
        })
        get().clearDataForCompanySwitch()
      },

      switchCompany: async (companyId) => {
        const membership = get().companies.find((company) => company.id === companyId)
        if (!membership) {
          throw new Error('Company membership not found')
        }

        get().clearDataForCompanySwitch()
        set({
          activeCompany: {
            id: membership.id,
            name: membership.name,
            fiscal_year_start: membership.fiscal_year_start,
            created_at: membership.created_at,
          },
          activeRole: membership.role,
          error: null,
        })
      },

      refreshDashboard: async () => {
        const { token, activeCompany } = get()
        if (!activeCompany) return
        set((state) => ({ loading: { ...state.loading, dashboard: true } }))
        try {
          const dashboard = await api.getDashboard(token, activeCompany.id)
          set({ dashboard })
        } finally {
          set((state) => ({ loading: { ...state.loading, dashboard: false } }))
        }
      },

      refreshAccounts: async () => {
        const { token, activeCompany } = get()
        if (!activeCompany) return
        set((state) => ({ loading: { ...state.loading, accounts: true } }))
        try {
          const accounts = await api.listAccounts(token, activeCompany.id)
          set({ accounts })
        } finally {
          set((state) => ({ loading: { ...state.loading, accounts: false } }))
        }
      },

      refreshTransactions: async (opts) => {
        const { token, activeCompany } = get()
        if (!activeCompany) return
        set((state) => ({ loading: { ...state.loading, transactions: true } }))
        try {
          const transactions = await api.listTransactions(token, activeCompany.id, opts)
          set({ transactions })
        } finally {
          set((state) => ({ loading: { ...state.loading, transactions: false } }))
        }
      },

      loadProfitLoss: async (preset, fromDate, toDate) => {
        const { token, activeCompany } = get()
        if (!activeCompany) return
        set((state) => ({ loading: { ...state.loading, profitLoss: true } }))
        try {
          const report = await api.getProfitLoss(token, activeCompany.id, preset, fromDate, toDate)
          set({ profitLoss: report })
        } finally {
          set((state) => ({ loading: { ...state.loading, profitLoss: false } }))
        }
      },

      loadBalanceSheet: async (asOf) => {
        const { token, activeCompany } = get()
        if (!activeCompany) return
        set((state) => ({ loading: { ...state.loading, balanceSheet: true } }))
        try {
          const report = await api.getBalanceSheet(token, activeCompany.id, asOf)
          set({ balanceSheet: report })
        } finally {
          set((state) => ({ loading: { ...state.loading, balanceSheet: false } }))
        }
      },

      loadMembers: async () => {
        const { token, activeCompany } = get()
        if (!activeCompany) return
        set((state) => ({ loading: { ...state.loading, members: true } }))
        try {
          const companyMembers = await api.listCompanyMembers(token, activeCompany.id)
          set({ companyMembers })
        } finally {
          set((state) => ({ loading: { ...state.loading, members: false } }))
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
)
