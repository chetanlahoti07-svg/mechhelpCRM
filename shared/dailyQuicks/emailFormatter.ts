import type { DailyQuicksSummary } from './types';
import { formatISTDisplayDate } from './istDate';

function formatSection(title: string, rows: { customerName: string; identifier: string }[]): string {
  const lines = rows.length
    ? rows.map((r) => `${r.customerName} | ${r.identifier}`).join('\n')
    : 'None';
  return `${title}\n\n${lines}`;
}

export function formatDailyQuicksEmailSubject(summary: DailyQuicksSummary): string {
  return `MechHelp CRM • Daily Quicks • ${formatISTDisplayDate(summary.date)}`;
}

export function formatDailyQuicksEmailBody(summary: DailyQuicksSummary): string {
  const { stats, sections } = summary;
  const divider = '-'.repeat(50);

  return [
    'Good Morning!',
    '',
    'Here is your Daily Quicks summary.',
    '',
    divider,
    '',
    '📊 SUMMARY',
    '',
    `• Total Leads: ${stats.totalLeads}`,
    `• Calls Due Today: ${stats.callsDueToday}`,
    `• Total Bookings: ${stats.totalBookings}`,
    `• Today's Bookings: ${stats.todaysBookings}`,
    `• Tomorrow's Bookings: ${stats.tomorrowsBookings}`,
    `• Rescheduled Bookings: ${stats.rescheduledBookings}`,
    `• Garage Notifications: ${stats.garageNotifications}`,
    `• VIP Customers: ${stats.vipCustomers}`,
    '',
    divider,
    '',
    formatSection("TODAY'S CALLS", sections.todaysCalls),
    '',
    divider,
    '',
    formatSection("TODAY'S BOOKINGS", sections.todaysBookings),
    '',
    divider,
    '',
    formatSection("TOMORROW'S BOOKINGS", sections.tomorrowsBookings),
    '',
    divider,
    '',
    formatSection('RESCHEDULED BOOKINGS', sections.rescheduledBookings),
    '',
    divider,
    '',
    formatSection('GARAGE NOTIFICATIONS', sections.garageNotifications),
    '',
    divider,
    '',
    formatSection('VIP CUSTOMERS', sections.vipCustomers),
    '',
    divider,
    '',
    'Have a productive day!',
  ].join('\n');
}
