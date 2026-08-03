import React, { useState, useEffect, useMemo } from 'react';
import { useLeadContext } from '../store/LeadContext';
import { ChevronLeft, Landmark, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';
import './GarageSettlement.css';

interface GarageItem {
  id: string;
  name: string;
  balance: number;
}

interface SettlementDetail {
  id: string;
  netAmount: number;
  settled: boolean;
  settledAt?: string;
  createdAt: string;
  customerName: string;
  bookingDate: string;
  carBrand: string;
  carModel: string;
  billing: {
    id: string;
    totalAmount: number;
    paidTo: 'garage' | 'mechhelp';
    status: string;
    lineItems: Array<{
      id: string;
      name: string;
      amount: number;
      splitEnabled: boolean;
      mechhelpPct: number;
      garagePct: number;
    }>;
  } | null;
}

export const GarageSettlement: React.FC = () => {
  const { getGaragesWithBalances, getGarageSettlements, settleGarage } = useLeadContext();
  
  // Navigation states
  const [activeGarageId, setActiveGarageId] = useState<string | null>(null);
  const [activeGarageName, setActiveGarageName] = useState<string>('');
  const [selectedSettlement, setSelectedSettlement] = useState<SettlementDetail | null>(null);
  
  // Data states
  const [garages, setGarages] = useState<GarageItem[]>([]);
  const [settlements, setSettlements] = useState<SettlementDetail[]>([]);
  const [garageBalance, setGarageBalance] = useState<number>(0);
  
  // Loading & error states
  const [loadingGarages, setLoadingGarages] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Level 1: Garages list
  const loadGarages = async () => {
    try {
      setLoadingGarages(true);
      setError(null);
      const data = await getGaragesWithBalances();
      setGarages(data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load garages list. Please refresh.');
    } finally {
      setLoadingGarages(false);
    }
  };

  useEffect(() => {
    loadGarages();
  }, []);

  // Load Level 2: Garage settlements detail
  useEffect(() => {
    if (activeGarageId) {
      const loadDetails = async () => {
        try {
          setLoadingDetails(true);
          setError(null);
          const data = await getGarageSettlements(activeGarageId);
          setSettlements(data.settlements);
          setGarageBalance(data.balance);
        } catch (err: any) {
          console.error(err);
          setError(`Failed to load details for ${activeGarageName}.`);
        } finally {
          setLoadingDetails(false);
        }
      };
      loadDetails();
    } else {
      setSettlements([]);
      setGarageBalance(0);
    }
  }, [activeGarageId, activeGarageName]);

  // Sort Level 1 Garages by absolute balance descending
  const sortedGarages = useMemo(() => {
    return [...garages].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
  }, [garages]);

  const handleSettleAll = async () => {
    if (!activeGarageId) return;
    const confirmSettle = window.confirm(`Are you sure you want to mark all outstanding balances for "${activeGarageName}" as settled? This will clear the running total of ₹${Math.abs(garageBalance).toLocaleString('en-IN')}.`);
    if (!confirmSettle) return;

    try {
      setActionLoading(true);
      setError(null);
      await settleGarage(activeGarageId);
      
      // Reload details and list
      const data = await getGarageSettlements(activeGarageId);
      setSettlements(data.settlements);
      setGarageBalance(data.balance);
      loadGarages();
      alert('Garage balance marked as settled!');
    } catch (err: any) {
      console.error(err);
      setError('Failed to settle garage balance.');
    } finally {
      setActionLoading(false);
    }
  };

  const getBalanceBadge = (bal: number) => {
    if (bal > 0) {
      return <span className="balance-badge text-green">You're owed ₹{bal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>;
    } else if (bal < 0) {
      return <span className="balance-badge text-red">You owe ₹{Math.abs(bal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>;
    } else {
      return <span className="balance-badge text-gray">Settled (₹0)</span>;
    }
  };

  return (
    <div className="settlements-page animate-fade-in">
      {error && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          <ShieldAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Level 1: Garage List */}
      {!activeGarageId && (
        <>
          <div className="dashboard-header" style={{ marginBottom: '2rem' }}>
            <div>
              <h1>Garage Settlement</h1>
              <p>Review balances, track splits, and manage payments between MechHelp and partner garages</p>
            </div>
          </div>

          {loadingGarages ? (
            <div style={{ textAlign: 'center', padding: '4rem' }}><p>Loading garages list...</p></div>
          ) : (
            <div className="garage-grid">
              {sortedGarages.length === 0 ? (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>No garages found.</div>
              ) : (
                sortedGarages.map((g) => (
                  <div 
                    key={g.id} 
                    className="garage-card surface-panel" 
                    onClick={() => {
                      setActiveGarageId(g.id);
                      setActiveGarageName(g.name);
                    }}
                  >
                    <div className="garage-card-header">
                      <Landmark size={24} className="garage-icon" />
                      <h3>{g.name}</h3>
                    </div>
                    <div className="garage-card-body">
                      {getBalanceBadge(g.balance)}
                    </div>
                    <div className="garage-card-footer">
                      <span>View details & settlements</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Level 2: Garage Detail View */}
      {activeGarageId && (
        <>
          <div className="detail-header-sticky">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button 
                type="button" 
                className="btn btn-secondary btn-icon" 
                onClick={() => {
                  setActiveGarageId(null);
                  setActiveGarageName('');
                }}
                disabled={actionLoading}
              >
                <ChevronLeft size={20} />
              </button>
              <div>
                <h1 style={{ fontSize: '1.5rem' }}>{activeGarageName}</h1>
                <p style={{ fontSize: '0.875rem', marginTop: '0.125rem' }}>Detailed billing & settlement history</p>
              </div>
            </div>

            <div className="balance-settle-action">
              <div className="balance-info-block">
                <span className="balance-label">Unsettled Balance:</span>
                <span className={`balance-value ${garageBalance > 0 ? 'text-green' : garageBalance < 0 ? 'text-red' : 'text-gray'}`}>
                  {garageBalance > 0 ? '+' : ''}{garageBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {garageBalance !== 0 && (
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleSettleAll} 
                  disabled={actionLoading || loadingDetails}
                >
                  <CheckCircle2 size={16} style={{ marginRight: '0.25rem' }} /> Mark Settled
                </button>
              )}
            </div>
          </div>

          {loadingDetails ? (
            <div style={{ textAlign: 'center', padding: '4rem' }}><p>Loading settlement history...</p></div>
          ) : (
            <div className="table-container" style={{ marginTop: '1.5rem' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer / Vehicle</th>
                    <th>Total Amount</th>
                    <th>Collected By</th>
                    <th>Net Effect</th>
                    <th>Status</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No settlement history found for this garage.
                      </td>
                    </tr>
                  ) : (
                    settlements.map((s) => (
                      <tr 
                        key={s.id} 
                        className={`settlement-row ${s.settled ? 'row-settled' : 'row-unsettled'}`}
                        onClick={() => setSelectedSettlement(s)}
                      >
                        <td>{new Date(s.createdAt).toLocaleDateString('en-GB')}</td>
                        <td>
                          <strong>{s.customerName}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {s.carBrand} {s.carModel}
                          </div>
                        </td>
                        <td>₹{s.billing?.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
                        <td>
                          <span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>
                            {s.billing?.paidTo || '-'}
                          </span>
                        </td>
                        <td>
                          <strong className={s.netAmount > 0 ? 'text-green' : s.netAmount < 0 ? 'text-red' : 'text-gray'}>
                            {s.netAmount > 0 ? '+' : ''}{s.netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </strong>
                        </td>
                        <td>
                          <span className={`badge ${s.settled ? 'badge-green' : 'badge-orange'}`}>
                            {s.settled ? 'Settled' : 'Outstanding'}
                          </span>
                        </td>
                        <td>
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-sm flex items-center justify-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSettlement(s);
                            }}
                          >
                            <FileText size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Level 3: Booking Detail Modal */}
      {selectedSettlement && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h2>Billing Breakdown</h2>
              <button onClick={() => setSelectedSettlement(null)} className="btn-icon">
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ fontSize: '0.875rem' }}>
              
              {/* Summary Block */}
              <div className="breakdown-section" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                  <div>
                    <span className="breakdown-label">Customer:</span>
                    <strong>{selectedSettlement.customerName}</strong>
                  </div>
                  <div>
                    <span className="breakdown-label">Vehicle:</span>
                    <span>{selectedSettlement.carBrand} {selectedSettlement.carModel}</span>
                  </div>
                  <div>
                    <span className="breakdown-label">Booking Date:</span>
                    <span>{new Date(selectedSettlement.bookingDate).toLocaleDateString('en-GB')}</span>
                  </div>
                  <div>
                    <span className="breakdown-label">Payment Collected By:</span>
                    <strong style={{ textTransform: 'capitalize' }}>{selectedSettlement.billing?.paidTo}</strong>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="breakdown-section" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <h4 style={{ marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Line Items</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(selectedSettlement.billing?.lineItems || []).map((item, idx) => (
                    <div key={item.id || idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderRadius: '4px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
                      <div>
                        <strong>{item.name}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {item.splitEnabled 
                            ? `Split enabled (${item.mechhelpPct}/${item.garagePct})` 
                            : 'Split disabled (100% to Garage)'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div>₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                        {item.splitEnabled && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            MH: ₹{(item.amount * item.mechhelpPct / 100).toFixed(2)} | G: ₹{(item.amount * item.garagePct / 100).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Net Settlement Calculations */}
              <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Total Amount:</span>
                  <strong>₹{selectedSettlement.billing?.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span>Total MechHelp Entitled:</span>
                  <span>₹{((selectedSettlement.billing?.lineItems || []).reduce((sum, item) => sum + (item.splitEnabled ? item.amount * item.mechhelpPct / 100 : 0), 0)).toFixed(2)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span>Total Garage Entitled:</span>
                  <span>₹{((selectedSettlement.billing?.lineItems || []).reduce((sum, item) => sum + (item.splitEnabled ? item.amount * item.garagePct / 100 : item.amount), 0)).toFixed(2)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  <span>Net Settlement Effect:</span>
                  <strong className={selectedSettlement.netAmount > 0 ? 'text-green' : selectedSettlement.netAmount < 0 ? 'text-red' : 'text-gray'}>
                    {selectedSettlement.netAmount > 0 ? `Garage owes MechHelp` : `MechHelp owes Garage`}
                    <div style={{ fontSize: '1.1rem', textAlign: 'right', marginTop: '0.1rem' }}>
                      ₹{Math.abs(selectedSettlement.netAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </strong>
                </div>
              </div>

            </div>
            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem', borderTop: '1px solid var(--border-light)' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedSettlement(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Close Icon for Modal Header
const X: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
);
