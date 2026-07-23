import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard,
  Sun,
  KanbanSquare, 
  Users, 
  CalendarDays, 
  Star, 
  MessageCircle, 
  PhoneCall, 
  RotateCcw,
  BarChart3,
  Settings
} from 'lucide-react';
import './Sidebar.css';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/daily-quicks', label: 'Daily Quicks', icon: Sun, nested: true },
  { path: '/leads', label: 'All Leads', icon: Users },
  { path: '/bookings', label: 'Bookings', icon: CalendarDays },
  { path: '/kanban', label: 'Kanban', icon: KanbanSquare },
  { path: '/vip', label: 'VIP Customers', icon: Star },
  { path: '/whatsapp', label: 'WhatsApp Broadcast', icon: MessageCircle },
  { path: '/sujal', label: 'Daily Call List', icon: PhoneCall },
  { path: '/bookings?filter=rescheduled', label: 'Rescheduled Bookings', icon: RotateCcw },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="sidebar surface-panel">
      <div className="sidebar-header">
        <h2 className="fallback-logo">MechHelp CRM</h2>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `nav-item${'nested' in item && item.nested ? ' nav-item-nested' : ''}${isActive ? ' active' : ''}`
            }
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
