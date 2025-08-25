// src/components/layout/BottomNavigation.tsx
import React, { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  LayoutTemplate,
  Building2,
  FileText,
  Plus,
  FilePlus2,
  ClipboardCheck,
  FolderPlus,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";

type NavItem = { title: string; href: string; icon: React.ReactNode };

const NAV_ITEMS: NavItem[] = [
  { title: "Home",       href: "/dashboard",            icon: <Home size={22} /> },
  { title: "Templates",  href: "/dashboard/templates",  icon: <LayoutTemplate size={22} /> },
  { title: "Properties", href: "/dashboard/properties", icon: <Building2 size={22} /> },
  { title: "Reports",    href: "/dashboard/reports",    icon: <FileText size={22} /> },
];

export default function BottomNavigation() {
  const { requiresPayment, needsPaymentSetup } = useAuthStore();
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click / ESC
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!popRef.current) return;
      if (!popRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    if (open) {
      document.addEventListener("click", onClick);
      document.addEventListener("keydown", onEsc);
    }
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const gate = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (requiresPayment || needsPaymentSetup) {
      e.preventDefault();
      window.location.href = "/subscription-required";
    }
  };

  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 z-50 pointer-events-none">
      <div
        className="
          relative mx-auto max-w-full pointer-events-auto
          bg-white/95 backdrop-blur border-t border-gray-200
          rounded-t-2xl shadow-[0_-6px_24px_rgba(18,20,23,.06)]
          px-3 pt-2 pb-[calc(10px+env(safe-area-inset-bottom))]
          overflow-visible
        "
      >
        {/* Center FAB (now docks ABOVE the bar) */}
        <button
          aria-label="Add"
          onClick={() => setOpen((v) => !v)}
          className="
            absolute left-1/2 -translate-x-1/2 -top-8 z-10
            w-16 h-16 rounded-full
            bg-gradient-to-b from-[#2f66ff] to-[#5f86ff]
            shadow-[0_10px_24px_rgba(47,102,255,.35),0_4px_10px_rgba(47,102,255,.25)]
            grid place-items-center
          "
        >
          <Plus size={28} className="text-white" />
        </button>

        {/* nav row */}
        <div className="grid grid-cols-4 text-[11px] font-medium">
          {NAV_ITEMS.map((item, idx) => (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={(e) => gate(e, item.href)}
              end={item.href === "/dashboard"}
              className={({ isActive }) =>
                [
                  "flex flex-col items-center justify-center gap-1 py-3",
                  // small nudge so labels don't collide with the FAB
                  idx > 1 ? "translate-x-2" : "-translate-x-2",
                  isActive ? "text-[#2f66ff]" : "text-gray-600 hover:text-gray-800",
                ].join(" ")
              }
            >
              <div className="w-7 h-7 grid place-items-center">{item.icon}</div>
              <span className="leading-none">{item.title}</span>
            </NavLink>
          ))}
        </div>

        {/* Popover menu */}
        {open && (
          <div
            ref={popRef}
            className="
              absolute left-1/2 -translate-x-1/2 bottom-20
              w-[min(88vw,360px)] rounded-2xl border border-gray-200 bg-white shadow-xl p-2
            "
          >
            <MenuItem
              icon={<FolderPlus size={18} />}
              title="Add Property"
              desc="Create a new property"
              onClick={() => setOpen(false)}
            />
            <MenuItem
              icon={<ClipboardCheck size={18} />}
              title="Start Inspection"
              desc="Begin a new inspection"
              onClick={() => setOpen(false)}
            />
            <MenuItem
              icon={<FilePlus2 size={18} />}
              title="Create Template"
              desc="New reusable template"
              onClick={() => setOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl p-3 hover:bg-gray-50 active:bg-gray-100 transition flex items-center gap-3"
    >
      <div className="w-9 h-9 rounded-lg bg-gray-100 grid place-items-center">{icon}</div>
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-gray-900">{title}</div>
        <div className="text-[11px] text-gray-500 truncate">{desc}</div>
      </div>
    </button>
  );
}
