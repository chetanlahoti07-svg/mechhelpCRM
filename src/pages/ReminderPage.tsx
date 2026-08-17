import React, { useState, useMemo } from 'react';
import { useLeadContext } from '../store/LeadContext';
import { AddLeadModal } from '../components/AddLeadModal';
import { Edit, Search, Sun, Moon } from 'lucide-react';
import { DeleteConfirmAction } from '../components/DeleteConfirmAction';
import { isBefore, isToday, startOfToday } from 'date-fns';
import type { Lead } from '../types';

const parseDate = (dStr?: string): Date => {
  if (!dStr) return new Date(NaN);
  return new Date(dStr.includes('T') ? dStr : `${dStr}T00:00:00`);
};

interface Props {
  slot: 'morning' | 'evening';
}

export const ReminderPage: React.FC<Props> = ({ slot }) => {
  const { leads, deleteLead } = useLeadContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | undefined>(undefined);

  const today = startOfToday();

  const sectionLeads = useMemo(() => {
    let data = leads.filter(l => {
      if (l.leadType !== 'Retarget') return false;
      if (!isToday(parseDate(l.nextFollowUpDate))) return false;
      if (slot === 'morning') return l.retargetTimeSlot === 'morning';
      // Legacy leads with no time slot (null/undefined) default to Evening
      if (slot === 'evening') return l.retargetTimeSlot === 'evening' || !l.retargetTimeSlot;
      return false;
    });

    if (filterPriority) {
      data = data.filter(l => l.priority === filterPriority);
    }

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

    return data.sort((a, b) => new Date(b.createdDate || 0).getTime() - new Date(a.createdDate || 0).getTime());
  }, [leads, filterPriority, searchTerm, slot]);

  const handleEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setIsModalOpen(true);
  };

  const isMorning = slot === 'morning';
  const title = isMorning ? "Today's Reminder: Morning" : "Today's Reminder: Evening";
  const subtitle = isMorning
    ? 'Retarget callbacks preferred during morning hours'
    : 'Retarget callbacks preferred during evening hours';
  const Icon = isMorning ? Sun : Moon;
  const iconClass = isMorning ? 'text-warning' : 'text-primary';

  return (
    <div className="all-leads animate-fade-in">
      <div className="dashboard-header" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Icon size={28} className={iconClass} />
          <div>
            <h1 style={{ margin: 0 }}>{title}</h1>
            <p style={{ margin: 0, marginTop: '0.25rem' }}>{subtitle}</p>
          </div>
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
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>

          <select className="form-select" style={{ width: 'auto' }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          {sectionLeads.length} {sectionLeads.length === 1 ? 'lead' : 'leads'} for today
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name & Priority</th>
              <th>Identifier (Source)</th>
              <th>Car</th>
              <th>Stage / Slot</th>
              <th>Next Follow-Up</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sectionLeads.map(lead => (
              <tr key={lead.id}>
                <td>
                  <strong>{lead.customerName || 'Unknown'}</strong>
                  {lead.isVip && <span className="badge badge-vip" style={{ marginLeft: '0.5rem' }}>VIP</span>}
                  <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                    {lead.priority === 'High' ? '🔴 High' : lead.priority === 'Low' ? '🟢 Low' : '🟡 Medium'}
                  </div>
                </td>
                <td>{lead.identifier} <br /><small className="text-muted">({lead.leadSource})</small></td>
                <td>{lead.carBrand} {lead.carModel}</td>
                <td>
                  <span className="badge badge-gray" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    {lead.retargetTimeSlot === 'morning' ? '☀️ Morning' : lead.retargetTimeSlot === 'evening' ? '🌙 Evening' : lead.leadType}
                  </span>
                </td>
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
            {sectionLeads.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                  No {isMorning ? 'morning' : 'evening'} reminders for today.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
