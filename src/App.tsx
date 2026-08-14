import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LeadProvider } from './store/LeadContext';
import { ThemeProvider } from './store/ThemeContext';

import { Dashboard } from './pages/Dashboard';
import { DailyQuicks } from './pages/DailyQuicks';
import { SujalList } from './pages/SujalList';
import { Kanban } from './pages/Kanban';
import { AllLeads } from './pages/AllLeads';
import { ReminderPage } from './pages/ReminderPage';
import { Bookings } from './pages/Bookings';
import { BookingCalendar } from './pages/BookingCalendar';
import { VipCustomers } from './pages/VipCustomers';
import { WhatsappBroadcast } from './pages/WhatsappBroadcast';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { GarageSettlement } from './pages/GarageSettlement';

function App() {
  return (
    <ThemeProvider>
      <LeadProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="daily-quicks" element={<DailyQuicks />} />
            <Route path="kanban" element={<Kanban />} />
            <Route path="sujal" element={<SujalList />} />
            <Route path="leads" element={<AllLeads />} />
            {/* Redirect old /leads/today bookmark to morning by default */}
            <Route path="leads/today" element={<Navigate to="/leads/today/morning" replace />} />
            <Route path="leads/today/morning" element={<ReminderPage slot="morning" />} />
            <Route path="leads/today/evening" element={<ReminderPage slot="evening" />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="bookings/calendar" element={<BookingCalendar />} />
            <Route path="vip" element={<VipCustomers />} />
            <Route path="whatsapp" element={<WhatsappBroadcast />} />
            <Route path="settlements" element={<GarageSettlement />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </LeadProvider>
    </ThemeProvider>
  );
}

export default App;

