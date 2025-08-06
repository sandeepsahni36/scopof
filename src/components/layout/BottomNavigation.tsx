import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Building2,
  LayoutTemplate,
  FileText,
  Settings,
  Users,
  CreditCard,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { NavItem } from '../../types';

// Define IconMap and NavItems here
const IconMap: Record<string, React.ReactNode> = {
  Home: <Home size={20} />,
  Building2: <Building2 size={20} />,
  LayoutTemplate: <LayoutTemplate size={20} />,
  FileText: <FileText size={20} />,
  Settings: <Settings size={20} />,
  Users: <Users size={20} />,
  CreditCard: <CreditCard size={20} />,
};

const mainNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: 'Home' },
  { title: 'Properties', href: '/dashboard/properties', icon: 'Building2' },
  { title: 'Templates', href: '/dashboard/templates', icon: 'LayoutTemplate' },
  { title: 'Reports', href: '/dashboard/reports', icon: 'FileText' },
];

const adminNavItems: NavItem[] = [
  { title: 'Settings', href: '/dashboard/admin/settings', icon: 'Settings' },
  { title: 'Subscription', href: '/dashboard/admin/subscription', icon: 'CreditCard' }
];

const BottomNavigation = () => {
  const { isAdmin } = useAuthStore();

  // Combine main and admin items for mobile display
  const allNavItems = [...mainNavItems];
  if (isAdmin) {
    allNavItems.push(...adminNavItems);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg md:hidden">
      <nav className="flex justify-around items-center h-16 px-2">
        {allNavItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) => `
              flex flex-col items-center justify-center text-xs font-medium transition-colors min-w-0 flex-1 py-2
              ${
                isActive
                  ? 'text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }
            `}
            end={item.href === '/dashboard'}
          >
            <div className="mb-1">
              {IconMap[item.icon]}
            </div>
            <span className="truncate">{item.title}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default BottomNavigation;
