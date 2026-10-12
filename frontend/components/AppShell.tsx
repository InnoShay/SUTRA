"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSkillHub } from "@/lib/store";
import { SkillHubLogo, SkillHubLogoIcon } from "./SkillHubLogo";
import { NewCourseModal } from "./NewCourseModal";
import { CreatePostModal } from "./CreatePostModal";
import { StudentProfileModal } from "./StudentProfileModal";
import { GlobalSearchModal } from "./GlobalSearchModal";
import { NotificationPopover, MessagesDrawer } from "./TopBarActionDrawers";
import { UserAvatar } from "./UserAvatar";
import { AccountDialog } from "./AccountDialog";
import {
  LayoutGrid,
  Bookmark,
  GraduationCap,
  Users,
  BarChart2,
  Settings,
  HelpCircle,
  LogOut,
  Search,
  MessageSquare,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  ChevronDown,
  Check,
  FileText,
  HeartHandshake,
  MessageCircle,
} from "lucide-react";
import { DEMO_PERSONAS } from "@/lib/demo-auth";
import { UserRole } from "@/lib/types";
import { useLanguage } from "@/lib/language-context";
import { LanguageSelector } from "./LanguageSelector";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const {
    user,
    activeRole,
    setActiveRole,
    authorizedRoles,
    currentPersona,
    backendConnected,
    setIsSearchOpen,
    isNotificationOpen,
    setIsNotificationOpen,
    isMessagesOpen,
    setIsMessagesOpen,
    notifications,
    supabaseSession,
    isAuthenticated,
    logout,
  } = useSkillHub();

  const handleLogout = async () => {
    await logout();
  };

  const unreadNotifCount = notifications.filter((n) => n.unread).length;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        roleDropdownRef.current &&
        !roleDropdownRef.current.contains(event.target as Node)
      ) {
        setIsRoleDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const ROLE_CONFIG: Record<string, { label: string; short: string }> = {
    faculty: { label: "Teacher / Faculty", short: "Faculty" },
    student: { label: "Student", short: "Student" },
    admin: { label: "Admin", short: "Admin" },
  };

  const availableRoleOptions = (
    authorizedRoles && authorizedRoles.length > 0
      ? authorizedRoles
      : (["faculty", "student", "admin"] as UserRole[])
  ).filter((r) => Boolean(ROLE_CONFIG[r]));

  const handleRoleSelect = (role: UserRole) => {
    setIsRoleDropdownOpen(false);
    if (authorizedRoles.length > 0 && !authorizedRoles.includes(role)) {
      console.warn(`[SUTRA Auth] Unauthorized role selection rejected: ${role}`);
      return;
    }
    if (role === activeRole) return;
    setActiveRole(role);
    if (pathname !== "/dashboard") {
      router.push("/dashboard");
    }
  };

  // If on landing page (/) or login page (/login), render clean full-width view without dashboard shell chrome
  if (pathname === "/login" || pathname === "/") {
    return <>{children}</>;
  }

  const isStudent = activeRole === "student";
  const isAdmin = activeRole === "admin" || activeRole === "superadmin";

  // Standardized navigation definitions: Teacher-centric with legacy compatibility aliases
  // Audited labels: Overview, Interventions & Protocols, Student Directory, Case Management, Institutional Analytics
  const studentNavItems = [
    {
      name: t("nav.dashboard", "Overview"),
      shortName: t("nav.dashboard_short", "Overview"),
      href: "/dashboard",
      icon: LayoutGrid,
    },
    {
      name: t("nav.my_cases", "My Cases"),
      shortName: t("nav.my_cases_short", "Cases"),
      href: "/cases",
      icon: FileText,
    },
    {
      name: t("nav.request_support", "Request Support"),
      shortName: t("nav.request_support_short", "Support"),
      href: "/request-support",
      icon: HeartHandshake,
    },
    {
      name: t("nav.messages", "Messages"),
      shortName: t("nav.messages_short", "Messages"),
      href: "/messages",
      icon: MessageCircle,
    },
  ];

  const teacherNavItems = [
    {
      name: t("nav.dashboard", "Overview"),
      shortName: t("nav.dashboard_short", "Overview"),
      href: "/dashboard",
      icon: LayoutGrid,
    },
    {
      name: t("nav.my_cases", "My Cases"),
      shortName: t("nav.community_short", "Case Management"),
      href: "/cases",
      icon: FileText,
    },
    {
      name: t("nav.students", "Student Directory"),
      shortName: t("nav.students_short", "Students"),
      href: "/students",
      icon: GraduationCap,
    },
    {
      name: t("nav.courses", "Interventions & Protocols"),
      shortName: t("nav.courses_short", "Protocols"),
      href: "/courses",
      icon: Bookmark,
    },
  ];

  const adminNavItems = [
    {
      name: t("nav.dashboard", "Overview"),
      shortName: t("nav.dashboard_short", "Overview"),
      href: "/dashboard",
      icon: LayoutGrid,
    },
    {
      name: t("nav.my_cases", "Case Management"),
      shortName: t("nav.community_short", "Case Management"),
      href: "/cases",
      icon: FileText,
    },
    {
      name: t("nav.students", "Student Directory"),
      shortName: t("nav.students_short", "Students"),
      href: "/students",
      icon: GraduationCap,
    },
    {
      name: t("nav.courses", "Interventions & Protocols"),
      shortName: t("nav.courses_short", "Protocols"),
      href: "/courses",
      icon: Bookmark,
    },
    {
      name: t("nav.analytics", "Institutional Analytics"),
      shortName: t("nav.analytics_short", "Analytics"),
      href: "/analytics",
      icon: BarChart2,
    },
  ];

  const mainNavItems = isStudent
    ? studentNavItems
    : isAdmin
    ? adminNavItems
    : teacherNavItems;

  const othersNavItems = [
    { name: t("nav.settings", "Settings"), href: "/settings", icon: Settings },
    { name: t("nav.help", "Help & Support"), href: "/help", icon: HelpCircle },
    { name: t("nav.logout", "Sign Out"), href: "/login", icon: LogOut },
  ];

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen bg-[#ECEFF3] flex flex-col md:flex-row overflow-x-hidden md:overflow-hidden selection:bg-neutral-900 selection:text-white">
      {/* 0. MOBILE TOP APP BAR (Apple-inspired header for viewports < 768px) */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-3 py-2 bg-[#ECEFF3]/95 backdrop-blur-md border-b border-neutral-200/50">
        <div className="flex items-center gap-2">
          <SkillHubLogo />
        </div>

        <div className="flex items-center gap-1.5">
          {/* Indic Language Selector */}
          <LanguageSelector />

          {/* Messages Action */}
          <button
            onClick={() => setIsMessagesOpen(!isMessagesOpen)}
            className="relative p-2 hover:bg-white/80 active:bg-white rounded-xl text-neutral-600 hover:text-neutral-900 transition-colors"
            title="Messages"
            aria-label="Messages"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-neutral-900 rounded-full ring-2 ring-[#ECEFF3]" />
          </button>

          {/* Notifications Action */}
          <button
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            className="relative p-2 hover:bg-white/80 active:bg-white rounded-xl text-neutral-600 hover:text-neutral-900 transition-colors"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-[#ECEFF3]" />
            )}
          </button>

          {/* User Profile & Account Action */}
          <button
            onClick={() => setIsAccountDialogOpen(true)}
            className="p-1 pl-1 cursor-pointer transition-transform active:scale-95"
            title="Open Account Menu"
            aria-label="Open Account Menu"
          >
            <UserAvatar
              src={user.avatar}
              name={user.fullName || user.name}
              size="sm"
              className="w-7 h-7 ring-2 ring-white shadow-xs"
            />
          </button>
        </div>
      </header>

      {/* 1. LEFT SIDEBAR: At the back on canvas base (hidden on mobile, compact on tablet, full on desktop) */}
      <aside
        className={`hidden md:flex flex-col justify-between py-6 transition-all duration-300 ease-in-out flex-shrink-0 z-20 ${sidebarCollapsed
          ? "w-16 lg:w-20 px-2 lg:px-3"
          : "w-16 lg:w-64 px-2 lg:pl-6 lg:pr-4"
          }`}
      >
        <div className="flex-1 flex flex-col min-h-0">
          {/* Logo & Collapse Header */}
          <div
            className={`flex items-center pb-7 ${sidebarCollapsed
              ? "flex-col gap-4 justify-center"
              : "justify-center lg:justify-between px-1"
              }`}
          >
            {/* Tablet / Collapsed Logo Icon */}
            <div className="lg:hidden flex items-center justify-center">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="w-10 h-10 flex items-center justify-center text-neutral-900 hover:text-neutral-700 transition-colors"
                title="Sutra"
              >
                <SkillHubLogoIcon className="w-6 h-6" color="currentColor" />
              </button>
            </div>

            {/* Desktop Full Logo */}
            <div className="hidden lg:flex items-center">
              {sidebarCollapsed ? (
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="w-10 h-10 flex items-center justify-center text-neutral-900 hover:text-neutral-700 transition-colors"
                  title="Expand Sidebar"
                >
                  <SkillHubLogoIcon className="w-6 h-6" color="currentColor" />
                </button>
              ) : (
                <SkillHubLogo />
              )}
            </div>

            {/* Desktop Collapse Button */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex p-1.5 hover:bg-neutral-200/50 rounded-xl text-neutral-400 hover:text-neutral-700 transition-colors items-center justify-center"
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Navigation Section: Scrollable middle area */}
          <div className="flex-1 overflow-y-auto space-y-6 pr-0.5">
            {/* Main Navigation Group */}
            <div>
              {!sidebarCollapsed && (
                <span className="hidden lg:block text-[11px] font-semibold text-neutral-400 mb-2 px-3.5">
                  Main
                </span>
              )}
              {sidebarCollapsed && (
                <div className="w-8 h-px bg-neutral-200/80 mx-auto my-2" />
              )}

              <nav className="space-y-1.5">
                {mainNavItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href === "/dashboard" && pathname === "/");

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group relative flex items-center transition-all duration-150 ${sidebarCollapsed
                        ? "w-11 h-11 justify-center mx-auto rounded-2xl"
                        : "justify-center lg:justify-start w-11 h-11 lg:w-auto lg:h-auto lg:gap-3 px-0 lg:px-3.5 py-2.5 rounded-2xl text-xs"
                        } ${isActive
                          ? "bg-white text-neutral-900 font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-neutral-200/50"
                          : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/40 font-medium"
                        }`}
                    >
                      <item.icon
                        className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-105 ${isActive
                          ? "text-neutral-900"
                          : "text-neutral-400 group-hover:text-neutral-600"
                          }`}
                      />
                      {!sidebarCollapsed && (
                        <span className="hidden lg:inline">{item.name}</span>
                      )}

                      {/* Tooltip on collapsed / tablet hover */}
                      <div className="lg:hidden absolute left-full ml-3 px-2.5 py-1 bg-neutral-900 text-white text-[11px] font-semibold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
                        {item.name}
                      </div>
                      {sidebarCollapsed && (
                        <div className="hidden lg:block absolute left-full ml-3 px-2.5 py-1 bg-neutral-900 text-white text-[11px] font-semibold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
                          {item.name}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Others Navigation Group */}
            <div>
              {!sidebarCollapsed && (
                <span className="hidden lg:block text-[11px] font-semibold text-neutral-400 mb-2 px-3.5">
                  Others
                </span>
              )}
              {sidebarCollapsed && (
                <div className="w-8 h-px bg-neutral-200/80 mx-auto my-2" />
              )}

              <nav className="space-y-1.5">
                {othersNavItems.map((item) => {
                  const isActive = pathname === item.href;

                  if (item.name === "Logout") {
                    return (
                      <button
                        key="logout-desktop"
                        type="button"
                        onClick={handleLogout}
                        className={`group relative flex items-center transition-all duration-150 w-full cursor-pointer ${
                          sidebarCollapsed
                            ? "w-11 h-11 justify-center mx-auto rounded-2xl"
                            : "justify-center lg:justify-start w-11 h-11 lg:w-auto lg:h-auto lg:gap-3 px-0 lg:px-3.5 py-2.5 rounded-2xl text-xs"
                        } text-rose-600 hover:text-rose-700 hover:bg-rose-50/80 font-medium`}
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-105 text-rose-500" />
                        {!sidebarCollapsed && (
                          <span className="hidden lg:inline font-semibold">Sign Out</span>
                        )}
                        {/* Tooltip on collapsed / tablet hover */}
                        <div className="lg:hidden absolute left-full ml-3 px-2.5 py-1 bg-neutral-900 text-white text-[11px] font-semibold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
                          Sign Out
                        </div>
                        {sidebarCollapsed && (
                          <div className="hidden lg:block absolute left-full ml-3 px-2.5 py-1 bg-neutral-900 text-white text-[11px] font-semibold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
                            Sign Out
                          </div>
                        )}
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group relative flex items-center transition-all duration-150 ${sidebarCollapsed
                        ? "w-11 h-11 justify-center mx-auto rounded-2xl"
                        : "justify-center lg:justify-start w-11 h-11 lg:w-auto lg:h-auto lg:gap-3 px-0 lg:px-3.5 py-2.5 rounded-2xl text-xs"
                        } ${isActive
                          ? "bg-white text-neutral-900 font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-neutral-200/50"
                          : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/40 font-medium"
                        }`}
                    >
                      <item.icon
                        className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-105 ${isActive
                          ? "text-neutral-900"
                          : "text-neutral-400 group-hover:text-neutral-600"
                          }`}
                      />
                      {!sidebarCollapsed && (
                        <span className="hidden lg:inline">{item.name}</span>
                      )}

                      {/* Tooltip on collapsed / tablet hover */}
                      <div className="lg:hidden absolute left-full ml-3 px-2.5 py-1 bg-neutral-900 text-white text-[11px] font-semibold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
                        {item.name}
                      </div>
                      {sidebarCollapsed && (
                        <div className="hidden lg:block absolute left-full ml-3 px-2.5 py-1 bg-neutral-900 text-white text-[11px] font-semibold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
                          {item.name}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        {/* Bottom User Profile Section */}
        <div className="pt-4 border-t border-neutral-200/60 flex-shrink-0 space-y-2">
          {!sidebarCollapsed && (
            <div className="px-2 hidden lg:block">
              <LanguageSelector />
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsAccountDialogOpen(true)}
            className={`group w-full flex items-center transition-all duration-150 rounded-2xl hover:bg-neutral-200/40 cursor-pointer ${sidebarCollapsed
              ? "justify-center p-2 mx-auto"
              : "justify-center lg:justify-start p-2 lg:px-3 lg:py-2.5 lg:gap-3"
              }`}
            title="Account details and settings"
            aria-label="Open Account Dialog"
          >
            <UserAvatar
              src={user.avatar}
              name={user.fullName || user.name}
              size="md"
              className="w-9 h-9"
            />
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1 hidden lg:block text-left">
                <p className="text-xs font-semibold text-neutral-900 truncate group-hover:text-neutral-950">
                  {user.fullName || user.name || "Educator"}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      supabaseSession ? "bg-emerald-500 animate-pulse" : "bg-neutral-400"
                    }`}
                  />
                  <p className="text-[10px] text-neutral-400 truncate font-medium">
                    Account &amp; Settings
                  </p>
                </div>
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* 2. MAIN CONTENT BLOCK: Solid White Card overlayed on the navbar layer */}
      <div className="flex-1 min-w-0 p-2 sm:p-3 md:p-3 lg:p-5 md:pl-0 flex flex-col h-full max-w-[1920px] mx-auto w-full">
        <main className="floating-window flex-1 min-w-0 flex flex-col p-4 sm:p-6 lg:p-9 rounded-2xl sm:rounded-3xl lg:rounded-[32px] relative overflow-y-auto">
          {/* Dedicated Floating Window Top Bar: visible on desktop/tablet */}
          <div className="hidden md:flex items-center justify-between gap-4 mb-7 pb-2">
            {/* Quick Search Pill Input */}
            <div className="flex items-center gap-2.5 px-4 py-2 bg-[#F8F9FA] hover:bg-white focus-within:bg-white border border-neutral-200/70 focus-within:border-neutral-400 focus-within:ring-2 focus-within:ring-neutral-900/5 rounded-full w-full max-w-sm shadow-2xs transition-all">
              <Search className="w-4 h-4 text-neutral-400 shrink-0" />
              <input
                type="text"
                placeholder={t("action.search", "Search...")}
                className="w-full bg-transparent text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
              />
            </div>

            {/* Actions: Single Role Dropdown + Messages + Notifications + Profile Avatar */}
            <div className="flex items-center gap-2.5">
              {/* Single Role-Switching Dropdown */}
              <div ref={roleDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                  className="flex items-center gap-2 px-3.5 py-1.5 bg-[#F8F9FA] hover:bg-neutral-100 border border-neutral-200/70 rounded-full text-xs font-semibold text-neutral-800 shadow-2xs transition-all cursor-pointer"
                  aria-expanded={isRoleDropdownOpen}
                  aria-haspopup="listbox"
                  title="Switch active role"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Role: {ROLE_CONFIG[activeRole]?.short || activeRole}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-neutral-500 transition-transform duration-150 ${
                      isRoleDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isRoleDropdownOpen && (
                  <div
                    role="listbox"
                    className="absolute right-0 mt-2 w-48 bg-white border border-neutral-200/80 rounded-2xl shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                  >
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      Authorized Roles
                    </div>
                    {availableRoleOptions.map((roleKey) => {
                      const isSelected = activeRole === roleKey;
                      const config = ROLE_CONFIG[roleKey];
                      return (
                        <button
                          key={roleKey}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleRoleSelect(roleKey)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-neutral-100 font-bold text-neutral-900"
                              : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 font-medium"
                          }`}
                        >
                          <span>{config?.label || roleKey}</span>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-neutral-900 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Messages Trigger */}
              <button
                onClick={() => setIsMessagesOpen(!isMessagesOpen)}
                className="relative p-2.5 bg-[#F8F9FA] hover:bg-[#F1F3F6] border border-neutral-200/70 rounded-2xl text-neutral-600 hover:text-neutral-900 shadow-sm transition-all"
                title="Messages"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-neutral-900 rounded-full ring-2 ring-white" />
              </button>

              {/* Notifications Trigger */}
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="relative p-2.5 bg-[#F8F9FA] hover:bg-[#F1F3F6] border border-neutral-200/70 rounded-2xl text-neutral-600 hover:text-neutral-900 shadow-sm transition-all"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white" />
                )}
              </button>

              {/* Profile Avatar / Account Dialog Trigger */}
              <button
                type="button"
                onClick={() => setIsAccountDialogOpen(true)}
                className="flex items-center gap-2 pl-1 cursor-pointer group"
                title={`${user.fullName || currentPersona.name} (${user.role || currentPersona.title})`}
                aria-label="Open Account Dialog"
              >
                <UserAvatar
                  src={user.avatar || currentPersona.avatar}
                  name={user.fullName || currentPersona.name}
                  size="md"
                  className="w-10 h-10 ring-2 ring-neutral-100 group-hover:ring-neutral-300 shadow-sm transition-all"
                />
              </button>
            </div>
          </div>

          {/* Floating Window Core Dynamic Page Content */}
          <div className="flex-1 pb-20 md:pb-0">{children}</div>
        </main>
      </div>

      {/* 3. MOBILE BOTTOM NAVIGATION DOCK (Apple-inspired Tab Bar for viewports < 768px) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-neutral-200/60 px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
      >
        <div
          className={`grid ${
            mainNavItems.length === 5 ? "grid-cols-5" : "grid-cols-4"
          } items-center justify-around max-w-md mx-auto`}
        >
          {mainNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === "/dashboard" && pathname === "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 min-h-[44px] ${isActive
                  ? "text-neutral-950 font-bold"
                  : "text-neutral-400 hover:text-neutral-700 font-medium"
                  }`}
              >
                <div
                  className={`p-1.5 rounded-xl transition-colors ${isActive ? "bg-neutral-100 text-neutral-950 shadow-2xs" : ""
                    }`}
                >
                  <item.icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[64px]">
                  {(item as any).shortName || item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* 4. MOBILE ACCOUNT & SECONDARY MENU SHEET (Apple-style Action Sheet) */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/35 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="w-full bg-white rounded-t-[28px] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl border-t border-neutral-200/50 space-y-4 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle */}
            <div className="w-10 h-1 bg-neutral-200 rounded-full mx-auto" />

            {/* User Profile Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <UserAvatar
                  src={user.avatar}
                  name={user.fullName || user.name}
                  size="lg"
                  className="w-11 h-11 ring-2 ring-neutral-100 shadow-sm"
                />
                <div>
                  <h4 className="text-sm font-bold text-neutral-900">
                    {user.fullName}
                  </h4>
                  <p className="text-xs text-neutral-400 font-medium">
                    Instructor • Sutra
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Secondary Navigation Links */}
            <div className="space-y-1 pt-1">
              {othersNavItems.map((item) => {
                if (item.name === "Logout") {
                  return (
                    <button
                      key="logout-mobile"
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 active:bg-rose-100 transition-colors cursor-pointer"
                    >
                      <item.icon className="w-4 h-4 text-rose-500" />
                      <span>Sign Out</span>
                    </button>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 active:bg-neutral-100 transition-colors"
                  >
                    <item.icon className="w-4 h-4 text-neutral-500" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Global Interactive Modals & Slide-over Drawers */}
      <NewCourseModal />
      <CreatePostModal />
      <StudentProfileModal />
      <GlobalSearchModal />
      <NotificationPopover />
      <MessagesDrawer />
      <AccountDialog
        isOpen={isAccountDialogOpen}
        onClose={() => setIsAccountDialogOpen(false)}
      />
    </div>
  );
}
