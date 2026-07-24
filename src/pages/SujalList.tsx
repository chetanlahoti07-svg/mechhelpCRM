import React, { useState } from 'react';

import { useLeadContext } from '../store/LeadContext';
import type { SujalCallListItem, SujalStatus } from '../types';
import { AddLeadModal } from '../components/AddLeadModal';
import { Plus, Phone, ClipboardEdit, X, Trash2 } from 'lucide-react';
import './SujalList.css';

export const SujalList: React.FC = () => {
  const { sujalList, addSujalItem, updateSujalItem, deleteSujalItem, isLoading } = useLeadContext();
  const [newTag, setNewTag] = useState('');
  const [newPriority, setNewPriority] = useState('Medium');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteErrorId, setDeleteErrorId] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItemForConversion, setSelectedItemForConversion] = useState<SujalCallListItem | null>(null);

  const [loggingItem, setLoggingItem] = useState<SujalCallListItem | null>(null);
  const [logStatus, setLogStatus] = useState<SujalStatus>('Pending');
  const [logNotes, setLogNotes] = useState('');

  const handleDelete = async (id: string) => {
    try {
      setDeleteErrorId(null);
      await deleteSujalItem(id);
      setDeleteConfirmId(null);
    } catch {
      setDeleteErrorId(id);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    
    addSujalItem({
      salesIqTag: newTag,
      priority: newPriority as any,
      status: 'Pending',
    });
    setNewTag('');
  };

  const handleOpenLogModal = (item: SujalCallListItem) => {
    setLoggingItem(item);
    setLogStatus(item.status);
    setLogNotes('');
  };

  const handleSaveLog = () => {
    if (!loggingItem) return;

    updateSujalItem({ 
      ...loggingItem, 
      status: logStatus,
      // In a real app we'd append notes to a history array
    });

    if (logStatus === 'Booked') {
      setSelectedItemForConversion(loggingItem);
      setIsModalOpen(true);
    }

    setLoggingItem(null);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const activeItems = sujalList.filter(item => 
    item.dateAdded.startsWith(todayStr) || 
    item.status === 'Call Not Received' || 
    item.status === 'Pending'
  );

  return (
    <div className="sujal-list animate-fade-in">
      <div className="dashboard-header" style={{ marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0 }}>Daily Call List</h1>
            <div className="daily-call-stat-card">
              <div className="stat-icon-box">
                <Phone size={16} className="text-accent" />
              </div>
              <div className="stat-content">
                <span className="stat-label">Calls in List</span>
                <span className="stat-value">{isLoading ? '-' : `${activeItems.length} ${activeItems.length === 1 ? 'call' : 'calls'}`}</span>
              </div>
            </div>
          </div>
          <p style={{ marginTop: '0.25rem' }}>Prioritized leads to contact today</p>
        </div>
      </div>

      <div className="add-item-form surface-panel">
        <form onSubmit={handleAdd}>
          <div className="form-group row-align" style={{ gap: '1rem', display: 'flex', alignItems: 'center', marginBottom: 0 }}>
            <input 
              type="text" 
              className="form-input" 
              style={{ flex: 2 }}
              placeholder="SalesIQ Tag (e.g. #4521) or Phone" 
              value={newTag} 
              onChange={e => setNewTag(e.target.value)} 
            />
            <select className="form-select" style={{ flex: 1 }} value={newPriority} onChange={e => setNewPriority(e.target.value)}>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
            <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
              <Plus size={18} style={{ marginRight: '0.5rem' }} /> Add to List
            </button>
          </div>
        </form>
      </div>

      <div className="table-container" style={{ marginTop: '2rem' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Identifier (Tag/Phone)</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Added On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeItems.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No calls on the list for today.</td></tr>
            )}
            {activeItems.map(item => (
              <tr key={item.id}>
                <td><strong>{item.salesIqTag}</strong></td>
                <td>
                  <span className={`badge ${item.priority === 'High' ? 'badge-red' : item.priority === 'Medium' ? 'badge-orange' : 'badge-blue'}`}>
                    {item.priority}
                  </span>
                </td>
                <td>
                  <span className={`badge badge-gray`}>{item.status}</span>
                </td>
                <td>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {new Date(item.dateAdded).toLocaleDateString()}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {deleteConfirmId === item.id ? (
                      <>
                        <span style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.75rem', marginRight: '0.5rem' }}>Are you sure?</span>
                        <button className="btn btn-secondary btn-sm" onClick={() => setDeleteConfirmId(null)}>
                          Cancel
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)}>
                          Confirm
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-outline-danger btn-sm" onClick={() => setDeleteConfirmId(item.id)}>
                          <Trash2 size={14} /> Delete
                        </button>
                        <a href={`tel:${item.salesIqTag}`} className="btn btn-secondary btn-sm" title="Call">
                          <Phone size={14} /> Call
                        </a>
                        <button className="btn btn-primary btn-sm" onClick={() => handleOpenLogModal(item)}>
                          <ClipboardEdit size={14} /> Log Call
                        </button>
                      </>
                    )}
                    {deleteErrorId === item.id && (
                      <span style={{ color: 'var(--danger)', fontSize: '0.75rem', position: 'absolute', marginTop: '2.5rem' }}>Failed to delete.</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loggingItem && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2>Log Call: {loggingItem.salesIqTag}</h2>
              <button onClick={() => setLoggingItem(null)} className="btn-icon"><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group mb-4">
                <label className="form-label">Call Outcome</label>
                <select 
                  className="form-select" 
                  value={logStatus}
                  onChange={e => setLogStatus(e.target.value as SujalStatus)}
                >
                  <option value="Pending">Pending</option>
                  <option value="Answered">Answered</option>
                  <option value="Call Not Received">Call Not Received</option>
                  <option value="Not Interested">Not Interested</option>
                  <option value="Booked">Booked</option>
                </select>
              </div>
              <div className="form-group mb-4">
                <label className="form-label">Notes</label>
                <textarea 
                  className="form-textarea" 
                  rows={3}
                  value={logNotes}
                  onChange={e => setLogNotes(e.target.value)}
                  placeholder="Enter call notes here..."
                ></textarea>
              </div>
              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setLoggingItem(null)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleSaveLog}>Save Log</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <AddLeadModal 
          isOpen={isModalOpen} 
          onClose={() => {
            setIsModalOpen(false);
            setSelectedItemForConversion(null);
          }} 
          initialData={{
            leadSource: 'SalesIQ',
            identifier: selectedItemForConversion?.salesIqTag,
            leadType: 'Booked'
          }}
        />
      )}
    </div>
  );
};
