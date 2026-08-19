import React, { useState } from 'react';
import { X, Plus, Trash2, ShieldAlert, Landmark } from 'lucide-react';
import { useLeadContext } from '../store/LeadContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;        // called after success so parent can refresh
  garageId: string;
  garageName: string;
}

interface TempLineItem {
  name: string;
  amount: string;
  splitEnabled: boolean;
  mechhelpPct: number;
  garagePct: number;
  showPctEdit: boolean;
}

export const AddDirectCustomerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSaved,
  garageId,
  garageName,
}) => {
  const { finalizeDirectBilling } = useLeadContext();

  // Section 1 fields
  const [customerName, setCustomerName] = useState('');
  const [carBrand, setCarBrand]         = useState('');
  const [carModel, setCarModel]         = useState('');
  const [numberPlate, setNumberPlate]   = useState('');
  const [bookingDate, setBookingDate]   = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  // Section 2 fields
  const [lineItems, setLineItems] = useState<TempLineItem[]>([
    { name: 'General Service', amount: '', splitEnabled: true, mechhelpPct: 20, garagePct: 80, showPctEdit: false },
  ]);
  const [discountStr, setDiscountStr] = useState('0');

  // Section 3
  const [paidTo, setPaidTo] = useState<'garage' | 'mechhelp'>('garage');

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // ── helpers ────────────────────────────────────────────────────────────────

  const handleAddItem = () =>
    setLineItems(prev => [
      ...prev,
      { name: '', amount: '', splitEnabled: true, mechhelpPct: 20, garagePct: 80, showPctEdit: false },
    ]);

  const handleRemoveItem = (idx: number) => {
    if (lineItems.length === 1) return;
    setLineItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: keyof TempLineItem, value: any) => {
    setLineItems(prev =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: value };
        if (field === 'mechhelpPct') updated.garagePct  = Math.max(0, 100 - Number(value));
        if (field === 'garagePct')  updated.mechhelpPct = Math.max(0, 100 - Number(value));
        return updated;
      })
    );
  };

  const grossAmount  = lineItems.reduce((s, item) => s + (Number(item.amount) || 0), 0);
  const discountVal  = Math.max(0, Number(discountStr) || 0);
  const runningTotal = grossAmount - discountVal;

  // ── reset form when closed ─────────────────────────────────────────────────

  const handleClose = () => {
    setCustomerName('');
    setCarBrand('');
    setCarModel('');
    setNumberPlate('');
    const d = new Date();
    setBookingDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    setLineItems([{ name: 'General Service', amount: '', splitEnabled: true, mechhelpPct: 20, garagePct: 80, showPctEdit: false }]);
    setDiscountStr('0');
    setPaidTo('garage');
    setError(null);
    onClose();
  };

  // ── save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    try {
      setError(null);
      setIsSaving(true);

      if (!customerName.trim()) throw new Error('Customer Name is required.');
      if (lineItems.some(item => !item.name.trim()))
        throw new Error('All line items must have a name.');
      if (lineItems.some(item => isNaN(Number(item.amount)) || Number(item.amount) < 0))
        throw new Error('All line items must have a valid non-negative amount.');
      if (isNaN(discountVal) || discountVal < 0)
        throw new Error('Discount must be a valid non-negative number.');
      lineItems.forEach((item, idx) => {
        if (item.splitEnabled && item.mechhelpPct + item.garagePct !== 100)
          throw new Error(`Line item #${idx + 1} split percentages must sum to 100%.`);
      });

      const formattedItems = lineItems.map(item => ({
        name: item.name,
        amount: Number(item.amount) || 0,
        splitEnabled: item.splitEnabled,
        mechhelpPct: item.splitEnabled ? item.mechhelpPct : 0,
        garagePct:   item.splitEnabled ? item.garagePct   : 100,
      }));

      await finalizeDirectBilling(
        customerName.trim(),
        carBrand.trim(),
        carModel.trim(),
        numberPlate.trim(),
        bookingDate,
        garageId,
        garageName,
        formattedItems,
        paidTo,
        discountVal
      );

      handleClose();
      onSaved();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content surface-panel animate-fade-in" style={{ maxWidth: '620px', maxHeight: 'calc(100vh - 12rem)', overflowY: 'auto' }}>
        {/* Header */}
        <div className="modal-header">
          <h2>Add Direct / Walk-in Customer</h2>
          <button onClick={handleClose} className="btn-icon" disabled={isSaving}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ paddingBottom: '1.5rem' }}>
          {/* Garage badge — locked */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            <Landmark size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            <span style={{ color: 'var(--text-muted)' }}>Garage:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{garageName}</strong>
            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>locked</span>
          </div>

          {error && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              <ShieldAlert size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* ── Section 1: Customer & Vehicle ──────────────────────────────── */}
          <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>1. Customer Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', fontSize: '0.875rem' }}>
              <div>
                <label className="form-label" style={{ marginBottom: '0.25rem' }}>Customer Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Ramesh Sharma"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="form-label" style={{ marginBottom: '0.25rem' }}>Booking Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={bookingDate}
                  onChange={e => setBookingDate(e.target.value)}
                  disabled={isSaving}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" style={{ marginBottom: '0.25rem' }}>Vehicle</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="text" className="form-input" placeholder="Brand (e.g. Maruti)" value={carBrand} onChange={e => setCarBrand(e.target.value)} disabled={isSaving} />
                  <input type="text" className="form-input" placeholder="Model (e.g. Swift)" value={carModel} onChange={e => setCarModel(e.target.value)} disabled={isSaving} />
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" style={{ marginBottom: '0.25rem' }}>Number Plate</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. MH12AB1234"
                  value={numberPlate}
                  onChange={e => setNumberPlate(e.target.value)}
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          {/* ── Section 2: Line Items ─────────────────────────────────────── */}
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
                      <input type="text" className="form-input" placeholder="Item name (e.g. Engine Oil)" value={item.name} onChange={e => handleItemChange(idx, 'name', e.target.value)} disabled={isSaving} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <input type="number" className="form-input" placeholder="Amount (₹)" value={item.amount} onChange={e => handleItemChange(idx, 'amount', e.target.value)} disabled={isSaving} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}>
                      <input type="checkbox" id={`split-${idx}`} checked={item.splitEnabled} onChange={e => handleItemChange(idx, 'splitEnabled', e.target.checked)} disabled={isSaving} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                      <label htmlFor={`split-${idx}`} style={{ fontSize: '0.75rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>Split (80/20)</label>
                    </div>
                    <button type="button" className="btn-icon" onClick={() => handleRemoveItem(idx)} disabled={isSaving || lineItems.length === 1} style={{ color: 'var(--danger)' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {item.splitEnabled ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                      {!item.showPctEdit ? (
                        <button type="button" onClick={() => handleItemChange(idx, 'showPctEdit', true)} style={{ background: 'none', border: 'none', color: 'var(--info)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}>
                          edit split %
                        </button>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>MechHelp %:</span>
                          <input type="number" className="form-input" style={{ width: '60px', padding: '0.25rem' }} value={item.mechhelpPct} onChange={e => handleItemChange(idx, 'mechhelpPct', Number(e.target.value))} disabled={isSaving} max={100} min={0} />
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Garage %:</span>
                          <input type="number" className="form-input" style={{ width: '60px', padding: '0.25rem' }} value={item.garagePct} onChange={e => handleItemChange(idx, 'garagePct', Number(e.target.value))} disabled={isSaving} max={100} min={0} />
                          <button type="button" onClick={() => handleItemChange(idx, 'showPctEdit', false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer' }}>Hide</button>
                        </div>
                      )}
                      {!item.showPctEdit && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          MechHelp: ₹{((Number(item.amount) || 0) * item.mechhelpPct / 100).toFixed(2)} | Garage: ₹{((Number(item.amount) || 0) * item.garagePct / 100).toFixed(2)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      No split — full ₹{(Number(item.amount) || 0).toFixed(2)} goes to Garage
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Discount */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.25rem', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px dashed var(--border-light)', backgroundColor: 'var(--bg-secondary)' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label" style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>Discount (₹)</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500, background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-light)' }}>absorbed by MechHelp</span>
                </label>
                <input type="number" className="form-input" placeholder="0" min={0} value={discountStr} onChange={e => setDiscountStr(e.target.value)} disabled={isSaving} />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '220px', margin: 0 }}>
                💡 Discount reduces MechHelp's share only — the garage's entitlement stays the same.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', padding: '0.75rem 1rem', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-light)' }}>
              <strong>Running Total (charged to customer):</strong>
              <strong style={{ fontSize: '1.25rem', color: 'var(--accent-primary)' }}>₹{runningTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </div>
          </div>

          {/* ── Section 3: Who Received Payment ─────────────────────────── */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>3. Who Received Payment?</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
              <button type="button" className={`btn ${paidTo === 'garage' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPaidTo('garage')} disabled={isSaving} style={{ padding: '0.75rem' }}>Garage</button>
              <button type="button" className={`btn ${paidTo === 'mechhelp' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPaidTo('mechhelp')} disabled={isSaving} style={{ padding: '0.75rem' }}>MechHelp</button>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              {paidTo === 'garage' ? '💡 Garage collected payment directly from the customer.' : '💡 Customer paid MechHelp directly.'}
            </p>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-light)' }}>
            <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={isSaving}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Billing Record'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
