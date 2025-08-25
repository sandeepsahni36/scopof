// src/components/layout/BottomNavigation.tsx
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

const mainNavItems: NavItem[] = [
  { title: "Home", href: "/dashboard", icon: "Home" },
  { title: "Templates", href: "/dashboard/templates", icon: "LayoutTemplate" },
  { title: "Properties", href: "/dashboard/properties", icon: "Building2" },
  { title: "Reports", href: "/dashboard/reports", icon: "FileText" },
];

// map for icons
const IconMap: Record<string, React.ReactNode> = {
  Home: <Home size={24} />,
  Building2: <Building2 size={24} />,
  LayoutTemplate: <LayoutTemplate size={24} />,
  FileText: <FileText size={24} />,
};

const BottomNavigation: React.FC = () => {
  const { requiresPayment, needsPaymentSetup } = useAuthStore();
  const [open, setOpen] = useState(false);

  // ----- Action handlers for the FAB sheet (no navigation required) -----
  const handleAddProperty = () => {
    setOpen(false);
    // TODO: open your “Add Property” flow/sheet
    console.log("Add Property");
  };
  const handleStartInspection = () => {
    setOpen(false);
    // TODO: open your “Start Inspection” flow/sheet
    console.log("Start Inspection");
  };
  const handleFlagItem = () => {
    setOpen(false);
    // TODO: open your “Flag Item” flow/sheet
    console.log("Flag Item");
  };

  return (
    <>
      {/* Backdrop for FAB menu */}
      {open && (
        <div
          className="fixed inset-0 z-[69] bg-black/30 backdrop-blur-[1px]"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* FAB menu sheet */}
      {open && (
        <div
          id="fab-menu"
          className="fixed left-1/2 -translate-x-1/2 z-[70] w-[92%] max-w-sm
                     bottom-[calc(104px+env(safe-area-inset-bottom))] rounded-2xl
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
        <div className="relative mx-3">
          {/* The bar */}
          <nav
            className="pointer-events-auto bg-white/95 backdrop-saturate-150 backdrop-blur
                       border border-gray-200 rounded-t-2xl shadow-[0_-6px_24px_rgba(0,0,0,.06)]
                       px-2 pt-2 pb-[calc(10px+env(safe-area-inset-bottom,0px))] grid grid-cols-4"
            role="navigation"
            aria-label="Primary"
          >
            {mainNavItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) => {
                  const isDisabled =
                    (requiresPayment || needsPaymentSetup) &&
                    !item.href.includes("/admin/settings"); // not used here, but keep gating pattern
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
          </nav>

          {/* FAB (raised, centered, blue) */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="fab-menu"
            className="pointer-events-auto absolute left-1/2 -translate-x-1/2
                       -top-9 w-20 h-20 rounded-full
                       bg-gradient-to-b from-[#2f66ff] to-[#5f86ff]
                       shadow-[0_14px_28px_rgba(47,102,255,.35),0_6px_12px_rgba(47,102,255,.25)]
                       flex items-center justify-center active:scale-[.98] transition"
          >
            <Plus size={36} className="text-white" />
          </button>
        </div>
      </div>
    </>
  );
};

export default BottomNavigation;
