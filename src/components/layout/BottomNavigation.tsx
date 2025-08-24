import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Building2,
  LayoutTemplate,
  FileText,
  Plus,
  ClipboardList,
  Flag,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import type { NavItem } from '../../types';

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: 'Home' },
  { title: 'Templates', href: '/dashboard/templates', icon: 'LayoutTemplate' },
  // FAB is in the middle (not part of navItems)
  { title: 'Properties', href: '/dashboard/properties', icon: 'Building2' },
  { title: 'Reports', href: '/dashboard/reports', icon: 'FileText' },
];

const IconMap: Record<string, React.ReactNode> = {
  Home: <Home size={24} />,
  Building2: <Building2 size={24} />,
  LayoutTemplate: <LayoutTemplate size={24} />,
  FileText: <FileText size={24} />,
};

const BottomNavigation: React.FC = () => {
  const { requiresPayment, needsPaymentSetup } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleBlockedNav = (e: React.MouseEvent, href: string) => {
    const blocked = (requiresPayment || needsPaymentSetup) && !href.includes('/admin/settings');
    if (blocked) {
      e.preventDefault();
      window.location.href = '/subscription-required';
    }
  };

  // Emit lightweight events instead of navigating
  const fireFabAction = (action: 'add-property' | 'start-inspection' | 'flag-item') => {
    window.dispatchEvent(new CustomEvent('fab:action', { detail: action }));
    setMenuOpen(false);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
      {/* Blur/Surface */}
      <nav
        className="
          grid grid-cols-[1fr_1fr_auto_1fr_1fr] items-center gap-2
          px-4 pt-2 pb-[max(10px,env(safe-area-inset-bottom))]
          bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70
          shadow-[0_-8px_30px_rgba(18,20,23,0.08)]
          rounded-t-2xl
        "
        role="navigation"
        aria-label="Primary"
      >
        {/* 1 — Dashboard */}
        <NavLink
          to="/dashboard"
          onClick={(e) => handleBlockedNav(e, '/dashboard')}
          className={({ isActive }) =>
            `
            h-14 min-w-[68px] px-2 rounded-xl
            grid place-items-center gap-1
            text-[11px] font-medium
            ${isActive ? 'text-brand-500' : 'text-gray-500'}
            active:translate-y-[1px]
          `
          }
          end
          aria-label="Dashboard"
        >
          <span className="grid place-items-center">{IconMap['Home']}</span>
          <span>Home</span>
        </NavLink>

        {/* 2 — Templates */}
        <NavLink
          to="/dashboard/templates"
          onClick={(e) => handleBlockedNav(e, '/dashboard/templates')}
          className={({ isActive }) =>
            `
            h-14 min-w-[68px] px-2 rounded-xl
            grid place-items-center gap-1
            text-[11px] font-medium
            ${isActive ? 'text-brand-500' : 'text-gray-500'}
            active:translate-y-[1px]
          `
          }
          aria-label="Templates"
        >
          <span className="grid place-items-center">{IconMap['LayoutTemplate']}</span>
          <span>Templates</span>
        </NavLink>

        {/* Center FAB */}
        <div className="relative grid place-items-center">
          <button
            type="button"
            aria-label="Add"
            onClick={() => setMenuOpen((v) => !v)}
            className="
              -translate-y-6 w-14 h-14 rounded-full
              bg-gradient-to-b from-brand-500 to-brand-400 text-white
              shadow-[0_10px_24px_rgba(47,102,255,.35),0_4px_10px_rgba(47,102,255,.25)]
              grid place-items-center
              active:translate-y-[-22px]
            "
          >
            <Plus size={26} />
          </button>

          {/* Floating Action Menu (no navigation) */}
          {menuOpen && (
            <>
              {/* Backdrop click to close */}
              <button
                aria-label="Close action menu"
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 -z-10 bg-black/0"
              />
              <div
                className="
                  absolute bottom-[4.25rem] left-1/2 -translate-x-1/2
                  w-[92vw] max-w-[360px]
                  bg-white rounded-2xl shadow-2xl border border-gray-100
                  p-3
                "
              >
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => fireFabAction('add-property')}
                    className="
                      group rounded-xl p-3 grid place-items-center gap-1.5
                      bg-gray-50 hover:bg-gray-100 active:scale-[0.98]
                    "
                  >
                    <Building2 className="text-gray-700" size={22} />
                    <span className="text-[11px] text-gray-700 font-medium">Add Property</span>
                  </button>
                  <button
                    onClick={() => fireFabAction('start-inspection')}
                    className="
                      group rounded-xl p-3 grid place-items-center gap-1.5
                      bg-gray-50 hover:bg-gray-100 active:scale-[0.98]
                    "
                  >
                    <ClipboardList className="text-gray-700" size={22} />
                    <span className="text-[11px] text-gray-700 font-medium">Start Inspection</span>
                  </button>
                  <button
                    onClick={() => fireFabAction('flag-item')}
                    className="
                      group rounded-xl p-3 grid place-items-center gap-1.5
                      bg-gray-50 hover:bg-gray-100 active:scale-[0.98]
                    "
                  >
                    <Flag className="text-gray-700" size={22} />
                    <span className="text-[11px] text-gray-700 font-medium">Flag Item</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 3 — Properties */}
        <NavLink
          to="/dashboard/properties"
          onClick={(e) => handleBlockedNav(e, '/dashboard/properties')}
          className={({ isActive }) =>
            `
            h-14 min-w-[68px] px-2 rounded-xl
            grid place-items-center gap-1
            text-[11px] font-medium
            ${isActive ? 'text-brand-500' : 'text-gray-500'}
            active:translate-y-[1px]
          `
          }
          aria-label="Properties"
        >
          <span className="grid place-items-center">{IconMap['Building2']}</span>
          <span>Properties</span>
        </NavLink>

        {/* 4 — Reports */}
        <NavLink
          to="/dashboard/reports"
          onClick={(e) => handleBlockedNav(e, '/dashboard/reports')}
          className={({ isActive }) =>
            `
            h-14 min-w-[68px] px-2 rounded-xl
            grid place-items-center gap-1
            text-[11px] font-medium
            ${isActive ? 'text-brand-500' : 'text-gray-500'}
            active:translate-y-[1px]
          `
          }
          aria-label="Reports"
        >
          <span className="grid place-items-center">{IconMap['FileText']}</span>
          <span>Reports</span>
        </NavLink>
      </nav>
    </div>
  );
};

export default BottomNavigation;
