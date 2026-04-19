import { Navigate, Route, Routes } from 'react-router-dom';
import { AppBootstrap } from './components/AppBootstrap';
import { RequireAuth } from './components/RequireAuth';
import { AppShell } from './layouts/AppShell';
import { BalanceSheetPage } from './pages/BalanceSheetPage';
import { ChartOfAccountsPage } from './pages/ChartOfAccountsPage';
import { CompanySelectionPage } from './pages/CompanySelectionPage';
import { CompanySettingsPage } from './pages/CompanySettingsPage';
import { CreateCompanyPage } from './pages/CreateCompanyPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { ProfileSettingsPage } from './pages/ProfileSettingsPage';
import { ProfitLossPage } from './pages/ProfitLossPage';
import { RegisterPage } from './pages/RegisterPage';
import { TransactionsPage } from './pages/TransactionsPage';

function App() {
  return (
    <AppBootstrap>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/companies/select"
          element={
            <RequireAuth>
              <CompanySelectionPage />
            </RequireAuth>
          }
        />
        <Route
          path="/companies/new"
          element={
            <RequireAuth>
              <CreateCompanyPage />
            </RequireAuth>
          }
        />
        <Route
          element={
            <RequireAuth requireCompany>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/accounts" element={<ChartOfAccountsPage />} />
          <Route path="/reports/profit-loss" element={<ProfitLossPage />} />
          <Route path="/reports/balance-sheet" element={<BalanceSheetPage />} />
          <Route path="/settings/company" element={<CompanySettingsPage />} />
          <Route path="/settings/profile" element={<ProfileSettingsPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppBootstrap>
  );
}

export default App;
