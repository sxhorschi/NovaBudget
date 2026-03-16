import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import CostbookPage from './pages/CostbookPage';
import CashOutPage from './pages/CashOutPage';
import ImportPage from './pages/ImportPage';
import ToastProvider from './components/common/ToastProvider';
import { BudgetDataProvider } from './context/BudgetDataContext';
import { DisplaySettingsProvider } from './context/DisplaySettingsContext';
import { AuthProvider } from './context/AuthContext';
import AuthGuard from './components/auth/AuthGuard';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AuthGuard>
        <BrowserRouter>
          <BudgetDataProvider>
            <DisplaySettingsProvider>
              <ToastProvider>
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<CostbookPage />} />
                    <Route path="/cashout" element={<CashOutPage />} />
                    <Route path="/import" element={<ImportPage />} />
                  </Routes>
                </AppLayout>
              </ToastProvider>
            </DisplaySettingsProvider>
          </BudgetDataProvider>
        </BrowserRouter>
      </AuthGuard>
    </AuthProvider>
  );
};

export default App;
