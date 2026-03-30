import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import FacilityLayout from './components/layout/FacilityLayout';
import StandaloneLayout from './components/layout/StandaloneLayout';
import CostbookPage from './pages/CostbookPage';
import CashOutPage from './pages/CashOutPage';
import ImportPage from './pages/ImportPage';
import NotFoundPage from './pages/NotFoundPage';
import ToastProvider from './components/common/ToastProvider';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { BudgetDataProvider } from './context/BudgetDataContext';
import { DisplaySettingsProvider } from './context/DisplaySettingsContext';
import { FacilityProvider, useFacility } from './context/FacilityContext';
import { AuthProvider } from './context/AuthContext';
import { ConfigProvider } from './context/ConfigContext';
import { YearProvider } from './context/YearContext';
import AuthGuard from './components/auth/AuthGuard';

const FacilitiesPage = lazy(() => import('./pages/FacilitiesPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

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
        <ConfigProvider>
          <BrowserRouter basename={import.meta.env.VITE_URL_PREFIX || ''}>
            <FacilityProvider>
              <BudgetDataProvider>
                <YearProvider>
                  <DisplaySettingsProvider>
                    <ToastProvider>
                      <Suspense fallback={<div className="p-6 text-sm text-gray-400">Loading...</div>}>
                        <ErrorBoundary>
                          <Routes>
                            {/* Redirect root to current facility */}
                            <Route path="/" element={<RootRedirect />} />

                            {/* Facility-scoped routes */}
                            <Route path="/f/:facilityId" element={<FacilityLayout />}>
                              <Route path="costbook" element={<CostbookPage />} />
                              <Route path="cashout" element={<CashOutPage />} />
                              <Route path="import" element={<ImportPage />} />
                              <Route index element={<Navigate to="costbook" replace />} />
                            </Route>

                            {/* Standalone routes */}
                            <Route element={<StandaloneLayout />}>
                              <Route path="/facilities" element={<FacilitiesPage />} />
                              <Route path="/admin" element={<AdminPage />} />
                            </Route>

                            {/* 404 */}
                            <Route path="*" element={<NotFoundPage />} />
                          </Routes>
                        </ErrorBoundary>
                      </Suspense>
                    </ToastProvider>
                  </DisplaySettingsProvider>
                </YearProvider>
              </BudgetDataProvider>
          </FacilityProvider>
          </BrowserRouter>
        </ConfigProvider>
      </AuthGuard>
    </AuthProvider>
  );
};

export default App;
