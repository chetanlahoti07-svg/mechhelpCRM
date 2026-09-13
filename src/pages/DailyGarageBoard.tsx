import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Building2,
  Car,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import { DailyGarageBoardService, SettlementService } from '../utils/dataLayer';
import type { DailyGarageEntry, DailyGarageEntryStatus } from '../types';
import './DailyGarageBoard.css';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Returns today's date as a YYYY-MM-DD string in local time. */
function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Format YYYY-MM-DD for display, e.g. "Sun, 13 Sep 2026". */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Sub-components ─────────────────────────────────────────────────────────

// Car Entry Card ──────────────────────────────────────────────────────────────

interface EntryCardProps {
  entry: DailyGarageEntry;
  onStatusChange: (id: string, status: DailyGarageEntryStatus) => void;
  onNotesChange: (id: string, notes: string) => void;
  onDelete: (id: string) => void;
}

const EntryCard: React.FC<EntryCardProps> = ({ entry, onStatusChange, onNotesChange, onDelete }) => {
  const [localNotes, setLocalNotes] = useState(entry.notes);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalNotes(entry.notes);
  }, [entry.notes]);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalNotes(val);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      onNotesChange(entry.id, val);
    }, 600);
  };

  const handleArrivedClick = () => {
    // Toggle: if already arrived → revert to pending; else → arrived
    const next: DailyGarageEntryStatus = entry.status === 'arrived' ? 'pending' : 'arrived';
    onStatusChange(entry.id, next);
  };

  const handleDoneClick = () => {
    // Toggle: if already done → revert to pending; else → done
    const next: DailyGarageEntryStatus = entry.status === 'done' ? 'pending' : 'done';
    onStatusChange(entry.id, next);
  };

  const handleDelete = () => {
    if (window.confirm(`Remove "${entry.customerName} — ${entry.carName}" from the board?`)) {
      onDelete(entry.id);
    }
  };

  return (
    <div className={`dgb-entry-card status-${entry.status}`}>
      <div className="dgb-entry-card-body">
        <div className="dgb-entry-card-top">
          <div className="dgb-entry-customer">{entry.customerName}</div>
          <span className="dgb-source-tag">{entry.source === 'salesiq' ? 'SalesIQ' : 'Custom'}</span>
        </div>

        <div className="dgb-entry-car">{entry.carName}</div>

        {entry.numberPlate ? (
          <span className="dgb-number-plate-pill" title="Number Plate">
            <Car size={10} />
            {entry.numberPlate}
          </span>
        ) : (
          <span className="dgb-number-plate-none">No plate</span>
        )}

        {/* Status Badge */}
        {entry.status === 'arrived' && (
          <span className="dgb-entry-status-badge badge-arrived">
            <Check size={10} strokeWidth={3} /> Arrived
          </span>
        )}
        {entry.status === 'done' && (
          <span className="dgb-entry-status-badge badge-done">
            <CheckCircle2 size={10} strokeWidth={2.5} /> Serviced / Done
          </span>
        )}
        {entry.status === 'pending' && (
          <span className="dgb-entry-status-badge badge-pending">
            <Clock size={10} /> Pending
          </span>
        )}

        <textarea
          className="dgb-entry-notes"
          value={localNotes}
          onChange={handleNotesChange}
          placeholder="Add notes…"
          rows={2}
          aria-label={`Notes for ${entry.customerName}`}
        />
      </div>

      {/* Action Controls */}
      <div className="dgb-entry-actions">
        <button
          id={`dgb-arrived-${entry.id}`}
          className={`dgb-action-btn arrived-btn${entry.status === 'arrived' ? ' is-active' : ''}`}
          onClick={handleArrivedClick}
          title={entry.status === 'arrived' ? 'Unmark arrived' : 'Mark as Arrived'}
        >
          <Check size={12} strokeWidth={2.5} />
          Arrived
        </button>

        <button
          id={`dgb-done-${entry.id}`}
          className={`dgb-action-btn done-btn${entry.status === 'done' ? ' is-active' : ''}`}
          onClick={handleDoneClick}
          title={entry.status === 'done' ? 'Unmark serviced/done' : 'Mark as Serviced/Done'}
        >
          <CheckCircle2 size={12} strokeWidth={2.5} />
          Done
        </button>

        <button
          id={`dgb-delete-${entry.id}`}
          className="dgb-action-btn delete-btn"
          onClick={handleDelete}
          title="Remove entry"
          aria-label={`Delete entry for ${entry.customerName}`}
        >
          <Trash2 size={12} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
};

