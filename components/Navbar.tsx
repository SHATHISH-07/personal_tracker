"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Kanban,
  CalendarCheck2,
  LogOut,
  Goal,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Plus,
  Clock8,
  PanelRight,
  IndianRupee,
  Menu,
  X,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPlannerOpen, setIsPlannerOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  if (pathname === "/login") return null;

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    {
      name: "Upskill Planner",
      href: "/plans",
      icon: Goal,
      isDropdown: true,
      subItems: [
        { name: "1. Create Plan", href: "/plans/create", icon: Plus },
        {
          name: "2. Topics Checklist",
          href: "/plans/checklist",
          icon: CheckSquare,
        },
        { name: "3. Daily Record", href: "/daily", icon: CalendarCheck2 },
        { name: "4. Plan Overview", href: "/plans", icon: Kanban },
      ],
    },
    { name: "Timesheet", href: "/timesheet", icon: Clock8 },
    { name: "Expense Tracker", href: "/expenses", icon: IndianRupee },
  ];

  // Extracted navigation content to avoid repetition between desktop and mobile views
  const renderNavLinks = (
    collapsedState: boolean,
    closeMobileMenu?: () => void,
  ) => {
    return navItems.map((item) => {
      const Icon = item.icon;
      const isSectionActive =
        pathname === item.href ||
        (item.href !== "/" && pathname.startsWith(item.href)) ||
        item.subItems?.some((s) => s.href === pathname);

      return (
        <div key={item.name} className="space-y-1 w-full">
          <a
            href={item.href}
            onClick={(e) => {
              e.preventDefault();
              if (item.isDropdown) {
                setIsPlannerOpen(!isPlannerOpen);
              } else {
                router.push(item.href);
                if (closeMobileMenu) closeMobileMenu();
              }
            }}
            title={collapsedState ? item.name : undefined}
            className={`flex items-center gap-3.5 rounded-md font-medium text-sm transition-all cursor-pointer ${
              isSectionActive
                ? "bg-[#272727] text-white font-semibold shadow-xs"
                : "text-[#71717a] hover:bg-[#f4f4f5] hover:text-black"
            } ${
              collapsedState
                ? "justify-center w-11 h-11 px-0 mx-auto"
                : "py-3 px-3.5 w-full"
            }`}
          >
            <Icon
              className={`w-4 h-4 shrink-0 ${
                isSectionActive ? "text-white" : "text-[#71717a]"
              }`}
            />
            {!collapsedState && (
              <div className="flex items-center justify-between flex-1 overflow-hidden">
                <span className="truncate">{item.name}</span>
                {item.isDropdown &&
                  (isPlannerOpen ? (
                    <ChevronUp
                      className={`w-4 h-4 shrink-0 ${
                        isSectionActive ? "text-white" : "text-[#71717a]"
                      }`}
                    />
                  ) : (
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 ${
                        isSectionActive ? "text-white" : "text-[#71717a]"
                      }`}
                    />
                  ))}
              </div>
            )}
          </a>

          {/* SubItems */}
          {item.subItems &&
            (!collapsedState || !closeMobileMenu) &&
            (item.isDropdown ? isPlannerOpen : true) && (
              <div
                className={`${
                  collapsedState
                    ? "space-y-1 pt-1 flex flex-col items-center"
                    : "pl-3 pt-1 space-y-1 border-l-2 border-[#e4e4e7] ml-5 animate-in slide-in-from-top-1 duration-200"
                }`}
              >
                {item.subItems.map((sub) => {
                  const SubIcon = sub.icon;
                  const isSubActive = pathname === sub.href;
                  return (
                    <a
                      key={sub.href}
                      href={sub.href}
                      onClick={(e) => {
                        e.preventDefault();
                        router.push(sub.href);
                        if (closeMobileMenu) closeMobileMenu();
                      }}
                      title={collapsedState ? sub.name : undefined}
                      className={
                        collapsedState
                          ? `flex items-center justify-center w-9 h-9 rounded-md transition-all cursor-pointer ${
                              isSubActive
                                ? "bg-[#f4f4f5] text-black border border-[#e4e4e7] shadow-2xs"
                                : "text-[#71717a] hover:bg-[#f4f4f5] hover:text-black"
                            }`
                          : `flex items-center gap-3 rounded-md font-medium text-xs transition-all cursor-pointer py-2.5 px-3 ${
                              isSubActive
                                ? "bg-[#f4f4f5] text-black font-extrabold border border-[#e4e4e7] shadow-2xs translate-x-1"
                                : "text-[#71717a] hover:bg-[#f4f4f5] hover:text-black"
                            }`
                      }
                    >
                      <SubIcon
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isSubActive ? "text-black" : "text-[#71717a]"
                        }`}
                      />
                      {!collapsedState && (
                        <span className="truncate">{sub.name}</span>
                      )}
                    </a>
                  );
                })}
              </div>
            )}
        </div>
      );
    });
  };

  return (
    <>
      {/* --- MOBILE VIEW: HEADER BAR & MENU TOGGLE --- */}
      <div className="md:hidden flex items-center justify-between w-full h-16 px-4 bg-white border-b border-[#e4e4e7] sticky top-0 z-30 font-sans">
        <span className="font-bold text-black text-base tracking-tight">
          Personal Tracker
        </span>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 rounded-md bg-[#f4f4f5] border border-[#e4e4e7] text-[#71717a] hover:text-black transition-colors"
          title="Toggle Menu"
        >
          {isMobileOpen ? (
            <X width={20} height={20} />
          ) : (
            <Menu width={20} height={20} />
          )}
        </button>
      </div>

      {/* MOBILE DRAWER OVERLAY */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* MOBILE DRAWER SIDEBAR */}
      <aside
        className={`md:hidden fixed top-0 left-0 bottom-0 z-50 bg-white w-68 flex flex-col h-full border-r border-[#e4e4e7] font-sans transition-transform duration-300 ease-in-out transform ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 border-b border-[#e4e4e7] flex items-center justify-between px-5">
          <span className="font-bold text-black text-base tracking-tight">
            Personal Tracker
          </span>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-2 rounded-md bg-[#f4f4f5] text-[#71717a] border border-[#e4e4e7]"
          >
            <X width={17} height={17} />
          </button>
        </div>
        <nav className="flex-1 py-6 px-3 space-y-3 overflow-y-auto">
          {renderNavLinks(false, () => setIsMobileOpen(false))}
        </nav>
        <div className="p-4 border-t border-[#e4e4e7]">
          <button
            onClick={() => {
              setIsMobileOpen(false);
              handleLogout();
            }}
            className="flex items-center gap-2.5 rounded-md text-black text-sm font-semibold py-2.5 px-3.5 w-full transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0 text-[#71717a]" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* --- DESKTOP VIEW: STANDARD COLLAPSIBLE SIDEBAR --- */}
      <aside
        className={`hidden md:flex flex-col shrink-0 h-screen sticky top-0 select-none z-20 font-sans transition-all duration-300 ease-in-out bg-white border-r border-[#e4e4e7] ${
          isCollapsed ? "w-15" : "w-68"
        }`}
      >
        {/* Desktop Header */}
        <div
          className={`h-16 border-b border-[#e4e4e7] flex items-center ${
            isCollapsed ? "justify-center px-0" : "justify-between px-5"
          }`}
        >
          {!isCollapsed && (
            <div className="flex items-center gap-3 overflow-hidden">
              <span className="font-bold text-black text-base tracking-tight truncate">
                Personal Tracker
              </span>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="p-2 rounded-md bg-[#f4f4f5] hover:bg-[#e4e4e7] text-[#71717a] hover:text-black transition-colors cursor-pointer border border-[#e4e4e7] flex items-center justify-center"
          >
            <PanelRight width={17} height={17} />
          </button>
        </div>

        {/* Desktop Navigation Links */}
        <nav
          className={`flex-1 py-6 space-y-3 overflow-y-auto ${
            isCollapsed ? "px-2 flex flex-col items-center" : "px-3"
          }`}
        >
          {renderNavLinks(isCollapsed)}
        </nav>

        {/* Desktop Footer */}
        <div
          className={`p-4 border-t border-[#e4e4e7] ${isCollapsed ? "flex justify-center px-2" : ""}`}
        >
          <button
            onClick={handleLogout}
            title="Sign Out"
            className={`flex items-center gap-2.5 rounded-md text-black text-sm font-semibold transition-colors cursor-pointer ${
              isCollapsed
                ? "justify-center w-11 h-11 px-0"
                : "py-2.5 px-3.5 w-full"
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0 text-[#71717a]" />
            {!isCollapsed && <span>Log Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
