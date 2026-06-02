import React from 'react';

export function ReportsView() {
  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>Reports</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '24px' }}>
        <div className="card">
          <div className="card-title">Daily Summary</div>
          <div style={{ color: 'var(--text-secondary)' }}>Coming soon</div>
        </div>
        <div className="card">
          <div className="card-title">Weekly Summary</div>
          <div style={{ color: 'var(--text-secondary)' }}>Coming soon</div>
        </div>
      </div>
    </div>
  );
}
