import React from 'react';

export const Settings: React.FC = () => {
  return (
    <div className="settings animate-fade-in">
      <div className="dashboard-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1>Settings</h1>
          <p>Configure CRM preferences (Coming soon)</p>
        </div>
      </div>
      <div className="surface-panel" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>Settings module will be implemented after Supabase integration.</p>
      </div>
    </div>
  );
};
