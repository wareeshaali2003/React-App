import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu, Bell, GraduationCap } from "lucide-react";

import { useEmployee } from "../hooks/useEmployee";
import apiClient, { api } from "../services/api";
import { sidebarConfig, getIcon, isNavItemVisible } from "../config/layout.config";
import { NotificationDropdown } from "./NotificationDropdown";
import { getInitials } from "../utils/helpers";

interface LayoutProps {
  children: React.ReactNode;
}

const SidebarLink: React.FC<{
  to: string;
  iconName: string;
  label: string;
  active: boolean;
  onClick?: () => void;
}> = ({ to, iconName, label, active, onClick }) => {
  const Icon = getIcon(iconName);
  return (
    <li>
      <Link
        to={to}
        onClick={onClick}
        className={`flex items-center px-5 py-3 mx-2 rounded-xl font-medium transition-all ${
          active
            ? "bg-white text-green-700 font-bold shadow-sm"
            : "text-green-100 hover:bg-green-600 hover:text-white"
        }`}
      >
        <span className={`mr-3 ${active ? "text-green-600" : "text-green-300"}`}>
          <Icon size={20} />
        </span>
        {label}
      </Link>
    </li>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isNotificationsOpen, setNotificationsOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const { employee, loading } = useEmployee();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isNotificationsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!notifRef.current?.contains(e.target as Node)) setNotificationsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNotificationsOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [isNotificationsOpen]);

  const employeeName =
    employee?.employee_name ||
    employee?.full_name ||
    employee?.first_name ||
    (loading ? "Loading..." : "Guest");

  const employeeRole = employee?.designation || "";

  const employeeAvatar =
    employee?.avatar ||
    employee?.user_image ||
    employee?.image ||
    "";

  const employeeInitials = getInitials(employeeName);

  // ── Only show sidebar items that are:
  //    1. NOT dashboardOnly
  //    2. Visible for this designation
  const visibleSidebarItems = useMemo(() => {
    return sidebarConfig.filter(
      (item) => !item.dashboardOnly && isNavItemVisible(item, employeeRole)
    );
  }, [employeeRole]);

  const pageTitle = useMemo(() => {
    return sidebarConfig.find((i) => i.to === location.pathname)?.label || "Portal";
  }, [location.pathname]);

  const toggleSidebar = () => setSidebarOpen((v) => !v);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    } finally {
      window.location.href = "/login?redirect-to=/ess";
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-green-700 text-white
          transform transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="h-full flex flex-col">

          {/* ── Logo area ── */}
          <div className="bg-green-800 px-6 py-5 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="text-white" size={22} />
            </div>
            <div>
              <div className="font-black text-white text-base leading-tight">
                Learn School
              </div>
              <div className="text-green-300 text-xs font-medium">
                International Academy
              </div>
            </div>
          </div>

          {/* ── Nav links ── */}
          <nav className="mt-3 flex-grow overflow-y-auto">
            <ul className="space-y-0.5 py-2">
              {visibleSidebarItems.map((item) => (
                <SidebarLink
                  key={item.to}
                  to={item.to}
                  label={item.label}
                  iconName={item.iconName}
                  active={location.pathname === item.to}
                  onClick={() => setSidebarOpen(false)}
                />
              ))}
            </ul>
          </nav>

          {/* ── Footer — user info + logout ── */}
          <div className="bg-green-800 px-4 py-3 mt-auto">
            <p className="text-[10px] text-green-400 uppercase tracking-widest font-bold mb-2">
              Session
            </p>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {employeeAvatar ? (
                  <img
                    src={employeeAvatar}
                    alt="avatar"
                    className="w-8 h-8 rounded-full object-cover border-2 border-green-500 flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-green-600 border-2 border-green-500 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                    {employeeInitials}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-white font-bold text-sm truncate">{employeeName}</p>
                  {employeeRole && (
                    <p className="text-green-300 text-[10px] uppercase tracking-wide truncate">
                      {employeeRole}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="text-green-300 hover:text-white transition-colors p-1.5 hover:bg-green-700 rounded-lg flex-shrink-0"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col min-w-0">

        {/* ── Header ── */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 md:px-8 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center">
            <button
              type="button"
              className="p-2 mr-4 md:hidden text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={toggleSidebar}
            >
              <Menu size={24} />
            </button>
            <h1 className="text-lg md:text-xl font-bold text-gray-700">{pageTitle}</h1>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotificationsOpen((v) => !v)}
                className={`p-2 rounded-xl transition-all relative ${
                  isNotificationsOpen
                    ? "bg-green-50 text-green-700 ring-2 ring-green-200"
                    : "text-gray-500 hover:text-green-700 hover:bg-green-50"
                }`}
                aria-label="Notifications"
              >
                <Bell size={22} />
                <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold border-2 border-white">
                  2
                </span>
              </button>
              <NotificationDropdown
                isOpen={isNotificationsOpen}
                onClose={() => setNotificationsOpen(false)}
              />
            </div>

            <div className="h-8 w-px bg-gray-200 hidden sm:block" />

            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="flex items-center space-x-3 group px-2 py-1.5 rounded-xl hover:bg-green-50 transition-colors"
              title="Profile"
            >
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-gray-800 group-hover:text-green-700 transition-colors line-clamp-1">
                  {employeeName}
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">
                  {employeeRole}
                </div>
              </div>

              {employeeAvatar ? (
                <img
                  src={employeeAvatar}
                  alt="Profile"
                  className="w-10 h-10 rounded-full border-2 border-green-400 shadow-sm object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-green-600 text-white border-2 border-green-400 flex items-center justify-center font-black text-sm group-hover:scale-105 transition-transform">
                  {employeeInitials}
                </div>
              )}
            </button>
          </div>
        </header>

        {/* ── Page content ── */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto w-full animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
};