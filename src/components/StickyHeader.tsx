import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeadContext } from '../store/LeadContext';
import { useTheme } from '../store/ThemeContext';
import { CallOutcomeModal } from './CallOutcomeModal';
import { AddLeadModal } from './AddLeadModal';
import type { Lead } from '../types';
import { Phone, CheckCircle, BellRing, Calendar, Sun, Moon, Star, List, RotateCcw } from 'lucide-react';
import './StickyHeader.css';
import { isToday, isTomorrow, isBefore, startOfToday } from 'date-fns';

export const StickyHeader: React.FC = () => {
  const { leads, isLoading } = useLeadContext();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const today = startOfToday();

  const [selectedCallLead, setSelectedCallLead] = React.useState<Lead | null>(null);
  const [bookingLead, setBookingLead] = React.useState<Lead | null>(null);

  const handleMarkContacted = (id: string) => {
    const lead = leads.find(l => l.id === id);
    if (lead) {
      setSelectedCallLead(lead);
    }
  };

  // Logic
  const callsDueToday = leads.filter(l => 
    !['Booked', 'Completed', 'Lost'].includes(l.leadType) &&
    new Date(l.nextFollowUpDate) <= today
  ).length;

  const bookedLeads = leads.filter(l => l.leadType === 'Booked' && l.bookingDateTime);
  const bookingsToday = bookedLeads.filter(l => isToday(new Date(l.bookingDateTime!))).length;
  const bookingsTomorrow = bookedLeads.filter(l => isTomorrow(new Date(l.bookingDateTime!))).length;
  const totalBookings = bookedLeads.length;
  
  const garagesToNotify = bookedLeads.filter(l => isTomorrow(new Date(l.bookingDateTime!)) && !l.garageNotified).length;
  const vipCustomers = leads.filter(l => l.isVip).length;
  const rescheduledCustomers = leads.filter(l => (l.bookingHistory?.length || 0) > 0).length;
  const rescheduledToday = leads.filter(l => 
    l.bookingHistory?.some(h => isToday(new Date(h.rescheduledOn)))
  ).length;

  // Highest priority lead to call next
  const overdueLeads = leads
    .filter(l => !['Booked', 'Completed', 'Lost'].includes(l.leadType))
    .filter(l => isBefore(new Date(l.nextFollowUpDate), today))
    .sort((a, b) => new Date(a.nextFollowUpDate).getTime() - new Date(b.nextFollowUpDate).getTime());

  const todayLeads = leads
    .filter(l => !['Booked', 'Completed', 'Lost'].includes(l.leadType))
    .filter(l => isToday(new Date(l.nextFollowUpDate)));

  const nextToCall = overdueLeads.length > 0 ? overdueLeads[0] : (todayLeads.length > 0 ? todayLeads[0] : null);

  return (
    <header className="sticky-header surface-header">
      <div className="header-stats">
        <div className="stat-box clickable" onClick={() => navigate('/leads?filter=calls-due-today')}>
          <Phone size={18} className="text-accent" />
          <div className="stat-content">
            <span className="stat-label">Calls Due</span>
            <span className="stat-value">{isLoading ? '-' : callsDueToday}</span>
          </div>
        </div>
        
        <div className="stat-box clickable" onClick={() => navigate('/bookings?filter=today')}>
          <CheckCircle size={18} className="text-success" />
          <div className="stat-content">
            <span className="stat-label">Bookings Today</span>
            <span className="stat-value">{isLoading ? '-' : bookingsToday}</span>
          </div>
        </div>

        <div className="stat-box clickable" onClick={() => navigate('/bookings?filter=tomorrow')}>
          <Calendar size={18} className="text-warning" />
          <div className="stat-content">
            <span className="stat-label">Tomorrow</span>
            <span className="stat-value">{isLoading ? '-' : bookingsTomorrow}</span>
          </div>
        </div>

        <div className="stat-box clickable" onClick={() => navigate('/bookings?filter=unnotified')}>
          <BellRing size={18} className="text-danger" />
          <div className="stat-content">
            <span className="stat-label">Notify Garage</span>
            <span className="stat-value">{isLoading ? '-' : garagesToNotify}</span>
          </div>
        </div>

        <div className="stat-box clickable" onClick={() => navigate('/bookings?filter=rescheduled')}>
          <RotateCcw size={18} className="text-warning" />
          <div className="stat-content">
            <span className="stat-label">Rescheduled</span>
            <span className="stat-value">{isLoading ? '-' : rescheduledCustomers}</span>
            <span className="stat-subtext" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{rescheduledToday} today</span>
          </div>
        </div>

        <div className="stat-box clickable" onClick={() => navigate('/bookings?filter=all')}>
          <List size={18} className="text-primary" />
          <div className="stat-content">
            <span className="stat-label">Total Bookings</span>
            <span className="stat-value">{isLoading ? '-' : totalBookings}</span>
          </div>
        </div>

        <div className="stat-box clickable" onClick={() => navigate('/vip')}>
          <Star size={18} className="text-vip" />
          <div className="stat-content">
            <span className="stat-label">VIPs</span>
            <span className="stat-value">{isLoading ? '-' : vipCustomers}</span>
          </div>
        </div>
      </div>

      <div className="header-action">
        <button onClick={toggleTheme} className="btn-icon" style={{ marginRight: '1rem' }} aria-label="Toggle Theme">
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        {nextToCall ? (
          <div className="call-now-box">
            <div className="call-info">
              <span className="call-badge">Priority Call</span>
              <span className="call-name">{nextToCall.customerName || 'Unknown'} — {nextToCall.identifier}</span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => handleMarkContacted(nextToCall.id)}>Mark Contacted</button>
          </div>
        ) : (
          <div className="all-caught-up">All caught up on calls! 🎉</div>
        )}
      </div>
      {bookingLead && (
        <AddLeadModal 
          isOpen={!!bookingLead} 
          onClose={() => setBookingLead(null)} 
          initialData={bookingLead}
        />
      )}
      {selectedCallLead && (
        <CallOutcomeModal
          isOpen={!!selectedCallLead}
          onClose={() => setSelectedCallLead(null)}
          lead={selectedCallLead}
          onBooked={(l) => setBookingLead(l)}
        />
      )}
    </header>
  );
};
