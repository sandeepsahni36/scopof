// src/components/layout/BottomNavigation.tsx
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  Building2,
  LayoutTemplate,
  FileText,
  Plus,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const { requiresPayment, needsPaymentSetup } = useAuthStore();
  const [openFab, setOpenFab] = useState(false);

  // Keep the same visual style; only the order changes.
  const navItems = [
    { title: 'Home', href: '/dashboard', icon: <Home size={22} /> },
    { title: 'Properties', href: '/dashboard/properties', icon: <Building2 size={22} /> },
    { title: 'Templates', href: '/dashboard/templates', icon: <LayoutTemplate size={22} /> },
    { title: 'Reports', href: '/dashboard/reports', icon: <FileText size={22} /> },
  ];

  const isGuarded = (href: string) =>
    (requiresPayment || needsPaymentSetup) && !href.includes('/admin/settings');

  // --- FAB actions (unchanged) ---
  const openAddPropertyModal = () => {
    // fire all known event names for compatibility
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
      {/* Dimmed backdrop + menu */}
      {openFab && (
        <div
          className="md:hidden fixed inset-0 z-[60]"
          onClick={() => setOpenFab(false)}
        >
          <div className="absolute inset-0 bg-black/25 backdrop-blur-[1px]" />

          {/* Quick menu card (same polished style) */}
          <div
            className="absolute left-1/2 -translate-x-1/2
                       w-[300px] rounded-2xl bg-white shadow-xl
                       border border-gray-100 overflow-hidden z-[61]"
            style={{ bottom: 'calc(94px + env(safe-area-inset-bottom))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={openAddPropertyModal}
              className="w-full flex items-center gap-3 px-4 py-3 text-[15px] font-medium hover:bg-gray-50"
            >
              <span className="text-primary-600"><Building2 size={18} /></span>
              <span>Add Property</span>
            </button>
            <div className="h-px bg-gray-100" />
            <button
              onClick={goCreateTemplate}
              className="w-full flex items-center gap-3 px-4 py-3 text-[15px] font-medium hover:bg-gray-50"
            >
              <span className="text-primary-600"><LayoutTemplate size={18} /></span>
              <span>Add Template</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom bar (same design) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <nav className="relative bg-white border-t border-gray-200">
          <div className="flex items-end justify-between px-3 pt-2 pb-[calc(14px+env(safe-area-inset-bottom))]">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  [
                    'flex flex-col items-center justify-center flex-1 py-2 min-w-0 text-xs font-medium transition-colors',
                    isGuarded(item.href)
                      ? 'text-gray-400 opacity-60'
                      : isActive
                      ? 'text-primary-600'
                      : 'text-gray-600 hover:text-gray-900',
                  ].join(' ')
                }
                onClick={(e) => {
                  if (isGuarded(item.href)) {
                    e.preventDefault();
                    window.location.href = '/subscription-required';
                  }
                }}
                end={item.href === '/dashboard'}
              >
                <div className="mb-1">{item.icon}</div>
                <span className="leading-tight text-[11px]">{item.title}</span>
              </NavLink>
            ))}

            {/* Center FAB (same size/position as before) */}
            <button
              aria-label="Quick actions"
              onClick={() => setOpenFab((v) => !v)}
              className="absolute left-1/2 -translate-x-1/2 -top-7
                         flex items-center justify-center
                         w-[84px] h-[84px] rounded-full
                         text-white shadow-[0_14px_34px_rgba(59,107,255,0.45)]
                         active:scale-95 transition-transform z-[62]
                         bg-gradient-to-b from-[#4F7CFF] to-[#3B6BFF]"
              style={{ border: '6px solid #fff', borderRadius: '9999px' }}
            >
              <Plus size={36} strokeWidth={3} />
            </button>
          </div>
        </nav>
      </div>
    </>
  );
};

export default BottomNavigation;