// Add Entry Modal ─────────────────────────────────────────────────────────────

interface AddEntryModalProps {
  garageId: string;
  garageName: string;
  date: string;
  onClose: () => void;
  onAdded: (entry: DailyGarageEntry) => void;
}

const AddEntryModal: React.FC<AddEntryModalProps> = ({
  garageId,
  garageName,
  date,
  onClose,
  onAdded,
}) => {
  const [tab, setTab] = useState<'salesiq' | 'custom'>('salesiq');

  // SalesIQ & Form States
  const [tagInput, setTagInput] = useState('');
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'found' | 'not-found' | 'error'>('idle');

  // Editable Form Fields
  const [customerName, setCustomerName] = useState('');
  const [carName, setCarName] = useState('');
  const [numberPlate, setNumberPlate] = useState('');
  const [leadId, setLeadId] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleTagLookup = async () => {
    const tag = tagInput.trim();
    if (!tag) return;
    setLookupState('loading');
    try {
      const result = await DailyGarageBoardService.lookupByTag(tag);
      if (result) {
        setLookupState('found');
        setCustomerName(result.customerName || '');
        setCarName(result.carName || '');
        setNumberPlate(result.numberPlate || '');
        setLeadId(result.leadId);
      } else {
        setLookupState('not-found');
      }
    } catch (err: any) {
      setLookupState('error');
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); handleTagLookup(); }
  };

  const handleSubmit = async () => {
    if (!customerName.trim() || !carName.trim()) return;
    setSaving(true);
    try {
      const entry = await DailyGarageBoardService.addEntry({
        garageId,
        customerName: customerName.trim(),
        carName: carName.trim(),
        numberPlate: numberPlate.trim() || undefined,
        source: tab,
        leadId: tab === 'salesiq' ? leadId : undefined,
        createdDate: date,
      });
      onAdded(entry);
      onClose();
    } catch (err: any) {
      alert(`Failed to add entry: ${err?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = customerName.trim().length > 0 && carName.trim().length > 0;

  return (
    <div className="dgb-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="dgb-modal-title">
      <div className="dgb-modal">
        {/* Header */}
        <div className="dgb-modal-header">
          <h2 id="dgb-modal-title" className="dgb-modal-title">
            Add Car to Garage
            <span style={{ fontSize: '0.78rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
              → {garageName}
            </span>
          </h2>
          <button
            id="dgb-modal-close-btn"
            className="dgb-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="dgb-modal-body">
          {/* Tabs */}
          <div className="dgb-modal-tabs">
            <button
              id="dgb-tab-salesiq"
              className={`dgb-tab-btn ${tab === 'salesiq' ? 'is-active' : ''}`}
              onClick={() => {
                setTab('salesiq');
                setLookupState('idle');
              }}
            >
              <Tag size={14} /> SalesIQ Tag
            </button>
            <button
              id="dgb-tab-custom"
              className={`dgb-tab-btn ${tab === 'custom' ? 'is-active' : ''}`}
              onClick={() => {
                setTab('custom');
                setCustomerName('');
                setCarName('');
                setNumberPlate('');
              }}
            >
              <Type size={14} /> Custom Entry
            </button>
          </div>

          {/* SalesIQ Mode */}
          {tab === 'salesiq' && (
            <div className="dgb-modal-form">
              <div className="dgb-form-group">
                <label htmlFor="dgb-tag-input" className="dgb-form-label">SalesIQ Tag / Identifier</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    id="dgb-tag-input"
                    className="dgb-form-input"
                    type="text"
                    value={tagInput}
                    onChange={e => {
                      setTagInput(e.target.value);
                      setLookupState('idle');
                    }}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Enter SalesIQ tag (e.g. SIQ-1234)"
                    autoFocus
                  />
                  <button
                    id="dgb-tag-lookup-btn"
                    className="dgb-btn-primary"
                    style={{ flex: 'none', padding: '0.6rem 0.875rem' }}
                    onClick={handleTagLookup}
                    disabled={!tagInput.trim() || lookupState === 'loading'}
                  >
                    {lookupState === 'loading' ? (
                      <RefreshCw size={14} className="spin" />
                    ) : (
                      <Search size={14} />
                    )}
                    Lookup
                  </button>
                </div>
              </div>

              {/* Lookup Found State */}
              {lookupState === 'found' && (
                <>
                  <div className="dgb-tag-status found">
                    <Check size={16} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <strong>Lead Found & Auto-Filled!</strong>
                      <div style={{ fontSize: '0.75rem', marginTop: '0.15rem' }}>
                        Review or edit the three fields below before adding to board.
                      </div>
                    </div>
                  </div>

                  <div className="dgb-form-group">
                    <label htmlFor="dgb-siq-customer" className="dgb-form-label">Customer Name</label>
                    <input
                      id="dgb-siq-customer"
                      className="dgb-form-input"
                      type="text"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                    />
                  </div>

                  <div className="dgb-form-group">
                    <label htmlFor="dgb-siq-car" className="dgb-form-label">Car / Model</label>
                    <input
                      id="dgb-siq-car"
                      className="dgb-form-input"
                      type="text"
                      value={carName}
                      onChange={e => setCarName(e.target.value)}
                    />
                  </div>

                  <div className="dgb-form-group">
                    <label htmlFor="dgb-siq-plate" className="dgb-form-label">Number Plate</label>
                    <input
                      id="dgb-siq-plate"
                      className="dgb-form-input"
                      type="text"
                      value={numberPlate}
                      onChange={e => setNumberPlate(e.target.value)}
                      placeholder="e.g. MH 02 AB 1234"
                    />
                  </div>
                </>
              )}

              {/* Lookup Not Found State */}
              {(lookupState === 'not-found' || lookupState === 'error') && (
                <div className="dgb-tag-status not-found">
                  <X size={16} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong>No lead found for tag "{tagInput.trim()}"</strong>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.15rem' }}>
                      Please check the SalesIQ Tag or switch to Custom Entry to enter car details manually.
                    </div>
                    <button
                      id="dgb-switch-custom-link"
                      className="dgb-switch-custom-btn"
                      onClick={() => setTab('custom')}
                    >
                      Switch to Custom Entry →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Custom Mode */}
          {tab === 'custom' && (
            <div className="dgb-modal-form">
              <div className="dgb-form-group">
                <label htmlFor="dgb-custom-name" className="dgb-form-label">Customer Name *</label>
                <input
                  id="dgb-custom-name"
                  className="dgb-form-input"
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  autoFocus
                />
              </div>

              <div className="dgb-form-group">
                <label htmlFor="dgb-custom-car" className="dgb-form-label">Car / Model *</label>
                <input
                  id="dgb-custom-car"
                  className="dgb-form-input"
                  type="text"
                  value={carName}
                  onChange={e => setCarName(e.target.value)}
                  placeholder="e.g. Maruti Swift"
                />
              </div>

              <div className="dgb-form-group">
                <label htmlFor="dgb-custom-plate" className="dgb-form-label">Number Plate</label>
                <input
                  id="dgb-custom-plate"
                  className="dgb-form-input"
                  type="text"
                  value={numberPlate}
                  onChange={e => setNumberPlate(e.target.value)}
                  placeholder="e.g. MH 02 AB 1234 (optional)"
                  onKeyDown={e => { if (e.key === 'Enter' && canSubmit) handleSubmit(); }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="dgb-modal-footer">
          <button
            id="dgb-modal-cancel-btn"
            className="dgb-btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            id="dgb-modal-submit-btn"
            className="dgb-btn-primary"
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
          >
            {saving ? <RefreshCw size={14} className="spin" /> : <Plus size={14} />}
            Add to Board
          </button>
        </div>
      </div>
    </div>
  );
};

// Garage Row Section ─────────────────────────────────────────────────────────

interface GarageRowProps {
  garageId: string;
  garageName: string;
  entries: DailyGarageEntry[];
  date: string;
  onStatusChange: (id: string, status: DailyGarageEntryStatus) => void;
  onNotesChange: (id: string, notes: string) => void;
  onDelete: (id: string) => void;
  onEntryAdded: (entry: DailyGarageEntry) => void;
}

const GarageRow: React.FC<GarageRowProps> = ({
  garageId,
  garageName,
  entries,
  date,
  onStatusChange,
  onNotesChange,
  onDelete,
  onEntryAdded,
}) => {
  const [showModal, setShowModal] = useState(false);
  const count = entries.length;

  return (
    <>
      <div className="dgb-garage-row">
        {/* Header bar */}
        <div className="dgb-garage-row-header">
          <div className="dgb-garage-header-left">
            <span className="dgb-garage-icon"><Building2 size={16} strokeWidth={2} /></span>
            <h3 className="dgb-garage-name">{garageName}</h3>
          </div>

          <div className="dgb-garage-header-right">
            <button
              id={`dgb-create-${garageId}`}
              className="dgb-create-btn"
              onClick={() => setShowModal(true)}
              title={`Add car to ${garageName}`}
            >
              <Plus size={14} strokeWidth={2.5} />
              Add Car
            </button>
            <span id={`dgb-count-${garageId}`} className="dgb-garage-count">
              {count} {count === 1 ? 'car' : 'cars'}
            </span>
          </div>
        </div>

        {/* Expanded Content Strip */}
        <div className="dgb-cards-strip">
          {entries.length === 0 ? (
            <div className="dgb-empty-row">
              <span>No cars assigned for this garage on this date.</span>
              <button
                className="dgb-empty-add-btn"
                onClick={() => setShowModal(true)}
              >
                + Add Car
              </button>
            </div>
          ) : (
            entries.map(entry => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onStatusChange={onStatusChange}
                onNotesChange={onNotesChange}
                onDelete={onDelete}
              />
            ))
          )}

          {/* Additional dashed Add Button card at end of list */}
          {entries.length > 0 && (
            <button
              id={`dgb-add-card-${garageId}`}
              className="dgb-add-btn"
              onClick={() => setShowModal(true)}
              title={`Add car to ${garageName}`}
            >
              <Plus size={20} strokeWidth={2} />
              <span>Add Car</span>
            </button>
          )}
        </div>
      </div>

      {showModal && (
        <AddEntryModal
          garageId={garageId}
          garageName={garageName}
          date={date}
          onClose={() => setShowModal(false)}
          onAdded={entry => {
            onEntryAdded(entry);
            setShowModal(false);
          }}
        />
      )}
    </>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────

export const DailyGarageBoard: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(todayString());
  const [garages, setGarages] = useState<{ id: string; name: string }[]>([]);
  const [entries, setEntries] = useState<DailyGarageEntry[]>([]);
  const [loadingGarages, setLoadingGarages] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isToday = selectedDate === todayString();

  // Load garages once on mount
  useEffect(() => {
    SettlementService.getGarageList()
      .then(list => setGarages(list))
      .catch(err => setError(`Failed to load garages: ${err?.message}`))
      .finally(() => setLoadingGarages(false));
  }, []);

  // Reload entries whenever date changes
  const loadEntries = useCallback(async (date: string) => {
    setLoadingEntries(true);
    setError(null);
    try {
      const data = await DailyGarageBoardService.getEntries(date);
      setEntries(data);
    } catch (err: any) {
      setError(`Failed to load entries: ${err?.message}`);
    } finally {
      setLoadingEntries(false);
    }
  }, []);

  useEffect(() => {
    loadEntries(selectedDate);
  }, [selectedDate, loadEntries]);

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleStatusChange = async (id: string, status: DailyGarageEntryStatus) => {
    // Optimistic update
    setEntries(prev => prev.map(e => e.id === id ? { ...e, status } : e));
    try {
      await DailyGarageBoardService.updateEntry(id, { status });
    } catch (err: any) {
      alert(`Failed to update status: ${err?.message}`);
      // Revert on error
      loadEntries(selectedDate);
    }
  };

  const handleNotesChange = async (id: string, notes: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, notes } : e));
    try {
      await DailyGarageBoardService.updateEntry(id, { notes });
    } catch (err: any) {
      console.error('Failed to save notes:', err);
    }
  };

  const handleDelete = async (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    try {
      await DailyGarageBoardService.deleteEntry(id);
    } catch (err: any) {
      alert(`Failed to delete entry: ${err?.message}`);
      loadEntries(selectedDate);
    }
  };

  const handleEntryAdded = (entry: DailyGarageEntry) => {
    setEntries(prev => [...prev, entry]);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const goToPrev = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const goToNext = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  const isLoading = loadingGarages || loadingEntries;

  return (
    <div className="dgb-page">
      {/* ─ Header ─────────────────────────────────────────────────────────── */}
      <div className="dgb-header">
        <div className="dgb-header-left">
          <h1 className="dgb-header-title">
            <ClipboardList size={22} strokeWidth={2} />
            Daily Garage Board
          </h1>
          <p className="dgb-header-subtitle">
            Track cars assigned for pickup & visit at each garage · {formatDate(selectedDate)}
          </p>
        </div>

        <div className="dgb-header-right">
          <button
            id="dgb-prev-day-btn"
            className="dgb-today-btn"
            onClick={goToPrev}
            aria-label="Previous day"
            title="Previous day"
          >
            <ChevronLeft size={14} />
          </button>

          <input
            id="dgb-date-picker"
            type="date"
            className="dgb-date-input"
            value={selectedDate}
            onChange={handleDateChange}
            aria-label="Select date"
          />

          <button
            id="dgb-next-day-btn"
            className="dgb-today-btn"
            onClick={goToNext}
            aria-label="Next day"
            title="Next day"
          >
            <ChevronRight size={14} />
          </button>

          {!isToday && (
            <button
              id="dgb-today-jump-btn"
              className="dgb-today-btn"
              onClick={() => setSelectedDate(todayString())}
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* ─ Body ───────────────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          margin: '1rem 2rem 0',
          padding: '0.75rem 1rem',
          background: 'var(--danger-bg)',
          color: 'var(--danger)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.85rem',
          fontWeight: 500,
        }}>
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="dgb-loading">
          {[1, 2, 3, 4].map(i => <div key={i} className="dgb-skeleton-row" />)}
        </div>
      ) : garages.length === 0 ? (
        <div className="dgb-empty-state">
          <Building2 size={48} strokeWidth={1} />
          <h3>No garages found</h3>
          <p>Add garages in the Garage Settlement section first.</p>
        </div>
      ) : (
        <div className="dgb-body">
          {garages.map(garage => (
            <GarageRow
              key={garage.id}
              garageId={garage.id}
              garageName={garage.name}
              entries={entries.filter(e => e.garageId === garage.id)}
              date={selectedDate}
              onStatusChange={handleStatusChange}
              onNotesChange={handleNotesChange}
              onDelete={handleDelete}
              onEntryAdded={handleEntryAdded}
            />
          ))}
        </div>
      )}
    </div>
  );
};
