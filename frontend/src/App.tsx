import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import CostbookPage from './pages/CostbookPage';
import CashOutPage from './pages/CashOutPage';
import ImportPage from './pages/ImportPage';
import ToastProvider from './components/common/ToastProvider';
import { BudgetDataProvider } from './context/BudgetDataContext';
import { DisplaySettingsProvider } from './context/DisplaySettingsContext';
import { FacilityProvider } from './context/FacilityContext';
import { AuthProvider } from './context/AuthContext';
import AuthGuard from './components/auth/AuthGuard';

const FacilitiesPage = lazy(() => import('./pages/FacilitiesPage'));

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AuthGuard>
        <BrowserRouter>
          <FacilityProvider>
            <BudgetDataProvider>
              <DisplaySettingsProvider>
                <ToastProvider>
                  <AppLayout>
                    <Suspense fallback={<div className="p-6 text-sm text-gray-400">Loading...</div>}>
                      <Routes>
                        <Route path="/" element={<CostbookPage />} />
                        <Route path="/cashout" element={<CashOutPage />} />
                        <Route path="/import" element={<ImportPage />} />
                        <Route path="/facilities" element={<FacilitiesPage />} />
                      </Routes>
                    </Suspense>
                  </AppLayout>
                </ToastProvider>
              </DisplaySettingsProvider>
            </BudgetDataProvider>
          </FacilityProvider>
        </BrowserRouter>
      </AuthGuard>
    </AuthProvider>
  );
};

export default App;
