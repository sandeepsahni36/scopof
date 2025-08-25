// src/components/layout/BottomNavigation.tsx
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Building2, LayoutTemplate, FileText, Plus } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

type NavItem = { title: string; href: string; icon: React.ReactNode };

const NAV_ITEMS: NavItem[] = [
  { title: 'Home',       href: '/dashboard',            icon: <Home size={22} /> },
  { title: 'Properties', href: '/dashboard/properties', icon: <Building2 size={22} /> },
  { title: 'Templates',  href: '/dashboard/templates',  icon: <LayoutTemplate size={22} /> },
  { title: 'Reports',    href: '/dashboard/reports',    icon: <FileText size={22} /> },
];

const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const { requiresPayment, needsPaymentSetup } = useAuthStore();
  const [openFab, setOpenFab] = useState(false);

  const guardNav = (href: string) =>
    (requiresPayment || needsPaymentSetup) && !href.includes('/admin/settings');

  const openAddPropertyModal = () => {
    // fire both names for compatibility with your current listener
    window.dispatchEvent(new CustomEvent('openPropertyModal'));
    window.dispatchEvent(new CustomEvent('open-property-create'));
    window.dispatchEvent(new CustomEvent('openPropertyCreateModal'));
    setOpenFab(false);
  };

  const goCreateTemplate = () => {
    navigate('/dashboard/templates/new');
    setOpenFab(false);
  };

  return (
    <>
      {/* FAB quick menu (above bar) */}
      {openFab && (
        <div
          className="md:hidden fixed inset-0 z-[60]"
          onClick={() => setOpenFab(false)}
        >
          <div className="absolute inset-0 bg-black/20" />

          <div
            className="absolute left-1/2 -translate-x-1/2
                       rounded-2xl shadow-xl bg-white
                       w-[280px] overflow-hidden
                       border border-gray-100"
            style={{ bottom: 'calc(86px + env(safe-area-inset-bottom))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={openAddPropertyModal}
              className="w-full px-4 py-3 text-left text-[15px] font-medium hover:bg-gray-50"
            >
              Add Property
            </button>
            <div className="h-px bg-gray-100" />
            <button
              onClick={goCreateTemplate}
              className="w-full px-4 py-3 text-left text-[15px] font-medium hover:bg-gray-50"
            >
              Add Template
            </button>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <nav className="relative flex w-full items-end justify-between px-2 pt-2 pb-[env(safe-area-inset-bottom)]">
          {/* nav items */}
          {NAV_ITEMS.map((item, idx) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center justify-center flex-1 py-2 min-w-0 text-xs font-medium transition-colors',
                  guardNav(item.href)
                    ? 'text-gray-400 opacity-60'
                    : isActive
                    ? 'text-primary-600'
                    : 'text-gray-600 hover:text-gray-900',
                ].join(' ')
              }
              onClick={(e) => {
                if (guardNav(item.href)) {
                  e.preventDefault();
                  window.location.href = '/subscription-required';
                }
              }}
              end={item.href === '/dashboard'}
            >
              <div className="mb-1 flex-shrink-0">{item.icon}</div>
              <span className="leading-tight text-[11px]">{item.title}</span>
            </NavLink>
          ))}

          {/* Center FAB */}
          <button
            aria-label="Quick actions"
            onClick={() => setOpenFab((v) => !v)}
            className="absolute left-1/2 -translate-x-1/2 -top-6
                       rounded-full w-[84px] h-[84px]
                       bg-gradient-to-b from-[#4F7CFF] to-[#3B6BFF]
                       text-white shadow-[0_12px_30px_rgba(59,107,255,0.45)]
                       active:scale-95 transition-transform z-[55]
                       flex items-center justify-center"
            style={{ border: '6px solid #fff', borderRadius: '9999px' }}
          >
            <Plus size={38} strokeWidth={3} />
          </button>
        </nav>
      </div>
    </>
  );
};

export default BottomNavigation;
