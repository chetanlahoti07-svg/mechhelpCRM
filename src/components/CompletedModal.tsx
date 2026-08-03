import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { useLeadContext } from '../store/LeadContext';
import type { Lead } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
}

interface TempLineItem {
  name: string;
  amount: string;
  splitEnabled: boolean;
  mechhelpPct: number;
  garagePct: number;
  showPctEdit: boolean;
}

export const CompletedModal: React.FC<Props> = ({ isOpen, onClose, lead }) => {
  const { finalizeBilling } = useLeadContext();
  const [lineItems, setLineItems] = useState<TempLineItem[]>([
    { name: 'General Service', amount: '', splitEnabled: true, mechhelpPct: 20, garagePct: 80, showPctEdit: false }
  ]);
  const [paidTo, setPaidTo] = useState<'garage' | 'mechhelp'>('garage');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit fields for lead details if needed
  const [customerName, setCustomerName] = useState('');
  const [carBrand, setCarBrand] = useState('');
  const [carModel, setCarModel] = useState('');
  const [garageAssigned, setGarageAssigned] = useState('');
  const [bookingDateTime, setBookingDateTime] = useState('');

  useEffect(() => {
    if (lead) {
      setCustomerName(lead.customerName);
      setCarBrand(lead.carBrand);
      setCarModel(lead.carModel);
      setGarageAssigned(lead.garageAssigned || '');
      setBookingDateTime(lead.bookingDateTime ? new Date(lead.bookingDateTime).toLocaleDateString('en-GB') : '');
      
      // Reset fields
      setLineItems([
        { name: 'General Service', amount: '', splitEnabled: true, mechhelpPct: 20, garagePct: 80, showPctEdit: false }
      ]);
      setPaidTo('garage');
      setError(null);
    }
  }, [lead]);

  if (!isOpen || !lead) return null;

  const handleAddItem = () => {
    setLineItems(prev => [
      ...prev,
      { name: '', amount: '', splitEnabled: true, mechhelpPct: 20, garagePct: 80, showPctEdit: false }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof TempLineItem, value: any) => {
    setLineItems(prev => prev.map((item, i) => {
      if (i === index) {
        const updated = { ...item, [field]: value };
        if (field === 'mechhelpPct') {
          updated.garagePct = Math.max(0, 100 - Number(value));
        } else if (field === 'garagePct') {
          updated.mechhelpPct = Math.max(0, 100 - Number(value));
        }
        return updated;
      }
      return item;
    }));
  };

  const runningTotal = lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const handleSave = async () => {
    try {
      setError(null);
      setIsSaving(true);

      // Validation
      if (lineItems.some(item => !item.name.trim())) {
        throw new Error('All line items must have a name.');
      }
      if (lineItems.some(item => isNaN(Number(item.amount)) || Number(item.amount) < 0)) {
        throw new Error('All line items must have a valid non-negative amount.');
      }

      // Finalize split values sum to 100
      lineItems.forEach((item, idx) => {
        if (item.splitEnabled && (item.mechhelpPct + item.garagePct !== 100)) {
          throw new Error(`Line item #${idx + 1} split percentages must sum to 100%.`);
        }
      });

      // Map line items to format expected by API
      const formattedItems = lineItems.map(item => ({
        name: item.name,
        amount: Number(item.amount) || 0,
        splitEnabled: item.splitEnabled,
        mechhelpPct: item.splitEnabled ? item.mechhelpPct : 0,
        garagePct: item.splitEnabled ? item.garagePct : 100
      }));

      await finalizeBilling(lead.id, formattedItems, paidTo);
      onClose();
    } catch (err: any) {
      console.error(err);
      // The API returns actionable error messages (e.g. garage name mismatch) — surface them as-is
      setError(err.message || 'Failed to complete booking. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-fade-in" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2>Mark Booking Completed</h2>
          <button onClick={onClose} className="btn-icon" disabled={isSaving}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ paddingBottom: '1.5rem' }}>
          {error && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              <ShieldAlert size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Summary */}
          <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>1. Booking Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', fontSize: '0.875rem' }}>
              <div>
                <label className="form-label" style={{ marginBottom: '0.25rem' }}>Customer Name</label>
                <input type="text" className="form-input" value={customerName} onChange={e => setCustomerName(e.target.value)} disabled={isSaving} />
              </div>
              <div>
                <label className="form-label" style={{ marginBottom: '0.25rem' }}>Vehicle</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="text" className="form-input" placeholder="Brand" value={carBrand} onChange={e => setCarBrand(e.target.value)} disabled={isSaving} />
                  <input type="text" className="form-input" placeholder="Model" value={carModel} onChange={e => setCarModel(e.target.value)} disabled={isSaving} />
                </div>
              </div>
              <div>
                <label className="form-label" style={{ marginBottom: '0.25rem' }}>Garage</label>
                <input type="text" className="form-input" value={garageAssigned} onChange={e => setGarageAssigned(e.target.value)} disabled={isSaving} />
              </div>
              <div>
                <label className="form-label" style={{ marginBottom: '0.25rem' }}>Booking Date</label>
                <input type="text" className="form-input" value={bookingDateTime} disabled />
              </div>
            </div>
          </div>

          {/* Section 2: Line Items */}
          <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>2. Sold Services / Parts</h3>
              <button type="button" className="btn btn-secondary btn-sm flex items-center gap-1" onClick={handleAddItem} disabled={isSaving}>
                <Plus size={14} /> Add Item
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {lineItems.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-secondary)' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ flex: 2 }}>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Item name (e.g. Engine Oil)" 
                        value={item.name} 
                        onChange={e => handleItemChange(idx, 'name', e.target.value)}
                        disabled={isSaving} 
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <input 
                        type="number" 
                        className="form-input" 
                        placeholder="Amount (₹)" 
                        value={item.amount} 
                        onChange={e => handleItemChange(idx, 'amount', e.target.value)}
                        disabled={isSaving} 
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}>
                      <input 
                        type="checkbox" 
                        id={`split-${idx}`}
                        checked={item.splitEnabled} 
                        onChange={e => handleItemChange(idx, 'splitEnabled', e.target.checked)}
                        disabled={isSaving} 
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                      <label htmlFor={`split-${idx}`} style={{ fontSize: '0.75rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>Split (80/20)</label>
                    </div>
                    <button 
                      type="button" 
                      className="btn-icon" 
                      onClick={() => handleRemoveItem(idx)}
                      disabled={isSaving || lineItems.length === 1}
                      style={{ color: 'var(--danger)' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {item.splitEnabled && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                      {!item.showPctEdit ? (
                        <button 
                          type="button" 
                          onClick={() => handleItemChange(idx, 'showPctEdit', true)}
                          style={{ background: 'none', border: 'none', color: 'var(--info)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          edit split %
                        </button>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>MechHelp %:</span>
                          <input 
                            type="number" 
                            className="form-input" 
                            style={{ width: '60px', padding: '0.25rem' }} 
                            value={item.mechhelpPct} 
                            onChange={e => handleItemChange(idx, 'mechhelpPct', Number(e.target.value))} 
                            disabled={isSaving}
                            max={100}
                            min={0}
                          />
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Garage %:</span>
                          <input 
                            type="number" 
                            className="form-input" 
                            style={{ width: '60px', padding: '0.25rem' }} 
                            value={item.garagePct} 
                            onChange={e => handleItemChange(idx, 'garagePct', Number(e.target.value))} 
                            disabled={isSaving}
                            max={100}
                            min={0}
                          />
                          <button 
                            type="button" 
                            onClick={() => handleItemChange(idx, 'showPctEdit', false)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer' }}
                          >
                            Hide
                          </button>
                        </div>
                      )}
                      
                      {!item.showPctEdit && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          MechHelp: ₹{((Number(item.amount) || 0) * item.mechhelpPct / 100).toFixed(2)} | Garage: ₹{((Number(item.amount) || 0) * item.garagePct / 100).toFixed(2)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', padding: '0.75rem 1rem', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)' }}>
              <strong>Running Total:</strong>
              <strong style={{ fontSize: '1.25rem', color: 'var(--accent-primary)' }}>₹{runningTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </div>
          </div>

          {/* Section 3: Who Received Payment */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>3. Who Received Payment?</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
              <button 
                type="button" 
                className={`btn ${paidTo === 'garage' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPaidTo('garage')}
                disabled={isSaving}
                style={{ padding: '0.75rem' }}
              >
                Garage
              </button>
              <button 
                type="button" 
                className={`btn ${paidTo === 'mechhelp' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPaidTo('mechhelp')}
                disabled={isSaving}
                style={{ padding: '0.75rem' }}
              >
                MechHelp
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              {paidTo === 'garage' 
                ? "💡 Garage collected payment directly from the customer." 
                : "💡 Customer paid MechHelp directly."}
            </p>
          </div>

          {/* Modal Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-light)' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Processing...' : 'Save & Mark Completed'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
