import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LeadProvider } from './store/LeadContext';
import { ThemeProvider } from './store/ThemeContext';

import { Dashboard } from './pages/Dashboard';
import { DailyQuicks } from './pages/DailyQuicks';
import { SujalList } from './pages/SujalList';
import { Kanban } from './pages/Kanban';
import { AllLeads } from './pages/AllLeads';
import { TodayRemainingLeads } from './pages/TodayRemainingLeads';
import { Bookings } from './pages/Bookings';
import { BookingCalendar } from './pages/BookingCalendar';
import { VipCustomers } from './pages/VipCustomers';
import { WhatsappBroadcast } from './pages/WhatsappBroadcast';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

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
            <Route path="leads/today" element={<TodayRemainingLeads />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="bookings/calendar" element={<BookingCalendar />} />
            <Route path="vip" element={<VipCustomers />} />
            <Route path="whatsapp" element={<WhatsappBroadcast />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </LeadProvider>
    </ThemeProvider>
  );
}

export default App;
