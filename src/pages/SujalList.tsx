import React, { useState, useEffect } from 'react';

import { useLeadContext } from '../store/LeadContext';
import type { SujalCallListItem, SujalStatus } from '../types';
import { AddLeadModal } from '../components/AddLeadModal';
import { Plus, Phone, ClipboardEdit } from 'lucide-react';
import { DeleteConfirmAction } from '../components/DeleteConfirmAction';
import './SujalList.css';

export const SujalList: React.FC = () => {
  const { sujalList, addSujalItem, updateSujalItem, deleteSujalItem, isLoading } = useLeadContext();
  const [newTag, setNewTag] = useState('');
  const [newPriority, setNewPriority] = useState('Medium');
  const [deleteErrorId, setDeleteErrorId] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItemForConversion, setSelectedItemForConversion] = useState<SujalCallListItem | null>(null);

  const [openLogCallRowId, setOpenLogCallRowId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => {
      setOpenLogCallRowId(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleDelete = async (id: string) => {
    try {
      setDeleteErrorId(null);
      await deleteSujalItem(id);
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

  const handleSelectOutcome = (item: SujalCallListItem, status: SujalStatus) => {
    updateSujalItem({ 
      ...item, 
      status,
    });

    // TODO: verify Bookings counters refresh after status change
    if (status === 'Booked') {
      setSelectedItemForConversion(item);
      setIsModalOpen(true);
    }

    setOpenLogCallRowId(null);
  };

  const getStatusBadgeClass = (status: SujalStatus) => {
    switch (status) {
      case 'Call Not Received':
        return 'badge-red';
      case 'Details Shared':
        return 'badge-blue';
      case 'Retargeted':
        return 'badge-orange';
      case 'Booked':
        return 'badge-green';
      case 'Completed':
        return 'badge-teal';
      case 'Lost':
        return 'badge-red';
      default:
        return 'badge-gray';
    }
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
            <h1 style={{ margin: 0 }}>Pending Call List</h1>
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
                  <span className={`badge ${getStatusBadgeClass(item.status)}`}>{item.status}</span>
                </td>
                <td>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {new Date(item.dateAdded).toLocaleDateString()}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <DeleteConfirmAction
                      size="sm"
                      onConfirm={() => handleDelete(item.id)}
                    />
                    <a href={`tel:${item.salesIqTag}`} className="btn btn-secondary btn-sm" title="Call">
                      <Phone size={14} /> Call
                    </a>
                    {openLogCallRowId === item.id ? (
                      <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                        <select
                          className="form-select btn-sm"
                          style={{ 
                            height: '32px', 
                            padding: '0 0.5rem', 
                            fontSize: '0.875rem',
                            borderRadius: '6px',
                            borderColor: 'var(--border-color)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer'
                          }}
                          value=""
                          autoFocus
                          onChange={(e) => {
                            const selectedOutcome = e.target.value as SujalStatus;
                            if (selectedOutcome) {
                              handleSelectOutcome(item, selectedOutcome);
                            }
                          }}
                        >
                          <option value="" disabled>Select Outcome...</option>
                          <option value="Call Not Received">Call Not Received</option>
                          <option value="Details Shared">Details Shared</option>
                          <option value="Retargeted">Retargeted</option>
                          <option value="Booked">Booked</option>
                          <option value="Completed">Completed</option>
                          <option value="Lost">Lost</option>
                        </select>
                      </div>
                    ) : (
                      <button 
                        className="btn btn-primary btn-sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenLogCallRowId(prev => prev === item.id ? null : item.id);
                        }}
                      >
                        <ClipboardEdit size={14} /> Log Call
                      </button>
                    )}
                  </div>
                  {deleteErrorId === item.id && (
                    <span style={{ color: 'var(--danger)', fontSize: '0.75rem', position: 'absolute', marginTop: '2.5rem' }}>Failed to delete.</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
