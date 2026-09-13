import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Building2,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Plus,
  RefreshCw,
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

// ─── Types ───────────────────────────────────────────────────────────────────

type AddMode = 'choose' | 'salesiq' | 'custom';

interface TagLookupState {
  state: 'idle' | 'loading' | 'found' | 'not-found' | 'error';
  customerName?: string;
  carName?: string;
  message?: string;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

// Car entry card ──────────────────────────────────────────────────────────────

interface EntryCardProps {
  entry: DailyGarageEntry;
  onStatusChange: (id: string, status: DailyGarageEntryStatus) => void;
  onNotesChange: (id: string, notes: string) => void;
  onDelete: (id: string) => void;
}

const EntryCard: React.FC<EntryCardProps> = ({ entry, onStatusChange, onNotesChange, onDelete }) => {
  const [localNotes, setLocalNotes] = useState(entry.notes);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local notes in sync when entry updates externally (e.g. re-fetch)
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

  const handleConvertClick = () => {
    // Toggle: if already converted → revert to pending; else → converted
    const next: DailyGarageEntryStatus = entry.status === 'converted' ? 'pending' : 'converted';
    onStatusChange(entry.id, next);
  };

  const handleDelete = () => {
    if (window.confirm(`Remove "${entry.customerName} — ${entry.carName}" from the board?`)) {
      onDelete(entry.id);
    }
  };

  const statusLabel =
    entry.status === 'arrived' ? 'Arrived' :
    entry.status === 'converted' ? 'Converted' :
    'Pending';

  return (
    <div className={`dgb-entry-card status-${entry.status}`}>
      <div className="dgb-entry-card-body">
        <div className="dgb-entry-customer">{entry.customerName}</div>
        <div className="dgb-entry-car">{entry.carName}</div>
        <span className={`dgb-entry-status-badge badge-${entry.status}`}>
          {entry.status === 'arrived' && <Check size={8} strokeWidth={3} />}
          {entry.status === 'converted' && <Car size={8} strokeWidth={2.5} />}
          {statusLabel}
        </span>
        <textarea
          className="dgb-entry-notes"
          value={localNotes}
          onChange={handleNotesChange}
          placeholder="Add notes…"
          rows={2}
          aria-label={`Notes for ${entry.customerName}`}
        />
      </div>
      <div className="dgb-entry-actions">
        <button
          id={`dgb-arrived-${entry.id}`}
          className={`dgb-action-btn arrived-btn${entry.status === 'arrived' ? ' is-active' : ''}`}
          onClick={handleArrivedClick}
          title={entry.status === 'arrived' ? 'Unmark arrived' : 'Mark arrived'}
        >
          <Check size={10} strokeWidth={2.5} />
          Arrived
        </button>
        <button
          id={`dgb-convert-${entry.id}`}
          className={`dgb-action-btn convert-btn${entry.status === 'converted' ? ' is-active' : ''}`}
          onClick={handleConvertClick}
          title={entry.status === 'converted' ? 'Unmark converted' : 'Mark converted'}
        >
          <Car size={10} strokeWidth={2} />
          Convert
        </button>
        <button
          id={`dgb-delete-${entry.id}`}
          className="dgb-action-btn delete-btn"
          onClick={handleDelete}
          title="Remove entry"
          aria-label={`Delete entry for ${entry.customerName}`}
        >
          <Trash2 size={10} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
};

// Add-entry modal ─────────────────────────────────────────────────────────────

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
  const [mode, setMode] = useState<AddMode>('choose');
  const [tagInput, setTagInput] = useState('');
  const [tagLookup, setTagLookup] = useState<TagLookupState>({ state: 'idle' });
  const [customName, setCustomName] = useState('');
  const [customCar, setCustomCar] = useState('');
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
    setTagLookup({ state: 'loading' });
    try {
      const result = await DailyGarageBoardService.lookupByTag(tag);
      if (result) {
        setTagLookup({ state: 'found', customerName: result.customerName, carName: result.carName });
      } else {
        setTagLookup({ state: 'not-found', message: `No SalesIQ lead found for tag "${tag}".` });
      }
    } catch (err: any) {
      setTagLookup({ state: 'error', message: `Lookup failed: ${err?.message || 'Unknown error'}` });
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); handleTagLookup(); }
  };

  const handleSalesIQSubmit = async () => {
    if (tagLookup.state !== 'found' || !tagLookup.customerName) return;
    setSaving(true);
    try {
      const entry = await DailyGarageBoardService.addEntry({
        garageId,
        customerName: tagLookup.customerName,
        carName: tagLookup.carName || tagInput,
        notes: '',
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

  const handleCustomSubmit = async () => {
    if (!customName.trim() || !customCar.trim()) return;
    setSaving(true);
    try {
      const entry = await DailyGarageBoardService.addEntry({
        garageId,
        customerName: customName.trim(),
        carName: customCar.trim(),
        notes: '',
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

  const canSubmitSalesIQ = tagLookup.state === 'found';
  const canSubmitCustom = customName.trim().length > 0 && customCar.trim().length > 0;

  return (
    <div className="dgb-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="dgb-modal-title">
      <div className="dgb-modal">
        {/* Header */}
        <div className="dgb-modal-header">
          <h2 id="dgb-modal-title" className="dgb-modal-title">
            {mode === 'choose' ? 'Add Car' : mode === 'salesiq' ? 'Lookup by SalesIQ Tag' : 'Custom Entry'}
            <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
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
          {/* Step 1: choose mode */}
          {mode === 'choose' && (
            <div className="dgb-mode-chooser">
              <button
                id="dgb-mode-salesiq-btn"
                className="dgb-mode-btn"
                onClick={() => setMode('salesiq')}
              >
                <span className="dgb-mode-btn-icon"><Tag size={22} strokeWidth={1.5} /></span>
                SalesIQ Tag
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                  Auto-fill from lead
                </span>
              </button>
              <button
                id="dgb-mode-custom-btn"
                className="dgb-mode-btn"
                onClick={() => setMode('custom')}
              >
                <span className="dgb-mode-btn-icon"><Type size={22} strokeWidth={1.5} /></span>
                Custom
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                  Enter manually
                </span>
              </button>
            </div>
          )}

          {/* Step 2a: SalesIQ lookup */}
          {mode === 'salesiq' && (
            <div className="dgb-modal-form">
              <div className="dgb-form-group">
                <label htmlFor="dgb-tag-input" className="dgb-form-label">SalesIQ Tag</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    id="dgb-tag-input"
                    className="dgb-form-input"
                    type="text"
                    value={tagInput}
                    onChange={e => { setTagInput(e.target.value); setTagLookup({ state: 'idle' }); }}
                    onKeyDown={handleTagKeyDown}
                    placeholder="e.g. SIQ-1234"
                    autoFocus
                  />
                  <button
                    id="dgb-tag-lookup-btn"
                    className="dgb-btn-primary"
                    style={{ flex: 'none', padding: '0.6rem 0.875rem' }}
                    onClick={handleTagLookup}
                    disabled={!tagInput.trim() || tagLookup.state === 'loading'}
                  >
                    {tagLookup.state === 'loading' ? (
                      <RefreshCw size={14} className="spin" />
                    ) : (
                      'Lookup'
                    )}
                  </button>
                </div>
              </div>

              {/* Lookup result */}
              {tagLookup.state === 'found' && (
                <div className="dgb-tag-status found">
                  <Check size={14} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <strong>{tagLookup.customerName}</strong>
                    {tagLookup.carName && (
                      <div style={{ fontSize: '0.75rem', marginTop: '0.1rem' }}>{tagLookup.carName}</div>
                    )}
                  </div>
                </div>
              )}

              {(tagLookup.state === 'not-found' || tagLookup.state === 'error') && (
                <div className={`dgb-tag-status ${tagLookup.state === 'error' ? 'error' : 'not-found'}`}>
                  <X size={14} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div>{tagLookup.message}</div>
                    <button
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600,
                               fontSize: '0.75rem', color: 'inherit', padding: 0, marginTop: '0.35rem',
                               textDecoration: 'underline' }}
                      onClick={() => setMode('custom')}
                    >
                      Use Custom entry instead
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2b: Custom form */}
          {mode === 'custom' && (
            <div className="dgb-modal-form">
              <div className="dgb-form-group">
                <label htmlFor="dgb-custom-name" className="dgb-form-label">Customer Name</label>
                <input
                  id="dgb-custom-name"
                  className="dgb-form-input"
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  autoFocus
                />
              </div>
              <div className="dgb-form-group">
                <label htmlFor="dgb-custom-car" className="dgb-form-label">Car / Model</label>
                <input
                  id="dgb-custom-car"
                  className="dgb-form-input"
                  type="text"
                  value={customCar}
                  onChange={e => setCustomCar(e.target.value)}
                  placeholder="e.g. Maruti Swift"
                  onKeyDown={e => { if (e.key === 'Enter' && canSubmitCustom) handleCustomSubmit(); }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {mode !== 'choose' && (
          <div className="dgb-modal-footer">
            <button
              id="dgb-modal-back-btn"
              className="dgb-btn-secondary"
              onClick={() => {
                setMode('choose');
                setTagLookup({ state: 'idle' });
              }}
            >
              <ChevronLeft size={14} /> Back
            </button>

            {mode === 'salesiq' && (
              <button
                id="dgb-modal-salesiq-submit"
                className="dgb-btn-primary"
                onClick={handleSalesIQSubmit}
                disabled={!canSubmitSalesIQ || saving}
              >
                {saving ? <RefreshCw size={14} className="spin" /> : <Plus size={14} />}
                Add to Board
              </button>
            )}

            {mode === 'custom' && (
              <button
                id="dgb-modal-custom-submit"
                className="dgb-btn-primary"
                onClick={handleCustomSubmit}
                disabled={!canSubmitCustom || saving}
              >
                {saving ? <RefreshCw size={14} className="spin" /> : <Plus size={14} />}
                Add to Board
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Garage row ──────────────────────────────────────────────────────────────────

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
        <div className="dgb-garage-row-header">
          <span className="dgb-garage-icon"><Building2 size={14} strokeWidth={1.8} /></span>
          <h3 className="dgb-garage-name">{garageName}</h3>
          <span className="dgb-garage-count">{count} {count === 1 ? 'car' : 'cars'}</span>
        </div>
        <div className="dgb-cards-strip">
          {entries.length === 0 && (
            <span className="dgb-empty-row">No cars logged yet</span>
          )}
          {entries.map(entry => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onStatusChange={onStatusChange}
              onNotesChange={onNotesChange}
              onDelete={onDelete}
            />
          ))}
          <button
            id={`dgb-add-${garageId}`}
            className="dgb-add-btn"
            onClick={() => setShowModal(true)}
            title={`Add car to ${garageName}`}
          >
            <Plus size={18} strokeWidth={1.8} />
            <span>Add Car</span>
          </button>
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
            <ClipboardList size={20} strokeWidth={1.8} />
            Daily Garage Board
          </h1>
          <p className="dgb-header-subtitle">
            Track cars physically present at each garage · {formatDate(selectedDate)}
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
          margin: '1rem 2.5rem 0',
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
