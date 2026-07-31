/** Minimal lead shape used to build a Daily Quicks summary (shared by UI + cron). */
export interface DailyQuicksLeadInput {
  customerName: string;
  identifier: string;
  leadType: string;
  bookingDateTime?: string;
  nextFollowUpDate: string;
  garageNotified: boolean;
  isVip: boolean;
  bookingHistory?: unknown[];
}

export interface DailyQuicksEntry {
  customerName: string;
  identifier: string;
}

export interface DailyQuicksStats {
  totalLeads: number;
  callsDueToday: number;
  totalBookings: number;
  todaysBookings: number;
  tomorrowsBookings: number;
  garageNotifications: number;
  rescheduledBookings: number;
  vipCustomers: number;
}

export interface DailyQuicksSections {
  todaysCalls: DailyQuicksEntry[];
  todaysBookings: DailyQuicksEntry[];
  tomorrowsBookings: DailyQuicksEntry[];
  rescheduledBookings: DailyQuicksEntry[];
  garageNotifications: DailyQuicksEntry[];
  vipCustomers: DailyQuicksEntry[];
}

export interface DailyQuicksSummary {
  date: string;
  stats: DailyQuicksStats;
  sections: DailyQuicksSections;
}

export interface StoredDailySummary {
  id: string;
  date: string;
  summary: DailyQuicksSummary;
  generatedAt: string;
}
