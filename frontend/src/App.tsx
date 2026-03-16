import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import CostbookPage from './pages/CostbookPage';
import CashOutPage from './pages/CashOutPage';
import ImportPage from './pages/ImportPage';
import ToastProvider from './components/common/ToastProvider';
import { BudgetDataProvider } from './context/BudgetDataContext';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <BudgetDataProvider>
        <ToastProvider>
          <AppLayout>
            <Routes>
              <Route path="/" element={<CostbookPage />} />
              <Route path="/cashout" element={<CashOutPage />} />
              <Route path="/import" element={<ImportPage />} />
            </Routes>
          </AppLayout>
        </ToastProvider>
      </BudgetDataProvider>
    </BrowserRouter>
  );
};

export default App;
