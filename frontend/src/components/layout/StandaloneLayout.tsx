import React from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';

const StandaloneLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <TopBar />
      <main className="relative z-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default StandaloneLayout;
