import { Bell, Settings, ChevronDown, LogOut, Menu, FileText, X, Download } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getNotifications, downloadNotificationFile, type Notification } from "../../services/notificationService";
import { useAuth } from "../../context/AuthContext";

interface HeaderProps {
  title?: string;
  userName?: string;
  userRole?: string;
  onMenuClick?: () => void;
  sidebarCollapsed?: boolean;
}

export default function Header({
  title = "Dashboard",
  userName = "John Doe",
  userRole = "Student",
  onMenuClick,
  sidebarCollapsed = false,
}: HeaderProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    getNotifications().then(setNotifications).catch(console.error);
  }, []);

  /* Close notification panel on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
    <header
      className={`bg-white shadow-sm border-b border-gray-200 transition-all duration-300 ${
        sidebarCollapsed ? "ml-0 md:ml-20" : "ml-0 md:ml-64"
      } fixed right-0 top-0 left-0 h-16 z-30`}
    >
      <div className="flex items-center justify-between h-full px-3 md:px-6">

        {/* LEFT SECTION */}
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 transition-colors rounded-lg md:hidden hover:bg-gray-100"
          >
            <Menu size={22} className="text-text" />
          </button>
          <div>
            <h1 className="text-lg font-bold md:text-2xl text-primary">{title}</h1>
            <p className="hidden text-xs md:block text-secondary">MGRDPR University Portal</p>
          </div>
        </div>

        {/* RIGHT SECTION */}
        <div className="flex items-center gap-2 md:gap-4">

          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications((prev) => !prev)}
              className="relative p-2 transition-colors rounded-lg hover:bg-gray-100"
            >
              <Bell className="w-5 h-5 text-text" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold px-0.5">
                  {notifications.length > 99 ? "99+" : notifications.length}
                </span>
              )}
            </button>

            {/* Dropdown panel */}
            {showNotifications && (
              <div className="absolute right-0 z-50 mt-2 overflow-hidden bg-white border border-gray-200 shadow-xl w-80 rounded-xl">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                  <p className="text-sm font-semibold text-text">
                    Notifications
                    {notifications.length > 0 && (
                      <span className="ml-2 bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                        {notifications.length}
                      </span>
                    )}
                  </p>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-gray-400 transition-colors hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* List */}
                <div className="overflow-y-auto divide-y divide-gray-100 max-h-80">
                  {notifications.length === 0 ? (
                    <div className="py-10 text-sm text-center text-gray-400">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-gray-50">
                        <p className="text-sm font-semibold truncate text-text">{n.title}</p>
                        <button
                          onClick={() => { setShowNotifications(false); setSelectedNotification(n); }}
                          className="text-xs font-medium shrink-0 text-primary hover:underline"
                        >
                          Learn more
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Settings */}
          <button className="relative hidden p-2 transition-colors rounded-lg sm:block hover:bg-gray-100 group">
            <Settings size={18} className="text-text" />
            <span className="absolute right-0 px-2 py-1 text-xs text-white transition-opacity bg-gray-800 rounded opacity-0 pointer-events-none top-10 group-hover:opacity-100">
              Settings
            </span>
          </button>

          <div className="hidden w-px h-6 bg-gray-200 md:block"></div>

          {/* PROFILE */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 px-2 py-2 transition-colors rounded-lg md:px-3 hover:bg-gray-100"
            >
              <div className="flex items-center justify-center w-8 h-8 text-xs font-bold text-white rounded-full md:w-9 md:h-9 bg-gradient-to-br from-secondary to-primary md:text-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden text-left md:block">
                <p className="text-sm font-semibold text-text">{userName}</p>
                <p className="text-xs text-secondary">{userRole}</p>
              </div>
              <ChevronDown
                size={16}
                className={`hidden md:block text-secondary transition-transform ${showProfileMenu ? "rotate-180" : ""}`}
              />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 z-50 py-2 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg w-44 md:w-48">
                <div className="px-4 py-2 border-b md:hidden">
                  <p className="text-sm font-semibold">{userName}</p>
                  <p className="text-xs text-gray-500">{userRole}</p>
                </div>
                <button onClick={handleLogout} className="flex items-center w-full gap-3 px-4 py-2 text-sm text-left text-red-600 transition-colors hover:bg-red-50">
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>

    {/* Notification Detail Modal */}
    {selectedNotification && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => setSelectedNotification(null)}
        />

        {/* Panel */}
        <div className="relative w-full max-w-md p-6 space-y-4 bg-white shadow-2xl rounded-xl">
          {/* Close */}
          <button
            onClick={() => setSelectedNotification(null)}
            className="absolute text-gray-400 transition-colors top-4 right-4 hover:text-gray-600"
          >
            <X size={18} />
          </button>

          {/* Title */}
          <h2 className="pr-6 text-base font-bold text-text">{selectedNotification.title}</h2>

          {/* Date */}
          {selectedNotification.date && (
            <p className="text-xs text-gray-400">{selectedNotification.date}</p>
          )}

          {/* Description */}
          {selectedNotification.description && (
            <p className="text-sm leading-relaxed text-gray-600">{selectedNotification.description}</p>
          )}

          {/* File download */}
          {selectedNotification.fileName && (
            <div className="pt-2 border-t">
              <button
                onClick={() => downloadNotificationFile(selectedNotification.id)}
                className="flex items-center gap-2 text-sm font-medium transition-colors text-primary hover:text-primary/80"
              >
                <Download size={16} />
                <FileText size={16} />
                {selectedNotification.fileName}
              </button>
            </div>
          )}
        </div>
      </div>
    )}
    </>
  );
}