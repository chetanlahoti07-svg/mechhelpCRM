import React, { useState } from 'react';
import { useLeadContext } from '../store/LeadContext';
import { isToday, isBefore, startOfToday, differenceInDays } from 'date-fns';
import { AddLeadModal } from '../components/AddLeadModal';
import { CallOutcomeModal } from '../components/CallOutcomeModal';
import { Plus, Phone } from 'lucide-react';
import type { Lead } from '../types';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
  const { leads } = useLeadContext();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const today = startOfToday();

  // Active leads (not booked/completed/lost)
  const activeLeads = leads.filter(l => !['Booked', 'Completed', 'Lost'].includes(l.leadType));

  const overdue = activeLeads.filter(l => isBefore(new Date(l.nextFollowUpDate), today))
    .sort((a, b) => new Date(a.nextFollowUpDate).getTime() - new Date(b.nextFollowUpDate).getTime());
    
  const dueToday = activeLeads.filter(l => isToday(new Date(l.nextFollowUpDate)));

  const vipTouchBase = activeLeads.filter(l => 
    l.isVip && 
    !isBefore(new Date(l.nextFollowUpDate), today) && 
    !isToday(new Date(l.nextFollowUpDate)) &&
    differenceInDays(today, new Date(l.lastContactedDate)) >= 30
  );

  const priorityQueue = [...overdue, ...dueToday, ...vipTouchBase];

  const [selectedCallLead, setSelectedCallLead] = useState<Lead | null>(null);
  const [bookingLead, setBookingLead] = useState<Lead | null>(null);

  const handleMarkContacted = (lead: Lead) => {
    setSelectedCallLead(lead);
  };

  return (
    <div className="dashboard animate-fade-in">
      <div className="dashboard-header">
        <h1>Dashboard / Call Queue</h1>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> New Lead
        </button>
      </div>

      <div className="queue-section">
        <h2 className="section-title">Ranked Call Queue</h2>
        {priorityQueue.length === 0 ? (
          <div className="empty-state surface-panel">
            <p>You're all caught up! No priority calls pending.</p>
          </div>
        ) : (
          <div className="queue-list">
            {priorityQueue.map(lead => {
              const isOverdue = isBefore(new Date(lead.nextFollowUpDate), today);
              const isVipTouch = differenceInDays(today, new Date(lead.lastContactedDate)) >= 30;

              return (
                <div key={lead.id} className={`queue-card surface-panel ${isOverdue ? 'border-danger' : ''}`}>
                  <div className="queue-card-left">
                    <div className="queue-card-header">
                      <h3>{lead.customerName || 'Unknown'}</h3>
                      <span className={`badge ${lead.isVip ? 'badge-vip' : 'badge-gray'}`}>
                        {lead.isVip ? 'VIP' : lead.leadSource}
                      </span>
                      {isOverdue && <span className="badge badge-red">Overdue</span>}
                      {isVipTouch && lead.isVip && <span className="badge badge-vip">30d Touchbase</span>}
                    </div>
                    <div className="queue-card-details">
                      <p><strong>Identifier:</strong> {lead.identifier}</p>
                      <p><strong>Car:</strong> {lead.carBrand} {lead.carModel}</p>
                      <p><strong>Stage:</strong> {lead.leadType}</p>
                    </div>
                  </div>
                  <div className="queue-card-actions">
                    <button className="btn btn-primary" onClick={() => handleMarkContacted(lead)}>
                      <Phone size={16} /> Mark Contacted
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AddLeadModal 
        isOpen={isModalOpen || !!bookingLead} 
        onClose={() => { setIsModalOpen(false); setBookingLead(null); }} 
        initialData={bookingLead || undefined}
      />
      {selectedCallLead && (
        <CallOutcomeModal
          isOpen={!!selectedCallLead}
          onClose={() => setSelectedCallLead(null)}
          lead={selectedCallLead}
          onBooked={(l) => setBookingLead(l)}
        />
      )}
    </div>
  );
};
