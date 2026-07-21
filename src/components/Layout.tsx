import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { StickyHeader } from './StickyHeader';

export const Layout: React.FC = () => {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <StickyHeader />
        <div className="page-container">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
