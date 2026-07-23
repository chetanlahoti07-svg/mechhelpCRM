import React from 'react';

export const Reports: React.FC = () => {
  return (
    <div className="reports animate-fade-in">
      <div className="dashboard-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1>Reports</h1>
          <p>Analytics and insights (Coming soon)</p>
        </div>
      </div>
      <div className="surface-panel" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>Reports module will be implemented after Supabase integration.</p>
      </div>
    </div>
  );
};
