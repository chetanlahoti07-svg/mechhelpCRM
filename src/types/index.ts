export type LeadSource = 'SalesIQ' | 'Direct Call' | 'Referral';
export type LeadType = 'Fresh Lead' | 'Call Not Received' | 'Details Shared' | 'Retarget' | 'Booked' | 'Completed' | 'Lost' | 'Redirected' | 'Rescheduled';
export type BookingType = 'Pickup' | 'Garage Visit';
export type Priority = 'High' | 'Medium' | 'Low';

export interface RescheduleHistoryEntry {
  previousDate: string;
  previousTime: string;
  previousGarage?: string;
  newDate: string;
  newTime: string;
  newGarage?: string;
  reason: string;
  remarks: string;
  rescheduledBy: string;
  rescheduledOn: string;
}

export interface CallActivity {
  id: string;
  timestamp: string;
  outcome: string;
  notes?: string;
}

export interface Lead {
  id: string;
  customerName: string;
  leadSource: LeadSource;
  identifier: string; // SalesIQ Tag OR Last 4 Digits
  carBrand: string;
  carModel: string;
  priority: Priority;
  leadType: LeadType;
  bookingType?: BookingType;
  garageAssigned?: string;
  bookingDateTime?: string;
  bookingHistory?: RescheduleHistoryEntry[];
  activityHistory?: CallActivity[];
  garageNotified: boolean;
  nextFollowUpDate: string;
  lastContactedDate: string;
  isVip: boolean;
  whatsappBroadcast: boolean;
  notes: string;
  createdDate: string;
}

export type SujalStatus = 'Pending' | 'Answered' | 'Call Not Received' | 'Booked' | 'Not Interested';

export interface SujalCallListItem {
  id: string;
  salesIqTag: string;
  priority: string;
  status: SujalStatus;
  linkedLeadId?: string;
  dateAdded: string;
}

export interface Garage {
  id: string;
  name: string;
}

export interface CarBrandModel {
  brand: string;
  models: string[];
}
