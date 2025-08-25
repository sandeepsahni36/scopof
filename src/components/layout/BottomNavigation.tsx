// src/components/layout/BottomNavigation.tsx
import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Building2,
  LayoutTemplate,
  FileText,
  Settings,
  Plus,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { NavItem } from '../../types';

const mainNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: 'Home' },
  { title: 'Templates', href: '/dashboard/templates', icon: 'LayoutTemplate' },
  { title: 'Properties', href: '/dashboard/properties', icon: 'Building2' },
  { title: 'Reports', href: '/dashboard/reports', icon: 'FileText' },
];

const adminNavItems: NavItem[] = [
  { title: 'Settings', href: '/dashboard/admin/settings', icon: 'Settings' },
];

const IconMap: Record<string, React.ReactNode> = {
  Home: <Home size={24} />,
  Building2: <Building2 size={24} />,
  LayoutTemplate: <LayoutTemplate size={24} />,
  FileText: <FileText size={24} />,
  Settings: <Settings size={24} />,
};

const BottomNavigation: React.FC = () => {
  const { isAdmin, requiresPayment, needsPaymentSetup } = useAuthStore();
  const navItems = isAdmin ? [...mainNavItems, ...adminNavItems] : mainNavItems;

  const [fabOpen, setFabOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Close on route change or ESC
  React.useEffect(() => setFabOpen(false), [location.pathname]);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFabOpen(false);
    if (fabOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fabOpen]);

  const openAddProperty = () => {
    setFabOpen(false);
    if (location.pathname.startsWith('/dashboard/properties')) {
      window.dispatchEvent(new CustomEvent('open-add-property'));
    } else {
      navigate('/dashboard/properties', { state: { openAddProperty: true } });
    }
  };

  const openAddTemplate = () => {
    setFabOpen(false);
    navigate('/dashboard/templates/new');
  };

  return (
    <>
      {/* Click-away scrim (invisible) */}
      {fabOpen && (
        <button
          aria-label="Close quick actions"
          className="fixed inset-0 z-[60] bg-black/0"
          onClick={() => setFabOpen(false)}
        />
      )}

      {/* Bottom bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[50]">
        <div className="mx-3 mb-3 rounded-3xl bg-white border border-gray-200 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
          <nav className="flex items-center justify-around px-2 py-3">
            {navItems.slice(0, 2).map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  `flex flex-col items-center min-w-0 text-[11px] font-medium transition-colors ${
                    (requiresPayment || needsPaymentSetup) && !item.href.includes('/admin/settings')
                      ? 'text-gray-400 opacity-60 pointer-events-none'
                      : isActive
                      ? 'text-primary-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`
                }
                end={item.href === '/dashboard'}
              >
                <div className="mb-1">{IconMap[item.icon]}</div>
                <span className="truncate">{item.title}</span>
              </NavLink>
            ))}

            {/* FAB spacer */}
            <div className="w-[88px] pointer-events-none" />

            {navItems.slice(2, 4).map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  `flex flex-col items-center min-w-0 text-[11px] font-medium transition-colors ${
                    (requiresPayment || needsPaymentSetup) && !item.href.includes('/admin/settings')
                      ? 'text-gray-400 opacity-60 pointer-events-none'
                      : isActive
                      ? 'text-primary-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`
                }
              >
                <div className="mb-1">{IconMap[item.icon]}</div>
                <span className="truncate">{item.title}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* FAB */}
        <button
          aria-label="Open quick actions"
          onClick={() => setFabOpen((v) => !v)}
          className="group absolute left-1/2 -translate-x-1/2 -top-7 z-[70]
                     h-[66px] w-[66px] rounded-full bg-gradient-to-b from-[#4F8BFF] to-[#356BFF]
                     text-white shadow-[0_10px_30px_rgba(53,107,255,0.45)]
                     ring-4 ring-white active:scale-95 transition-transform"
        >
          <Plus size={34} className="mx-auto" />
        </button>
      </div>

      {/* Premium-looking action menu */}
      {fabOpen && (
        <div
          className="fixed left-1/2 -translate-x-1/2 bottom-[120px] z-[80]
                     min-w-[220px] max-w-[90vw]
                     rounded-2xl border border-gray-200 bg-white/95 backdrop-blur
                     shadow-[0_20px_50px_rgba(0,0,0,0.12)]"
          role="menu"
          aria-label="Quick actions"
        >
          {/* Caret */}
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-2 h-4 w-4 rotate-45
                       bg-white border border-gray-200 border-t-0 border-l-0"
          />

          <button
            onClick={openAddProperty}
            role="menuitem"
            className="w-full flex items-center gap-3 px-4 py-3 whitespace-nowrap
                       hover:bg-gray-50 active:bg-gray-100 rounded-t-2xl"
          >
            <div className="h-8 w-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
              <Building2 size={18} />
            </div>
            <div className="text-[15px] font-medium text-gray-900">Add Property</div>
          </button>

          <div className="h-px bg-gray-200" />

          <button
            onClick={openAddTemplate}
            role="menuitem"
            className="w-full flex items-center gap-3 px-4 py-3 whitespace-nowrap
                       hover:bg-gray-50 active:bg-gray-100 rounded-b-2xl"
          >
            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <LayoutTemplate size={18} />
            </div>
            <div className="text-[15px] font-medium text-gray-900">Add Template</div>
          </button>
        </div>
      )}
    </>
  );
};

export default BottomNavigation;
