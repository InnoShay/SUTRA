"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSkillHub } from "@/lib/store";
import { isDemoMode } from "@/lib/api";
import { SkillHubLogo, SkillHubLogoIcon } from "./SkillHubLogo";
import { NewCourseModal } from "./NewCourseModal";
import { CreatePostModal } from "./CreatePostModal";
import { StudentProfileModal } from "./StudentProfileModal";
import { GlobalSearchModal } from "./GlobalSearchModal";
import { NotificationPopover, MessagesDrawer } from "./TopBarActionDrawers";
import { UserAvatar } from "./UserAvatar";
import { AccountDialog } from "./AccountDialog";
import { UserSettingsModal, SettingsTabId } from "./UserSettingsModal";
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
  Briefcase,
  Calendar,
  Sparkles,
  ShieldCheck,
  Gift,
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
  const [isPersonaMenuOpen, setIsPersonaMenuOpen] = useState(false);
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const [userSettingsTab, setUserSettingsTab] = useState<SettingsTabId>("profile");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const personaList: {
    role: UserRole;
    displayLabel: string;
    fullName: string;
    title: string;
    avatar: string;
    badge?: string;
  }[] = [
    {
      role: "faculty",
      displayLabel: "Faculty (Prof. Sharma)",
      fullName: DEMO_PERSONAS.faculty.name,
      title: DEMO_PERSONAS.faculty.title,
      avatar: DEMO_PERSONAS.faculty.avatar,
    },
    {
      role: "counselor",
      displayLabel: "Counselor (Dr. Nambiar)",
      fullName: DEMO_PERSONAS.counselor.name,
      title: DEMO_PERSONAS.counselor.title,
      avatar: DEMO_PERSONAS.counselor.avatar,
    },
    {
      role: "student",
      displayLabel: "Student (Asha)",
      fullName: DEMO_PERSONAS.student.name,
      title: DEMO_PERSONAS.student.title,
      avatar: DEMO_PERSONAS.student.avatar,
    },
    {
      role: "admin",
      displayLabel: "Administrator",
      fullName: "Administrator",
      title: DEMO_PERSONAS.admin.title,
      avatar: DEMO_PERSONAS.admin.avatar,
    },
  ];

  const currentPersonaOption =
    personaList.find((p) => p.role === activeRole) || personaList[0];

  const handleRoleSelect = (role: UserRole) => {
    setIsPersonaMenuOpen(false);
    if (role === activeRole) return;
    setActiveRole(role);
    if (pathname !== "/dashboard") {
      router.push("/dashboard");
    }
  };

  // If on landing page (/), login page (/login), or onboarding (/onboarding), render clean full-width view without dashboard shell chrome
  if (pathname === "/login" || pathname === "/" || pathname === "/onboarding") {
    return <>{children}</>;
  }

  const isStudent = activeRole === "student";
  const isAdmin = activeRole === "admin" || activeRole === "superadmin";
  const isCounselor = activeRole === "counselor";

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
      name: t("nav.internships", "Internships"),
      shortName: t("nav.internships_short", "Internships"),
      href: "/internships",
      icon: Briefcase,
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
      name: t("nav.assessment", "Assessment"),
      shortName: t("nav.assessment_short", "Assessment"),
      href: "/assessment",
      icon: Sparkles,
    },
    {
      name: t("nav.messages", "Messages"),
      shortName: t("nav.messages_short", "Messages"),
      href: "/messages",
      icon: MessageCircle,
    },
    {
      name: "Leaderboard & Rewards",
      shortName: "Rewards",
      href: "/rewards",
      icon: Gift,
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
      name: "Schedule & Calls",
      shortName: "Schedule",
      href: "/schedule",
      icon: Calendar,
    },
    {
      name: t("nav.internships", "Internships"),
      shortName: t("nav.internships_short", "Internships"),
      href: "/internships",
      icon: Briefcase,
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
    {
      name: t("nav.documents", "Document Integrity"),
      shortName: t("nav.documents_short", "Documents"),
      href: "/documents",
      icon: ShieldCheck,
    },
  ];

  const counselorNavItems = [
    {
      name: t("nav.dashboard", "Overview"),
      shortName: t("nav.dashboard_short", "Overview"),
      href: "/dashboard",
      icon: LayoutGrid,
    },
    {
      name: "Schedule & Calls",
      shortName: "Schedule",
      href: "/schedule",
      icon: Calendar,
    },
    {
      name: "Students in Need",
      shortName: "Students",
      href: "/students",
      icon: GraduationCap,
    },
    {
      name: "Support Cases",
      shortName: "Cases",
      href: "/cases",
      icon: FileText,
    },
    {
      name: "Counselor Analytics",
      shortName: "Analytics",
      href: "/counselor/analytics",
      icon: BarChart2,
    },
    {
      name: t("nav.documents", "Document Integrity"),
      shortName: t("nav.documents_short", "Documents"),
      href: "/documents",
      icon: ShieldCheck,
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
      name: "Schedule & Calls",
      shortName: "Schedule",
      href: "/schedule",
      icon: Calendar,
    },
    {
      name: t("nav.internships", "Internships"),
      shortName: t("nav.internships_short", "Internships"),
      href: "/internships",
      icon: Briefcase,
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
    {
      name: t("nav.documents", "Document Integrity"),
      shortName: t("nav.documents_short", "Documents"),
      href: "/documents",
      icon: ShieldCheck,
    },
    {
      name: "Rewards Fulfilment",
      shortName: "Rewards",
      href: "/rewards?tab=admin",
      icon: Gift,
    },
  ];

  const mainNavItems = isStudent
    ? studentNavItems
    : isCounselor
    ? counselorNavItems
    : isAdmin
    ? adminNavItems
    : teacherNavItems;

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen bg-[#ECEFF3] flex flex-col md:flex-row overflow-x-hidden md:overflow-hidden selection:bg-neutral-900 selection:text-white">
      {/* 0. MOBILE TOP APP BAR (Apple-inspired header for viewports < 768px) */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-3 py-2 bg-[#ECEFF3]/95 backdrop-blur-md border-b border-neutral-200/50">
        <div className="flex items-center gap-2">
          <SkillHubLogo />
          {mounted && isDemoMode() && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
              Demo
            </span>
          )}
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
          <div className="flex-1 overflow-y-auto space-y-4 pr-0.5">
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
        </div>

        {/* Bottom User Profile Section: Separated with a clean divider line */}
        <div className="pt-3 border-t border-neutral-300/80 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              setUserSettingsTab("profile");
              setIsUserSettingsOpen(true);
            }}
            className={`group w-full flex items-center transition-all duration-150 rounded-2xl hover:bg-neutral-200/40 cursor-pointer ${sidebarCollapsed
              ? "justify-center p-2 mx-auto"
              : "justify-center lg:justify-start p-2 lg:px-3 lg:py-2.5 lg:gap-3"
              }`}
            title="User Profile & Settings"
            aria-label="Open User Settings"
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
          <div className="hidden md:flex items-center justify-between gap-4 pb-4 mb-6 border-b border-neutral-100/90 shrink-0">
            {/* Quick Search Pill Input */}
            <div className="flex items-center gap-2.5 px-4 py-2 bg-[#F8F9FA] hover:bg-white focus-within:bg-white border border-neutral-200/70 focus-within:border-neutral-400 focus-within:ring-2 focus-within:ring-neutral-900/5 rounded-full w-full max-w-sm shadow-2xs transition-all">
              <Search className="w-4 h-4 text-neutral-400 shrink-0" />
              <input
                type="text"
                placeholder={t("action.search", "Search...")}
                className="w-full bg-transparent text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
              />
            </div>

            {/* Actions: Demo Mode Badge + Indic Language (Sarvam AI) + Persona Switcher + Messages + Notifications + Profile Avatar */}
            <div className="flex items-center gap-2.5">
              {mounted && isDemoMode() && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                  Demo Mode
                </span>
              )}
              {/* Indic Regional Language Selector (Powered by Sarvam AI) */}
              <LanguageSelector />

              {/* Persona Switcher Selector — Apple / iOS Popover */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsPersonaMenuOpen(!isPersonaMenuOpen)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 bg-[#F8F9FA] hover:bg-[#F1F3F6] active:bg-neutral-200/60 border rounded-full text-xs font-semibold text-neutral-800 shadow-2xs focus:outline-none transition-all cursor-pointer ${
                    isPersonaMenuOpen
                      ? "border-neutral-400 bg-white shadow-xs ring-2 ring-neutral-900/5"
                      : "border-neutral-200/70"
                  }`}
                  title={supabaseSession ? "Active Campus Role" : "Switch Active Persona"}
                  aria-expanded={isPersonaMenuOpen}
                  aria-haspopup="true"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
                  <span>
                    {supabaseSession
                      ? `${activeRole.charAt(0).toUpperCase() + activeRole.slice(1)} (${user.name || user.fullName || "User"})`
                      : currentPersonaOption.displayLabel}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${
                      isPersonaMenuOpen ? "rotate-180 text-neutral-800" : ""
                    }`}
                  />
                </button>

                {isPersonaMenuOpen && (
                  <>
                    {/* Invisible backdrop to dismiss on click outside */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsPersonaMenuOpen(false)}
                    />

                    {/* Apple / iOS-style Floating Glass Menu */}
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white/95 backdrop-blur-xl border border-neutral-200/80 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.04)] p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                      {/* iOS Group Header */}
                      <div className="px-3 py-2 border-b border-neutral-100 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                          {supabaseSession ? "Active Account" : "Active Persona"}
                        </span>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            supabaseSession
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200/60 font-semibold"
                              : "bg-neutral-100 text-neutral-600"
                          }`}
                        >
                          {supabaseSession ? "Google SSO Active" : "Local Campus Session"}
                        </span>
                      </div>

                      {/* User Card if Authenticated or Active */}
                      <div className="mx-1 my-1.5 p-2.5 bg-neutral-50/90 rounded-xl border border-neutral-100 flex items-center gap-2.5">
                        <UserAvatar
                          src={user.avatar || currentPersonaOption.avatar}
                          name={user.fullName || user.name || currentPersonaOption.fullName}
                          className="w-8 h-8 ring-2 ring-emerald-400/60 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-neutral-900 truncate">
                            {user.fullName || user.name || currentPersonaOption.fullName}
                          </div>
                          <div className="text-[10px] text-neutral-500 truncate">
                            {user.email || (supabaseSession ? "Google Workspace" : "faculty@sutra.edu")}
                          </div>
                        </div>
                      </div>

                      {/* Header for Roles / Personas */}
                      <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-t border-neutral-100/80 mt-1">
                        Switch Role View
                      </div>

                      {/* Options List */}
                      <div className="py-1 space-y-0.5 max-h-80 overflow-y-auto">
                        {personaList.map((p) => {
                          const isSelected = activeRole === p.role;
                          return (
                            <button
                              key={p.role}
                              type="button"
                              onClick={() => handleRoleSelect(p.role)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-neutral-100/90 text-neutral-900 shadow-2xs font-semibold"
                                  : "hover:bg-neutral-50 active:bg-neutral-100/80 text-neutral-700"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <UserAvatar
                                  src={p.avatar}
                                  name={p.fullName}
                                  className="w-7 h-7 ring-1 ring-neutral-200/80"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-semibold text-neutral-900 truncate flex items-center gap-1.5">
                                    <span>{p.displayLabel}</span>
                                    {p.badge && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-mono font-bold">
                                        {p.badge}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-neutral-400 truncate">
                                    {p.title}
                                  </div>
                                </div>
                              </div>

                              {isSelected && (
                                <Check className="w-4 h-4 text-neutral-900 shrink-0 ml-2" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Messages Trigger */}
              <button
                type="button"
                onClick={() => setIsMessagesOpen(!isMessagesOpen)}
                className="relative w-9 h-9 flex items-center justify-center bg-[#F8F9FA] hover:bg-[#F1F3F6] border border-neutral-200/70 rounded-full text-neutral-600 hover:text-neutral-900 shadow-2xs transition-all cursor-pointer shrink-0"
                title="Messages"
                aria-label="Messages"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-neutral-900 rounded-full ring-2 ring-white" />
              </button>

              {/* Notifications Trigger */}
              <button
                type="button"
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="relative w-9 h-9 flex items-center justify-center bg-[#F8F9FA] hover:bg-[#F1F3F6] border border-neutral-200/70 rounded-full text-neutral-600 hover:text-neutral-900 shadow-2xs transition-all cursor-pointer shrink-0"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white" />
                )}
              </button>

              {/* Profile Avatar / User Settings Trigger */}
              <button
                type="button"
                onClick={() => {
                  setUserSettingsTab("profile");
                  setIsUserSettingsOpen(true);
                }}
                className="flex items-center pl-1 cursor-pointer group"
                title={`${user.fullName || currentPersonaOption.fullName} (${user.role || currentPersonaOption.title})`}
                aria-label="Open User Settings"
              >
                <UserAvatar
                  src={user.avatar || currentPersonaOption.avatar}
                  name={user.fullName || currentPersonaOption.fullName}
                  size="md"
                  className="w-9 h-9 ring-2 ring-neutral-100 group-hover:ring-neutral-300 shadow-2xs transition-all"
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
            mainNavItems.length >= 6
              ? "grid-cols-6"
              : mainNavItems.length === 5
              ? "grid-cols-5"
              : "grid-cols-4"
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

            {/* Mobile Role Switcher */}
            <div className="pt-2 pb-2 border-b border-neutral-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-2 px-1">
                Active Role Workspace
              </span>
              <div className="grid grid-cols-2 gap-2">
                {personaList.map((p) => {
                  const isSelected = activeRole === p.role;
                  return (
                    <button
                      key={p.role}
                      type="button"
                      onClick={() => {
                        handleRoleSelect(p.role);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                        isSelected
                          ? "bg-neutral-900 text-white shadow-xs"
                          : "bg-neutral-100/80 hover:bg-neutral-200/60 text-neutral-800"
                      }`}
                    >
                      <UserAvatar src={p.avatar} name={p.fullName} className="w-6 h-6 shrink-0" />
                      <div className="min-w-0 flex-1 truncate">
                        <div className="truncate text-[11px] font-medium">
                          {p.role === "counselor"
                            ? "Counselor"
                            : p.role === "faculty"
                            ? "Faculty"
                            : p.role === "student"
                            ? "Student"
                            : "Admin"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Secondary Navigation Links */}
            <div className="space-y-1.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setUserSettingsTab("profile");
                  setIsUserSettingsOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold text-neutral-800 hover:text-neutral-950 hover:bg-neutral-50 active:bg-neutral-100 transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4 text-neutral-600" />
                <span>User Settings</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setUserSettingsTab("help");
                  setIsUserSettingsOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold text-neutral-800 hover:text-neutral-950 hover:bg-neutral-50 active:bg-neutral-100 transition-colors cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-neutral-600" />
                <span>Help &amp; Knowledge</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 active:bg-rose-100 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                <span>Sign Out</span>
              </button>
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
      <UserSettingsModal
        isOpen={isUserSettingsOpen}
        onClose={() => setIsUserSettingsOpen(false)}
        initialTab={userSettingsTab}
      />
      <AccountDialog
        isOpen={isAccountDialogOpen}
        onClose={() => setIsAccountDialogOpen(false)}
      />
    </div>
  );
}
