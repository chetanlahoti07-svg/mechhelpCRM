import React from 'react';
import type { Lead } from '../types';
import { X } from 'lucide-react';
import { BookingTimeline } from './BookingTimeline';

interface TimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
}

export const TimelineModal: React.FC<TimelineModalProps> = ({ isOpen, onClose, lead }) => {
  if (!isOpen || !lead) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content slide-in" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>Booking Timeline</h2>
          <button onClick={onClose} className="btn-icon"><X size={20} /></button>
        </div>
        <div className="modal-body max-h-[70vh] overflow-y-auto custom-scrollbar">
          <BookingTimeline lead={lead} />
        </div>
      </div>
    </div>
  );
};
