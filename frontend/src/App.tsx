import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import FacilityLayout from './components/layout/FacilityLayout';
import StandaloneLayout from './components/layout/StandaloneLayout';
import CostbookPage from './pages/CostbookPage';
import CashOutPage from './pages/CashOutPage';
import ImportPage from './pages/ImportPage';
import BudgetOverviewPage from './pages/BudgetOverviewPage';
import NotFoundPage from './pages/NotFoundPage';
import ToastProvider from './components/common/ToastProvider';
import { BudgetDataProvider } from './context/BudgetDataContext';
import { DisplaySettingsProvider } from './context/DisplaySettingsContext';
import { FacilityProvider, useFacility } from './context/FacilityContext';
import { AuthProvider } from './context/AuthContext';
import AuthGuard from './components/auth/AuthGuard';

const FacilitiesPage = lazy(() => import('./pages/FacilitiesPage'));

// ---------------------------------------------------------------------------
// RootRedirect — sends `/` to `/f/{currentFacilityId}/costbook`
// ---------------------------------------------------------------------------

const RootRedirect: React.FC = () => {
  const { currentFacility, facilities } = useFacility();
  const id = currentFacility?.id ?? facilities[0]?.id;
  if (!id) {
    return <Navigate to="/facilities" replace />;
  }
  return <Navigate to={`/f/${id}/costbook`} replace />;
};

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AuthGuard>
        <BrowserRouter>
          <FacilityProvider>
            <BudgetDataProvider>
              <DisplaySettingsProvider>
                <ToastProvider>
                  <Suspense fallback={<div className="p-6 text-sm text-gray-400">Loading...</div>}>
                    <Routes>
                      {/* Redirect root to current facility */}
                      <Route path="/" element={<RootRedirect />} />

                      {/* Facility-scoped routes */}
                      <Route path="/f/:facilityId" element={<FacilityLayout />}>
                        <Route path="costbook" element={<CostbookPage />} />
                        <Route path="cashout" element={<CashOutPage />} />
                        <Route path="overview" element={<BudgetOverviewPage />} />
                        <Route path="import" element={<ImportPage />} />
                        <Route index element={<Navigate to="costbook" replace />} />
                      </Route>

                      {/* Standalone routes */}
                      <Route element={<StandaloneLayout />}>
                        <Route path="/facilities" element={<FacilitiesPage />} />
                      </Route>

                      {/* 404 */}
                      <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                  </Suspense>
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
