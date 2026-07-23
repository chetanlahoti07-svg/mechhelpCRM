import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLeadContext } from '../store/LeadContext';
import { isToday, isTomorrow } from 'date-fns';
import { Search, ChevronLeft, ChevronRight, CalendarClock, History } from 'lucide-react';
import { RescheduleModal } from '../components/RescheduleModal';
import { TimelineModal } from '../components/TimelineModal';
import type { Lead } from '../types';

export const Bookings: React.FC = () => {
  const { leads, updateLead } = useLeadContext();
  const [searchParams] = useSearchParams();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals state
  const [rescheduleLead, setRescheduleLead] = useState<Lead | null>(null);
  const [timelineLead, setTimelineLead] = useState<Lead | null>(null);

  useEffect(() => {
    const urlFilter = searchParams.get('filter');
    if (urlFilter) setFilter(urlFilter);
  }, [searchParams]);

  // Include any lead that has a bookingDateTime (Booked, Completed, Lost/Cancelled)
  const allBookings = leads.filter(l => l.bookingDateTime);

  const filteredData = useMemo(() => {
    let data = allBookings;

    // Apply specific filter
    if (filter === 'today') {
      data = data.filter(l => l.leadType === 'Booked' && isToday(new Date(l.bookingDateTime!)));
    } else if (filter === 'tomorrow') {
      data = data.filter(l => l.leadType === 'Booked' && isTomorrow(new Date(l.bookingDateTime!)));
    } else if (filter === 'unnotified') {
      data = data.filter(l => l.leadType === 'Booked' && isTomorrow(new Date(l.bookingDateTime!)) && !l.garageNotified);
    } else if (filter === 'rescheduled') {
      data = data.filter(l => (l.bookingHistory?.length || 0) > 0);
    } else if (filter === 'completed') {
      data = data.filter(l => l.leadType === 'Completed');
    } else if (filter === 'cancelled') {
      data = data.filter(l => l.leadType === 'Lost');
    } else if (filter === 'all') {
      // By default, maybe only show active bookings unless specifically searching
      data = data.filter(l => l.leadType === 'Booked');
    }

    // Apply search across multiple fields
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      data = data.filter(l => 
        l.customerName.toLowerCase().includes(lowerSearch) ||
        l.carBrand.toLowerCase().includes(lowerSearch) ||
        l.carModel.toLowerCase().includes(lowerSearch) ||
        l.identifier.toLowerCase().includes(lowerSearch) ||
        (l.garageAssigned && l.garageAssigned.toLowerCase().includes(lowerSearch))
      );
    }

    // Sort by booking date time ascending
    return data.sort((a, b) => new Date(a.bookingDateTime!).getTime() - new Date(b.bookingDateTime!).getTime());
  }, [allBookings, filter, searchTerm]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const currentData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleMarkNotified = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) updateLead({ ...lead, garageNotified: true });
  };

  const handleSaveReschedule = async (updatedLead: Lead) => {
    await updateLead(updatedLead);
    alert('Booking rescheduled successfully!');
  };

  return (
    <div className="bookings animate-fade-in">
      <div className="dashboard-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1>Bookings Hub</h1>
          <p>Manage, track, and reschedule all vehicle bookings</p>
        </div>
      </div>
      
      <div className="filters surface-panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '300px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search customer, phone, car, or garage..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          
          <select 
            className="form-select" 
            style={{ width: 'auto' }}
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="all">Active Bookings</option>
            <option value="today">Today's Bookings</option>
            <option value="tomorrow">Tomorrow's Bookings</option>
            <option value="rescheduled">Rescheduled Bookings</option>
            <option value="completed">Completed Bookings</option>
            <option value="cancelled">Cancelled Bookings</option>
            <option value="unnotified">Needs Garage Notification</option>
          </select>
        </div>
        
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Showing {filteredData.length} records
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Vehicle / Garage</th>
              <th>Current Booking</th>
              <th>History</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentData.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No bookings match your criteria.</td></tr>
            ) : (
              currentData.map(lead => {
                const rescheduleCount = lead.bookingHistory?.length || 0;
                const isConfirmed = lead.leadType === 'Booked';
                
                return (
                  <tr key={lead.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <strong>{lead.customerName}</strong>
                        {lead.isVip && <span className="badge badge-vip text-[10px] px-1 py-0">VIP</span>}
                      </div>
                      <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                        {lead.priority === 'High' ? '🔴 High' : lead.priority === 'Low' ? '🟢 Low' : '🟡 Medium'}
                      </div>
                      <small className="text-gray-400">{lead.identifier}</small>
                    </td>
                    <td>
                      <div className="text-sm font-medium">{lead.carBrand} {lead.carModel}</div>
                      <div className="text-xs text-gray-400">{lead.garageAssigned || 'No Garage'}</div>
                    </td>
                    <td>
                      <div className="text-sm font-medium">
                        {new Date(lead.bookingDateTime!).toLocaleDateString('en-GB')}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(lead.bookingDateTime!).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </td>
                    <td>
                      {rescheduleCount > 0 ? (
                        <div className="flex flex-col items-start">
                          <span className="badge badge-warning mb-1 flex items-center gap-1 text-[10px]">
                            <History size={10} /> Rescheduled ({rescheduleCount})
                          </span>
                          <button 
                            className="text-xs text-accent hover:underline flex items-center"
                            onClick={() => setTimelineLead(lead)}
                          >
                            View Timeline
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">-</span>
                      )}
                    </td>
                    <td>
                      {lead.leadType === 'Booked' ? (
                        <span className="badge badge-blue mb-1">Confirmed</span>
                      ) : lead.leadType === 'Completed' ? (
                        <span className="badge badge-green mb-1">Completed</span>
                      ) : (
                        <span className="badge badge-red mb-1">Cancelled</span>
                      )}
                      
                      {!lead.garageNotified && isConfirmed && (
                        <div className="mt-1">
                          <span className="badge badge-red text-[10px]">Garage Not Notified</span>
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-col gap-2">
                        {isConfirmed && (
                          <button 
                            className="btn btn-secondary btn-sm flex items-center justify-center gap-1"
                            onClick={() => setRescheduleLead(lead)}
                          >
                            <CalendarClock size={14} /> Reschedule
                          </button>
                        )}
                        {!lead.garageNotified && isConfirmed && (
                          <button 
                            className="btn btn-primary btn-sm" 
                            onClick={() => handleMarkNotified(lead.id)}
                          >
                            Mark Notified
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
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

      <RescheduleModal 
        isOpen={!!rescheduleLead} 
        onClose={() => setRescheduleLead(null)} 
        lead={rescheduleLead} 
        onSave={handleSaveReschedule} 
      />
      
      <TimelineModal
        isOpen={!!timelineLead}
        onClose={() => setTimelineLead(null)}
        lead={timelineLead}
      />
    </div>
  );
};
