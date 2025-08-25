import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  Building2,
  LayoutTemplate,
  FileText,
  Plus,
  ClipboardList,
  Flag,
  FolderPlus,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import type { NavItem } from "../../types";

const mainNavItemsLeft: NavItem[] = [
  { title: "Home", href: "/dashboard", icon: "Home" },
  { title: "Templates", href: "/dashboard/templates", icon: "LayoutTemplate" },
];
const mainNavItemsRight: NavItem[] = [
  { title: "Properties", href: "/dashboard/properties", icon: "Building2" },
  { title: "Reports", href: "/dashboard/reports", icon: "FileText" },
];

const IconMap: Record<string, React.ReactNode> = {
  Home: <Home size={24} />,
  Building2: <Building2 size={24} />,
  LayoutTemplate: <LayoutTemplate size={24} />,
  FileText: <FileText size={24} />,
};

const BottomNavigation: React.FC = () => {
  const { requiresPayment, needsPaymentSetup } = useAuthStore();
  const [open, setOpen] = useState(false);

  const handleAddProperty = () => {
    setOpen(false);
    // TODO: open your Add Property flow
  };
  const handleStartInspection = () => {
    setOpen(false);
    // TODO: open your Start Inspection flow
  };
  const handleFlagItem = () => {
    setOpen(false);
    // TODO: open your Flag Item flow
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[69] bg-black/30 backdrop-blur-[1px]"
          onClick={() => setOpen(false)}
        />
      )}

      {/* FAB action sheet */}
      {open && (
        <div
          id="fab-menu"
          className="fixed left-1/2 -translate-x-1/2 z-[70] w-[92%] max-w-sm
                     bottom-[calc(96px+env(safe-area-inset-bottom))] rounded-2xl
                     bg-white shadow-2xl border border-gray-100 p-2"
          role="dialog"
          aria-modal="true"
        >
          <div className="grid gap-1">
            <button
              onClick={handleAddProperty}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 active:scale-[.99] transition"
            >
              <FolderPlus className="text-blue-600" size={18} />
              <span className="text-sm font-medium text-gray-900">
                Add Property
              </span>
            </button>
            <button
              onClick={handleStartInspection}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 active:scale-[.99] transition"
            >
              <ClipboardList className="text-blue-600" size={18} />
              <span className="text-sm font-medium text-gray-900">
                Start Inspection
              </span>
            </button>
            <button
              onClick={handleFlagItem}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 active:scale-[.99] transition"
            >
              <Flag className="text-blue-600" size={18} />
              <span className="text-sm font-medium text-gray-900">
                Flag Item
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom bar + FAB */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-[60] pointer-events-none">
        <div className="relative">
          {/* Bar (edge to edge) */}
          <nav
            role="navigation"
            aria-label="Primary"
            className="pointer-events-auto bg-white/95 backdrop-saturate-150 backdrop-blur
                       border-t border-gray-200 rounded-t-2xl
                       shadow-[0_-6px_24px_rgba(0,0,0,.06)]
                       px-2 pt-2 pb-[calc(10px+env(safe-area-inset-bottom,0px))]
                       grid grid-cols-5 items-end"
          >
            {/* Left 2 items */}
            {mainNavItemsLeft.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) => {
                  const isDisabled =
                    (requiresPayment || needsPaymentSetup) &&
                    !item.href.includes("/admin/settings");
                  return [
                    "flex flex-col items-center gap-1 py-2 min-w-0",
                    "text-[11px] font-medium",
                    isDisabled
                      ? "text-gray-400 opacity-60 pointer-events-none"
                      : isActive
                      ? "text-blue-600"
                      : "text-gray-600",
                  ].join(" ");
                }}
                end={item.href === "/dashboard"}
              >
                <div className="h-7 flex items-center">{IconMap[item.icon]}</div>
                <span className="leading-none truncate">{item.title}</span>
              </NavLink>
            ))}

            {/* Spacer column for the FAB so it doesn't cover icons */}
            <div className="col-span-1" />

            {/* Right 2 items */}
            {mainNavItemsRight.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) => {
                  const isDisabled =
                    (requiresPayment || needsPaymentSetup) &&
                    !item.href.includes("/admin/settings");
                  return [
                    "flex flex-col items-center gap-1 py-2 min-w-0",
                    "text-[11px] font-medium",
                    isDisabled
                      ? "text-gray-400 opacity-60 pointer-events-none"
                      : isActive
                      ? "text-blue-600"
                      : "text-gray-600",
                  ].join(" ");
                }}
              >
                <div className="h-7 flex items-center">{IconMap[item.icon]}</div>
                <span className="leading-none truncate">{item.title}</span>
              </NavLink>
            ))}
          </nav>

          {/* Center FAB (now smaller and aligned between Templates & Properties) */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="fab-menu"
            className="pointer-events-auto absolute left-1/2 -translate-x-1/2
                       -top-8 w-19 h-19 rounded-full
                       bg-gradient-to-b from-[#2f66ff] to-[#5f86ff]
                       shadow-[0_12px_24px_rgba(47,102,255,.32),0_5px_12px_rgba(47,102,255,.22)]
                       flex items-center justify-center active:scale-[.98] transition"
          >
            <Plus size={30} className="text-white" />
          </button>
        </div>
      </div>
    </>
  );
};

export default BottomNavigation;
