import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard,
  Sun,
  Moon,
  KanbanSquare, 
  Users, 
  CalendarDays,
  Calendar,
  Star, 
  PhoneCall, 
  BarChart3,
  CreditCard,
  Wrench
} from 'lucide-react';
import './Sidebar.css';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/daily-quicks', label: 'Daily Quicks', icon: Sun },
    ]
  },
  {
    title: 'Leads & Reminders',
    items: [
      { path: '/leads', label: 'All Leads', icon: Users },
      { path: '/leads/today/morning', label: 'Reminders: Morning', icon: Sun },
      { path: '/leads/today/evening', label: 'Reminders: Evening', icon: Moon },
      { path: '/sujal', label: 'Pending Call List', icon: PhoneCall },
      { path: '/kanban', label: 'Kanban', icon: KanbanSquare },
    ]
  },
  {
    title: 'Bookings & Customers',
    items: [
      { path: '/bookings', label: 'Bookings', icon: CalendarDays },
      { path: '/bookings/calendar', label: 'Booking Calendar', icon: Calendar },
      { path: '/vip', label: 'VIP Customers', icon: Star },
    ]
  },
  {
    title: 'Finance & Analytics',
    items: [
      { path: '/settlements', label: 'Garage Settlement', icon: CreditCard },
      { path: '/reports', label: 'Reports', icon: BarChart3 },
    ]
  }
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="sidebar surface-panel">
      <div className="sidebar-header">
        <div className="sidebar-logo-badge">
          <Wrench size={16} strokeWidth={2.2} />
        </div>
        <h2 className="fallback-logo">MechHelp CRM</h2>
      </div>
      <nav className="sidebar-nav">
        {navSections.map((section, idx) => (
          <div key={section.title || idx} className="nav-section">
            {section.title && <div className="nav-section-title">{section.title}</div>}
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/' || item.path === '/leads' || item.path === '/bookings'}
                className={({ isActive }) =>
                  `nav-item${isActive ? ' active' : ''}`
                }
              >
                <div className="nav-icon">
                  <item.icon size={18} strokeWidth={1.8} />
                </div>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
};
