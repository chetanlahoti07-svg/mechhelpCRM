import React, { useState } from 'react';
import { useLeadContext } from '../store/LeadContext';
import { isToday, isBefore, startOfToday, differenceInDays } from 'date-fns';
import { AddLeadModal } from '../components/AddLeadModal';
import { CallOutcomeModal } from '../components/CallOutcomeModal';
import { Plus, Phone, Edit } from 'lucide-react';
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
  const [selectedEditLead, setSelectedEditLead] = useState<Lead | null>(null);
  const [bookingLead, setBookingLead] = useState<Lead | null>(null);

  const handleMarkContacted = (lead: Lead) => {
    setSelectedCallLead(lead);
  };

  const handleEdit = (lead: Lead) => {
    setSelectedEditLead(lead);
  };

  // Calculate highest priority lead
  const overdueLeads = priorityQueue.filter(l => isBefore(new Date(l.nextFollowUpDate), today));
  const todayLeads = priorityQueue.filter(l => isToday(new Date(l.nextFollowUpDate)));
  const nextToCall = overdueLeads.length > 0 ? overdueLeads[0] : (todayLeads.length > 0 ? todayLeads[0] : null);

  // VIP Cars data
  const vipCars = leads.filter(l => l.isVip && !['Completed', 'Lost'].includes(l.leadType));
  const vipActive = vipCars.filter(l => !['Booked', 'Completed', 'Lost'].includes(l.leadType));
  const vipBooked = vipCars.filter(l => l.leadType === 'Booked');
  const topVipCars = vipCars.slice(0, 4);

  return (
    <div className="dashboard animate-fade-in">
      <div className="dashboard-header">
        <h1>Dashboard / Call Queue</h1>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> New Lead
        </button>
      </div>

      {nextToCall && (
        <div className="priority-call-card surface-panel">
          <div className="priority-call-left">
            <div className="priority-call-badge">🔴 Priority Call</div>
            <h2 className="priority-call-name">{nextToCall.customerName || 'Unknown'}</h2>
            <div className="priority-call-details">
              <div className="priority-call-detail-item">
                <span className="detail-label">Phone</span>
                <span className="detail-value">{nextToCall.identifier}</span>
              </div>
              <div className="priority-call-detail-item">
                <span className="detail-label">Vehicle</span>
                <span className="detail-value">{nextToCall.carBrand} {nextToCall.carModel}</span>
              </div>
              <div className="priority-call-detail-item">
                <span className="detail-label">Priority</span>
                <span className={`detail-badge detail-badge-${nextToCall.priority?.toLowerCase()}`}>
                  {nextToCall.priority}
                </span>
              </div>
            </div>
          </div>
          <div className="priority-call-right">
            <button className="btn btn-primary btn-lg" onClick={() => handleMarkContacted(nextToCall)}>
              <Phone size={18} /> Mark Contacted
            </button>
          </div>
        </div>
      )}

      {vipCars.length > 0 && (
        <div className="vip-cars-card surface-panel">
          <div className="vip-cars-header">
            <h3>💎 VIP Cars</h3>
            <div className="vip-stats">
              <div className="stat-badge">
                <span className="stat-value">{vipCars.length}</span>
                <span className="stat-label">Total</span>
              </div>
              <div className="stat-badge">
                <span className="stat-value">{vipActive.length}</span>
                <span className="stat-label">Active</span>
              </div>
              <div className="stat-badge">
                <span className="stat-value">{vipBooked.length}</span>
                <span className="stat-label">Booked</span>
              </div>
            </div>
          </div>
          <div className="vip-cars-grid">
            {topVipCars.map(car => (
              <div key={car.id} className="vip-car-item">
                <div className="vip-car-name">{car.customerName}</div>
                <div className="vip-car-model">{car.carBrand} {car.carModel}</div>
                <div className="vip-car-stage">{car.leadType}</div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                    <button className="btn btn-secondary" onClick={() => handleEdit(lead)}>
                      <Edit size={16} /> Edit
                    </button>
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
        isOpen={isModalOpen || !!bookingLead || !!selectedEditLead} 
        onClose={() => { setIsModalOpen(false); setBookingLead(null); setSelectedEditLead(null); }} 
        initialData={selectedEditLead || bookingLead || undefined}
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
