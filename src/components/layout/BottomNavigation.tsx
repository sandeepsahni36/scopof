import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Building2, 
  LayoutTemplate, 
  FileText, 
  Settings 
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { NavItem } from '../../types';

const mainNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: 'Home' },
  { title: 'Properties', href: '/dashboard/properties', icon: 'Building2' },
  { title: 'Templates', href: '/dashboard/templates', icon: 'LayoutTemplate' },
  { title: 'Reports', href: '/dashboard/reports', icon: 'FileText' },
];

const adminNavItems: NavItem[] = [
  { title: 'Settings', href: '/dashboard/admin/settings', icon: 'Settings' },
];

const IconMap: Record<string, React.ReactNode> = {
  Home: <Home size={20} />,
  Building2: <Building2 size={20} />,
  LayoutTemplate: <LayoutTemplate size={20} />,
  FileText: <FileText size={20} />,
  Settings: <Settings size={20} />,
};

const BottomNavigation = () => {
  const { isAdmin, requiresPayment, needsPaymentSetup } = useAuthStore();
  const navItems = isAdmin ? [...mainNavItems, ...adminNavItems] : mainNavItems;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 overflow-hidden">
      <nav className="flex w-full">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) => {
              // Allow access to Company Settings for billing management
              const isDisabled = (requiresPayment || needsPaymentSetup) && !item.href.includes('/admin/settings');
              return `flex flex-col items-center justify-center text-xs font-medium transition-colors flex-1 py-3 px-1 min-w-0 ${
                isActive
                  ? 'text-primary-600 bg-primary-50'
                  : isDisabled
                    ? 'text-gray-400 opacity-60'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`;
            }}
            onClick={(e) => {
              if ((requiresPayment || needsPaymentSetup) && !item.href.includes('/admin/settings')) {
                e.preventDefault();
                window.location.href = '/subscription-required';
              }
            }}
            end={item.href === '/dashboard'}
          >
            <div className="mb-1 flex-shrink-0">
              {IconMap[item.icon]}
            </div>
            <span className="text-center leading-tight text-[10px] font-medium w-full">
              {item.title}
              {(requiresPayment || needsPaymentSetup) && !item.href.includes('/admin/settings') && (
                <span className="block text-[8px] text-amber-600 mt-0.5 leading-none">Upgrade</span>
              )}
            </span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default BottomNavigation;