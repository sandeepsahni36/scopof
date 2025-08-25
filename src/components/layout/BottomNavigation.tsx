// src/components/layout/BottomNavigation.tsx
import React, { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { Home, Building2, LayoutTemplate, FileText, Plus } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import type { NavItem } from "../../types";

const mainNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: "Home" },
  { title: "Templates", href: "/dashboard/templates", icon: "LayoutTemplate" },
  { title: "Properties", href: "/dashboard/properties", icon: "Building2" },
  { title: "Reports", href: "/dashboard/reports", icon: "FileText" },
];

const IconMap: Record<string, React.ReactNode> = {
  Home: <Home size={26} />,
  Building2: <Building2 size={26} />,
  LayoutTemplate: <LayoutTemplate size={26} />,
  FileText: <FileText size={26} />,
};

const BottomNavigation: React.FC = () => {
  const { requiresPayment, needsPaymentSetup } = useAuthStore();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside/Esc
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);

    if (open) {
      document.addEventListener("mousedown", onDocClick);
      document.addEventListener("keydown", onEsc);
    }
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const NavBtn = ({
    to,
    icon,
    title,
  }: {
    to: string;
    icon: React.ReactNode;
    title: string;
  }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center gap-1 py-3 min-w-0
         text-[11px] font-medium transition-colors
         ${isActive ? "text-primary-600" : "text-gray-600"}`
      }
      onClick={(e) => {
        if ((requiresPayment || needsPaymentSetup) && !to.includes("/admin/settings")) {
          e.preventDefault();
          window.location.href = "/subscription-required";
        }
      }}
      end={to === "/dashboard"}
    >
      <div className="flex-shrink-0">{icon}</div>
      <span className="leading-tight">{title}</span>
    </NavLink>
  );

  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 z-[60] pointer-events-none">
      {/* Dimmer under menu (but above page) */}
      {open && (
        <div
          className="pointer-events-auto fixed inset-0 z-[50] bg-black/20 backdrop-blur-[1px]"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Bar */}
      <div className="relative pointer-events-none z-[55]">
        <nav
          className="pointer-events-auto bg-white border-t border-gray-200
                     shadow-[0_-10px_28px_rgba(0,0,0,.06)]
                     px-6 pt-2 pb-[max(14px,env(safe-area-inset-bottom))] w-full"
        >
          <div className="grid grid-cols-5 items-center text-gray-700">
            <div className="col-span-1 flex justify-center">
              <NavBtn to="/dashboard" icon={IconMap.Home} title="Home" />
            </div>
            <div className="col-span-1 flex justify-center">
              <NavBtn to="/dashboard/templates" icon={IconMap.LayoutTemplate} title="Templates" />
            </div>

            {/* center column kept empty; FAB sits above it */}
            <div className="col-span-1" />

            <div className="col-span-1 flex justify-center">
              <NavBtn to="/dashboard/properties" icon={IconMap.Building2} title="Properties" />
            </div>
            <div className="col-span-1 flex justify-center">
              <NavBtn to="/dashboard/reports" icon={IconMap.FileText} title="Reports" />
            </div>
          </div>
        </nav>

        {/* FAB */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="fab-menu"
          className="pointer-events-auto absolute left-1/2 -translate-x-1/2
                     -top-[36px] w-[72px] h-[72px] rounded-full z-[60]
                     bg-gradient-to-b from-[#2f66ff] to-[#5f86ff]
                     shadow-[0_16px_36px_rgba(47,102,255,.30),0_6px_14px_rgba(47,102,255,.22)]
                     flex items-center justify-center active:scale-[.98] transition"
        >
          <Plus size={32} className="text-white" />
        </button>

        {/* Menu */}
        <div
          id="fab-menu"
          ref={menuRef}
          className={`pointer-events-auto absolute left-1/2 -translate-x-1/2
                      bottom-[86px] w-[92%] max-w-[420px] z-[59]
                      transition-all duration-150
                      ${open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}
          aria-hidden={!open}
        >
          <div className="rounded-2xl bg-white shadow-[0_18px_40px_rgba(0,0,0,.12)]
                          border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-100">
              <button
                className="w-full text-left px-4 py-3 text-sm flex items-center gap-3 active:bg-gray-50"
                onClick={() => {
                  console.log("Add Property");
                  setOpen(false);
                }}
              >
                <Building2 size={18} className="text-primary-600" />
                <span className="font-medium">Add Property</span>
              </button>
              <button
                className="w-full text-left px-4 py-3 text-sm flex items-center gap-3 active:bg-gray-50"
                onClick={() => {
                  console.log("Start Inspection");
                  setOpen(false);
                }}
              >
                <LayoutTemplate size={18} className="text-primary-600" />
                <span className="font-medium">Start Inspection</span>
              </button>
              <button
                className="w-full text-left px-4 py-3 text-sm flex items-center gap-3 active:bg-gray-50"
                onClick={() => {
                  console.log("Create Template");
                  setOpen(false);
                }}
              >
                <FileText size={18} className="text-primary-600" />
                <span className="font-medium">Create Template</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BottomNavigation;
