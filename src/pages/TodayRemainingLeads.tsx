import React, { useState, useMemo } from 'react';
import { useLeadContext } from '../store/LeadContext';
import { AddLeadModal } from '../components/AddLeadModal';
import { Edit, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { DeleteConfirmAction } from '../components/DeleteConfirmAction';
import { isBefore, isToday, startOfToday } from 'date-fns';
import type { Lead } from '../types';

const parseDate = (dStr?: string): Date => {
  if (!dStr) return new Date(NaN);
  return new Date(dStr.includes('T') ? dStr : `${dStr}T00:00:00`);
};

export const TodayRemainingLeads: React.FC = () => {
  const { leads, deleteLead } = useLeadContext();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | undefined>(undefined);

  const today = startOfToday();

  const filteredData = useMemo(() => {
    // Filter strictly for Retarget stage + nextFollowUpDate = today's actual current date
    let data = leads.filter(l => 
      l.leadType === 'Retarget' && 
      isToday(parseDate(l.nextFollowUpDate))
    );

    // Apply priority filter if selected
    if (filterPriority) {
      data = data.filter(l => l.priority === filterPriority);
    }

    // Apply search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      data = data.filter(l => 
        l.customerName.toLowerCase().includes(lower) || 
        l.identifier.toLowerCase().includes(lower) ||
        l.carBrand.toLowerCase().includes(lower) ||
        l.carModel.toLowerCase().includes(lower) ||
        (l.priority || '').toLowerCase().includes(lower)
      );
    }

    // Sort by creation date descending
    return data.sort((a, b) => new Date(b.createdDate || 0).getTime() - new Date(a.createdDate || 0).getTime());
  }, [leads, filterPriority, searchTerm]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const currentData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setIsModalOpen(true);
  };

  return (
    <div className="all-leads animate-fade-in">
      <div className="dashboard-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1>Today's Remaining Leads</h1>
          <p>Retarget leads scheduled for follow-up today</p>
        </div>
      </div>

      <div className="filters surface-panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '300px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search by Name, Identifier, or Car..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>

          <select className="form-select" style={{ width: 'auto' }} value={filterPriority} onChange={e => { setFilterPriority(e.target.value); setCurrentPage(1); }}>
            <option value="">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
        
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Showing {filteredData.length} remaining leads
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name & Priority</th>
              <th>Identifier (Source)</th>
              <th>Car</th>
              <th>Stage</th>
              <th>Next Follow-Up</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map(lead => (
              <tr key={lead.id}>
                <td>
                  <strong>{lead.customerName || 'Unknown'}</strong>
                  {lead.isVip && <span className="badge badge-vip" style={{ marginLeft: '0.5rem' }}>VIP</span>}
                  <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                    {lead.priority === 'High' ? '🔴 High' : lead.priority === 'Low' ? '🟢 Low' : '🟡 Medium'}
                  </div>
                </td>
                <td>{lead.identifier} <br/><small className="text-muted">({lead.leadSource})</small></td>
                <td>{lead.carBrand} {lead.carModel}</td>
                <td><span className="badge badge-gray">{lead.leadType}</span></td>
                <td>
                  <span className={isBefore(new Date(lead.nextFollowUpDate), today) && !['Booked', 'Completed', 'Lost'].includes(lead.leadType) ? 'text-danger font-bold' : ''}>
                    {lead.nextFollowUpDate}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(lead)}>
                      <Edit size={14} /> Edit
                    </button>
                    <DeleteConfirmAction
                      size="sm"
                      onConfirm={() => deleteLead(lead.id)}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {currentData.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>No remaining retarget leads for today.</td></tr>
            )}
          </tbody>
        </table>
        
        {totalPages > 1 && (
          <div style={{ padding: '1rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Page {currentPage} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn btn-secondary btn-icon" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                className="btn btn-secondary btn-icon" 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
      
      {isModalOpen && (
        <AddLeadModal 
          isOpen={isModalOpen} 
          onClose={() => { setIsModalOpen(false); setSelectedLead(undefined); }} 
          initialData={selectedLead}
        />
      )}
    </div>
  );
};
