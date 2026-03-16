import React from 'react';
import TopBar from './TopBar';
import TabBar from './TabBar';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <TopBar />
      <TabBar />
      <main className="flex-1">{children}</main>
    </div>
  );
};

export default AppLayout;
