import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  Home: <Home size={20} />,
  Building2: <Building2 size={20} />,
  LayoutTemplate: <LayoutTemplate size={20} />,
  FileText: <FileText size={20} />,
  Settings: <Settings size={20} />,
};

const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, requiresPayment, needsPaymentSetup } = useAuthStore();
  const [fabOpen, setFabOpen] = useState(false);

  const navItems = isAdmin ? [...mainNavItems, ...adminNavItems] : mainNavItems;

  // We’ll render 4 tabs (Dashboard, Templates, Properties, Reports).
  // FAB sits centered between Templates and Properties.
  const tabs = navItems.slice(0, 4); // ensure Reports is present

  const goAddProperty = () => {
    setFabOpen(false);
    // Open properties page with modal via query param
    navigate('/dashboard/properties?new=1');
  };

  const goAddTemplate = () => {
    setFabOpen(false);
    // Navigate to template creator (your existing route)
    navigate('/dashboard/templates/new');
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 overflow-visible">
      <div className="relative">
        {/* Tabs row */}
        <nav className="grid grid-cols-5 items-stretch">
          {/* 0: Dashboard */}
          <TabLink item={tabs[0]} locationPath={location.pathname} requiresPayment={requiresPayment} needsPaymentSetup={needsPaymentSetup} />

          {/* 1: Templates */}
          <TabLink item={tabs[1]} locationPath={location.pathname} requiresPayment={requiresPayment} needsPaymentSetup={needsPaymentSetup} />

          {/* Spacer for FAB */}
          <div className="h-14" />

          {/* 2: Properties */}
          <TabLink item={tabs[2]} locationPath={location.pathname} requiresPayment={requiresPayment} needsPaymentSetup={needsPaymentSetup} />

          {/* 3: Reports */}
          <TabLink item={tabs[3]} locationPath={location.pathname} requiresPayment={requiresPayment} needsPaymentSetup={needsPaymentSetup} />
        </nav>

        {/* FAB */}
        <button
          type="button"
          onClick={() => setFabOpen(v => !v)}
          aria-label="Add"
          className="
            absolute left-1/2 -translate-x-1/2
            -translate-y-1/2
            bottom-0
            w-[72px] h-[72px]
            rounded-full bg-primary-600 text-white
            shadow-lg shadow-primary-300/40
            flex items-center justify-center
            z-[60]
            border-4 border-white
            active:scale-95 transition
          "
        >
          <Plus size={28} />
        </button>

        {/* FAB Menu */}
        {fabOpen && (
          <div
            className="
              absolute left-1/2 -translate-x-1/2
              bottom-[84px]
              z-[70]
              w-56 rounded-2xl bg-white shadow-xl border border-gray-200
              p-2
            "
          >
            <MenuItem label="Add Property" onClick={goAddProperty} />
            <MenuItem label="Add Template" onClick={goAddTemplate} />
          </div>
        )}
      </div>
    </div>
  );
};

export default BottomNavigation;

/* ---------- Helpers ---------- */

function TabLink({
  item,
  locationPath,
  requiresPayment,
  needsPaymentSetup,
}: {
  item: NavItem | undefined;
  locationPath: string;
  requiresPayment: boolean;
  needsPaymentSetup: boolean;
}) {
  if (!item) return <div />;

  const isDisabled = (requiresPayment || needsPaymentSetup) && !item.href.includes('/admin/settings');

  return (
    <NavLink
      to={item.href}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center text-xs font-medium transition-colors
         py-3 px-1 min-w-0
         ${isActive || locationPath === item.href ? 'text-primary-600 bg-primary-50' : isDisabled ? 'text-gray-400 opacity-60' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`
      }
      onClick={(e) => {
        if (isDisabled) {
          e.preventDefault();
          window.location.href = '/subscription-required';
        }
      }}
      end={item.href === '/dashboard'}
    >
      <div className="mb-1 flex-shrink-0">{IconMap[item.icon]}</div>
      <span className="text-center leading-tight text-[10px] font-medium w-full">
        {item.title}
        {(requiresPayment || needsPaymentSetup) && !item.href.includes('/admin/settings') && (
          <span className="block text-[8px] text-amber-600 mt-0.5 leading-none">Upgrade</span>
        )}
      </span>
    </NavLink>
  );
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        w-full text-left px-3 py-3 rounded-xl
        hover:bg-gray-50 active:bg-gray-100
        text-sm font-medium text-gray-800
      "
    >
      {label}
    </button>
  );
}
