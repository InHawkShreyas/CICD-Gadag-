/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { MenuItem } from "./layoutConfig";

interface SidebarProps {
  menuItems: MenuItem[];
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

export default function Sidebar({
  menuItems,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(isCollapsed);

  // Toggle Sidebar
  const handleToggleCollapse = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    onToggleCollapse?.(newCollapsed);
  };

  // Active Route - match exact path or exact match
  const isActive = (path: string) => {
    const currentPath = location.pathname;
    // Exact match or match with trailing slash
    return currentPath === path || currentPath === `${path}/`;
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <div
      className={`bg-secondary text-white h-screen flex flex-col transition-all duration-300 ${
        collapsed ? "w-20" : "w-64"
      } fixed left-0 top-0 shadow-lg z-40`}
    >
      {/* 🔥 HEADER */}
      <div className="p-4 flex items-center justify-between border-b border-secondary-dark">
        {!collapsed && (
          <div className="flex items-center gap-3">
            {/* LOGO */}
            <img
              src="/logo2.png"
              alt="Logo"
              className="w-10 h-10 object-contain"
            />

            <span className="font-bold text-base tracking-wide">
              MGRDPR
            </span>
          </div>
        )}

        {/* Collapse Button */}
        <button
          onClick={handleToggleCollapse}
          className="p-1.5 hover:bg-secondary-dark rounded-lg transition-colors"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* 🔥 MENU */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-2">
        {menuItems.map((item) => {
          const isItemActive = isActive(item.path);
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.path)}
              className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200 text-sm font-medium group ${
                isItemActive
                  ? "bg-accent text-secondary shadow-md"
                  : "text-white hover:bg-secondary-dark"
              }`}
            >
              {/* LEFT */}
              <div className="flex items-center gap-3">
                <Icon size={20} className="flex-shrink-0" />

                {!collapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </div>

              {/* BADGE (optional safe check) */}
              {!collapsed && (item as any).badge && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {(item as any).badge > 99
                    ? "99+"
                    : (item as any).badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* 🔥 FOOTER */}
      <div className="p-3 border-t border-secondary-dark">
        <button
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("username");
            navigate("/login");
          }}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-white hover:bg-red-600 transition-colors text-sm font-medium"
        >
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>

          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}