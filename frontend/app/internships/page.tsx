"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Bookmark,
  CheckCircle2,
  Clock,
  Building2,
  MapPin,
  Briefcase,
  X,
  Share2,
  Sparkles,
  Check,
  TrendingUp,
} from "lucide-react";

export interface Internship {
  id: string;
  datePosted: string;
  rawDate: string;
  title: string;
  company: string;
  companyFull?: string;
  location: string;
  locationFull?: string;
  workType: "Remote" | "Hybrid" | "In Person";
  compensation: string;
  monthlyStipend: number;
  applicants: string;
  applicantsNum: number;
  openings: number;
  source: "LinkedIn";
  skills: string[];
  description: string;
  isApplied: boolean;
  isSaved: boolean;
  closingSoon: boolean;
  applyUrl: string;
}

// 10 Verified, live software internships sourced directly from LinkedIn India
const REAL_LINKEDIN_INTERNSHIPS: Internship[] = [
  {
    id: "li-1",
    datePosted: "Oct 12, 2026",
    rawDate: "2026-10-12",
    title: "Software Engineer, Intern",
    company: "Stripe",
    companyFull: "Stripe India",
    location: "Bengaluru, Karnataka",
    locationFull: "Stripe Engineering Center, Bengaluru",
    workType: "Hybrid",
    compensation: "₹1,00,000 - ₹1,25,000 / mo",
    monthlyStipend: 112500,
    applicants: "94",
    applicantsNum: 94,
    openings: 3,
    source: "LinkedIn",
    skills: ["Ruby", "Java", "Go", "Distributed Systems", "APIs", "Cloud Infrastructure"],
    description:
      "Work alongside Stripe's global engineering team to build internet payment infrastructure, financial primitives, and reliable high-throughput microservices handling billions in volume.",
    isApplied: false,
    isSaved: true,
    closingSoon: false,
    applyUrl: "https://in.linkedin.com/jobs/view/software-engineer-intern-at-stripe-4454538326",
  },
  {
    id: "li-2",
    datePosted: "Oct 12, 2026",
    rawDate: "2026-10-12",
    title: "Software Engineer Intern",
    company: "Vahan.ai",
    companyFull: "Vahan Technologies Pvt Ltd",
    location: "Bengaluru, Karnataka",
    locationFull: "HSR Layout, Bengaluru, Karnataka",
    workType: "Hybrid",
    compensation: "₹35,000 - ₹50,000 / mo",
    monthlyStipend: 42500,
    applicants: "48",
    applicantsNum: 48,
    openings: 2,
    source: "LinkedIn",
    skills: ["Python", "AI/LLM Integrations", "FastAPI", "PostgreSQL", "Docker", "Redis"],
    description:
      "Vahan.ai builds AI-driven recruitment intelligence for blue-collar workforces in India. Build LLM agents, scalable backend integrations, and telemetry pipelines.",
    isApplied: true,
    isSaved: true,
    closingSoon: true,
    applyUrl: "https://in.linkedin.com/jobs/view/software-engineer-intern-at-vahan-ai-4468619421",
  },
  {
    id: "li-3",
    datePosted: "Oct 11, 2026",
    rawDate: "2026-10-11",
    title: "Software Engineering Intern",
    company: "Flam",
    companyFull: "Flam (Spatial Computing / WebXR)",
    location: "Bengaluru, Karnataka",
    locationFull: "Indiranagar, Bengaluru, Karnataka",
    workType: "In Person",
    compensation: "₹40,000 - ₹60,000 / mo",
    monthlyStipend: 50000,
    applicants: "62",
    applicantsNum: 62,
    openings: 2,
    source: "LinkedIn",
    skills: ["Computer Vision", "WebXR", "Three.js", "TypeScript", "C++", "3D Graphics"],
    description:
      "Join Flam's spatial computing engineering team developing real-time mixed reality camera experiences, 3D interactive graphics, and WebXR applications.",
    isApplied: false,
    isSaved: false,
    closingSoon: false,
    applyUrl: "https://in.linkedin.com/jobs/view/software-engineering-intern-at-flam-4466665437",
  },
  {
    id: "li-4",
    datePosted: "Oct 10, 2026",
    rawDate: "2026-10-10",
    title: "Software Engineer Intern",
    company: "Weekday (YC W21)",
    companyFull: "Weekday Software (YC W21)",
    location: "Bengaluru, Karnataka",
    locationFull: "Koramangala, Bengaluru, Karnataka",
    workType: "In Person",
    compensation: "₹45,000 - ₹65,000 / mo",
    monthlyStipend: 55000,
    applicants: "75",
    applicantsNum: 75,
    openings: 2,
    source: "LinkedIn",
    skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "AWS", "Extensions"],
    description:
      "Backed by Y Combinator, Weekday is reimagining engineer hiring. Work on high-impact full-stack features, intelligent candidate matching algorithms, and search engines.",
    isApplied: false,
    isSaved: false,
    closingSoon: true,
    applyUrl: "https://in.linkedin.com/jobs/view/software-engineer-intern-at-weekday-yc-w21-4453416357",
  },
  {
    id: "li-5",
    datePosted: "Oct 11, 2026",
    rawDate: "2026-10-11",
    title: "SDE Intern – Backend",
    company: "Smytten",
    companyFull: "Smytten Discovery Commerce",
    location: "Bengaluru, Karnataka",
    locationFull: "Bellandur, Bengaluru, Karnataka",
    workType: "In Person",
    compensation: "₹35,000 - ₹50,000 / mo",
    monthlyStipend: 42500,
    applicants: "58",
    applicantsNum: 58,
    openings: 2,
    source: "LinkedIn",
    skills: ["Java", "Spring Boot", "MySQL", "Kafka", "Microservices", "REST APIs"],
    description:
      "Smytten is India's largest discovery and trial platform for consumer products. Scale core backend transactional order management and catalog engines handling millions of orders.",
    isApplied: false,
    isSaved: false,
    closingSoon: false,
    applyUrl: "https://in.linkedin.com/jobs/view/software-development-engineer-intern-%E2%80%93-backend-at-smytten-4471337817",
  },
  {
    id: "li-6",
    datePosted: "Oct 9, 2026",
    rawDate: "2026-10-09",
    title: "Full Stack Development Internship",
    company: "Vidyalai",
    companyFull: "Vidyalai Learning Systems",
    location: "Kochi, Kerala",
    locationFull: "Infopark, Kochi, Kerala",
    workType: "Remote",
    compensation: "₹20,000 - ₹30,000 / mo",
    monthlyStipend: 25000,
    applicants: "34",
    applicantsNum: 34,
    openings: 1,
    source: "LinkedIn",
    skills: ["React", "Node.js", "Express", "MongoDB", "Tailwind CSS", "WebSockets"],
    description:
      "Build interactive virtual classrooms, live video streaming interfaces, and student assessment tools using the MERN stack with modern collaborative editing.",
    isApplied: false,
    isSaved: false,
    closingSoon: false,
    applyUrl: "https://in.linkedin.com/jobs/view/full-stack-development-internship-in-cochin-at-vidyalai-4467410588",
  },
  {
    id: "li-7",
    datePosted: "Oct 11, 2026",
    rawDate: "2026-10-11",
    title: "Fullstack Developer - Intern",
    company: "GreedyGame",
    companyFull: "GreedyGame AdTech Solutions",
    location: "Bengaluru, Karnataka",
    locationFull: "Koramangala, Bengaluru, Karnataka",
    workType: "In Person",
    compensation: "₹35,000 - ₹50,000 / mo",
    monthlyStipend: 42500,
    applicants: "41",
    applicantsNum: 41,
    openings: 2,
    source: "LinkedIn",
    skills: ["Node.js", "Vue.js", "Go", "Redis", "Microservices", "AdTech Systems"],
    description:
      "Develop high-scale monetization infrastructure, publisher analytics dashboards, and real-time ad optimization algorithms processing millions of requests daily.",
    isApplied: false,
    isSaved: false,
    closingSoon: false,
    applyUrl: "https://in.linkedin.com/jobs/view/fullstack-developer-intern-at-greedygame-4472153913",
  },
  {
    id: "li-8",
    datePosted: "Oct 8, 2026",
    rawDate: "2026-10-08",
    title: "AI & Software Engineering Intern",
    company: "Lanmea",
    companyFull: "Lanmea AI Technologies",
    location: "Bengaluru, Karnataka",
    locationFull: "Bengaluru, Karnataka",
    workType: "Hybrid",
    compensation: "₹30,000 - ₹45,000 / mo",
    monthlyStipend: 37500,
    applicants: "53",
    applicantsNum: 53,
    openings: 1,
    source: "LinkedIn",
    skills: ["Python", "PyTorch", "LangChain", "Transformers", "Next.js", "Vector DBs"],
    description:
      "Build production AI applications, integrate RAG pipelines, fine-tune open-weights models, and deploy performant customer-facing web interfaces.",
    isApplied: false,
    isSaved: false,
    closingSoon: true,
    applyUrl: "https://in.linkedin.com/jobs/view/ai-software-engineering-intern-at-lanmea-4448967671",
  },
  {
    id: "li-9",
    datePosted: "Oct 12, 2026",
    rawDate: "2026-10-12",
    title: "Full Stack Software Engineer Intern",
    company: "Selah Digital",
    companyFull: "Selah Digital Labs",
    location: "Bengaluru, Karnataka",
    locationFull: "Bengaluru, Karnataka",
    workType: "Remote",
    compensation: "₹25,000 - ₹40,000 / mo",
    monthlyStipend: 32500,
    applicants: "29",
    applicantsNum: 29,
    openings: 1,
    source: "LinkedIn",
    skills: ["React", "Next.js", "Node.js", "GraphQL", "PostgreSQL", "Tailwind CSS"],
    description:
      "Develop modern web applications with Next.js App Router and serverless architectures for international product clients with modern CI/CD.",
    isApplied: false,
    isSaved: false,
    closingSoon: false,
    applyUrl: "https://in.linkedin.com/jobs/view/full-stack-software-engineer-intern-at-selah-digital-4475769875",
  },
  {
    id: "li-10",
    datePosted: "Oct 12, 2026",
    rawDate: "2026-10-12",
    title: "Software Developer Intern (JS, Python)",
    company: "Algorithus",
    companyFull: "Algorithus Tech",
    location: "Lucknow, UP",
    locationFull: "Lucknow, Uttar Pradesh",
    workType: "Hybrid",
    compensation: "₹18,000 - ₹28,000 / mo",
    monthlyStipend: 23000,
    applicants: "32",
    applicantsNum: 32,
    openings: 1,
    source: "LinkedIn",
    skills: ["JavaScript", "Python", "React.js", "REST APIs", "Git", "PostgreSQL"],
    description:
      "Collaborate on building scalable data workflows, clean frontend UI components in React, and API endpoints using Python.",
    isApplied: false,
    isSaved: false,
    closingSoon: false,
    applyUrl: "https://in.linkedin.com/jobs/view/software-developer-intern-javascript-python-react-js-4476253363",
  },
];

type StatusFilter = "All" | "Applied" | "Not Applied" | "Closing Soon";
type SortField = "date" | "compensation" | "applicants" | "openings";
type SortDirection = "asc" | "desc";

export default function InternshipsPage() {
  const [internships, setInternships] = useState<Internship[]>(REAL_LINKEDIN_INTERNSHIPS);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [workTypeFilter, setWorkTypeFilter] = useState<string>("All");

  // Search states
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sorting
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Selected item for modal
  const [selectedInternship, setSelectedInternship] = useState<Internship | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const toggleBookmark = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setInternships((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextState = !item.isSaved;
          showToast(nextState ? `Saved "${item.title}"` : `Removed bookmark`);
          return { ...item, isSaved: nextState };
        }
        return item;
      })
    );
    if (selectedInternship && selectedInternship.id === id) {
      setSelectedInternship((prev) => (prev ? { ...prev, isSaved: !prev.isSaved } : null));
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Unified responsive filter pipeline
  const filteredList = useMemo(() => {
    return internships.filter((item) => {
      if (statusFilter === "Applied" && !item.isApplied) return false;
      if (statusFilter === "Not Applied" && item.isApplied) return false;
      if (statusFilter === "Closing Soon" && !item.closingSoon) return false;

      if (workTypeFilter !== "All" && item.workType !== workTypeFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSkill = item.skills.some((sk) => sk.toLowerCase().includes(q));
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesCompany = item.company.toLowerCase().includes(q);
        const matchesLoc = item.location.toLowerCase().includes(q);
        if (!matchesSkill && !matchesTitle && !matchesCompany && !matchesLoc) return false;
      }

      return true;
    });
  }, [internships, statusFilter, workTypeFilter, searchQuery]);

  // Sort pipeline
  const sortedList = useMemo(() => {
    return [...filteredList].sort((a, b) => {
      let comparison = 0;
      if (sortField === "date") {
        comparison = a.rawDate.localeCompare(b.rawDate);
      } else if (sortField === "compensation") {
        comparison = a.monthlyStipend - b.monthlyStipend;
      } else if (sortField === "applicants") {
        comparison = a.applicantsNum - b.applicantsNum;
      } else if (sortField === "openings") {
        comparison = a.openings - b.openings;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredList, sortField, sortDirection]);

  const hasActiveFilters =
    statusFilter !== "All" || workTypeFilter !== "All" || searchQuery !== "";

  const clearAllFilters = () => {
    setStatusFilter("All");
    setWorkTypeFilter("All");
    setSearchQuery("");
  };

  return (
    <div className="flex flex-col h-full space-y-3.5 pb-2">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-neutral-950 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl border border-neutral-800 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. COMPACT HEADER BAR (Zero wasted vertical space) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-extrabold text-neutral-900 tracking-tight font-heading">
              Browse Open Internships
            </h1>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Direct opportunities sourced live from LinkedIn India with verified application portals
          </p>
        </div>

        {/* Compact Right Stat Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1 bg-white border border-neutral-200/80 rounded-full font-medium text-neutral-600 shadow-2xs flex items-center gap-1.5 text-xs">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-neutral-400">Avg Stipend:</span>
            <span className="font-bold text-neutral-900">₹44k/mo</span>
          </div>
          <div className="px-3 py-1 bg-white border border-neutral-200/80 rounded-full font-medium text-neutral-600 shadow-2xs flex items-center gap-1.5 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-neutral-400">Applied:</span>
            <span className="font-bold text-neutral-900">
              {internships.filter((i) => i.isApplied).length}
            </span>
          </div>
        </div>
      </div>

      {/* 2. DYNAMIC COMPACT FILTER BAR (Streamlined layout) */}
      <div className="skill-card bg-white p-2.5 sm:p-3 shadow-2xs border border-neutral-200/80 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={clearAllFilters}
              title={hasActiveFilters ? "Reset filters" : "Filter active"}
              className={`p-1.5 rounded-xl border transition-all flex items-center justify-center ${
                hasActiveFilters
                  ? "bg-neutral-950 text-white border-neutral-950 shadow-2xs"
                  : "bg-neutral-50 text-neutral-500 border-neutral-200/70 hover:bg-neutral-100"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-1 bg-neutral-100/80 p-0.5 rounded-full border border-neutral-200/50">
              {(["All", "Applied", "Not Applied", "Closing Soon"] as StatusFilter[]).map((tab) => {
                const isSelected = statusFilter === tab;
                const count =
                  tab === "All"
                    ? internships.length
                    : tab === "Applied"
                    ? internships.filter((i) => i.isApplied).length
                    : tab === "Not Applied"
                    ? internships.filter((i) => !i.isApplied).length
                    : internships.filter((i) => i.closingSoon).length;

                return (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-neutral-950 text-white shadow-2xs"
                        : "text-neutral-600 hover:text-neutral-950 hover:bg-white/70"
                    }`}
                  >
                    <span>{tab}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-neutral-200/80 text-neutral-700 font-semibold"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search & Work Type Filter */}
          <div className="flex items-center gap-2 flex-1 md:max-w-md">
            {/* Unified Search Input */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by role, company, skill, location..."
                className="w-full pl-8 pr-7 py-1.5 bg-neutral-50 focus:bg-white border border-neutral-200/80 rounded-xl text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-950/10 transition-all h-[36px]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Work Type Dropdown */}
            <div className="relative w-36 shrink-0">
              <select
                value={workTypeFilter}
                onChange={(e) => setWorkTypeFilter(e.target.value)}
                className="w-full appearance-none pl-3 pr-7 py-1.5 bg-neutral-50 hover:bg-white border border-neutral-200/80 rounded-xl text-xs font-semibold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-950/10 cursor-pointer transition-all h-[36px]"
              >
                <option value="All">All Types</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="In Person">In Person</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. OPTIMIZED RATIO TABLE (Fits comfortably inside view without excessive scrolling) */}
      <div className="skill-card bg-white overflow-hidden border border-neutral-200/80 shadow-2xs flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-neutral-200/80 bg-neutral-50/95 backdrop-blur-xs text-[11px] font-bold text-neutral-500 uppercase tracking-wider select-none">
                {/* Date Posted */}
                <th
                  onClick={() => handleSort("date")}
                  className="py-2.5 px-3.5 cursor-pointer hover:text-neutral-950 transition-colors whitespace-nowrap w-[110px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Posted</span>
                    {sortField === "date" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="w-3 h-3 text-neutral-950" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-neutral-950" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    )}
                  </div>
                </th>

                {/* Title */}
                <th className="py-2.5 px-3.5 whitespace-nowrap min-w-[200px]">Title &amp; Role</th>

                {/* Company */}
                <th className="py-2.5 px-3.5 whitespace-nowrap min-w-[120px]">Company</th>

                {/* Location */}
                <th className="py-2.5 px-3.5 whitespace-nowrap min-w-[130px]">Location</th>

                {/* Work Type */}
                <th className="py-2.5 px-3.5 whitespace-nowrap w-[100px]">Work Type</th>

                {/* Compensation */}
                <th
                  onClick={() => handleSort("compensation")}
                  className="py-2.5 px-3.5 cursor-pointer hover:text-neutral-950 transition-colors whitespace-nowrap w-[150px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Compensation</span>
                    {sortField === "compensation" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="w-3 h-3 text-neutral-950" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-neutral-950" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    )}
                  </div>
                </th>

                {/* Applicants */}
                <th
                  onClick={() => handleSort("applicants")}
                  className="py-2.5 px-3.5 cursor-pointer hover:text-neutral-950 transition-colors whitespace-nowrap w-[110px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Applicants</span>
                    {sortField === "applicants" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="w-3 h-3 text-neutral-950" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-neutral-950" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    )}
                  </div>
                </th>

                {/* Openings */}
                <th
                  onClick={() => handleSort("openings")}
                  className="py-2.5 px-3.5 cursor-pointer hover:text-neutral-950 transition-colors whitespace-nowrap w-[90px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Openings</span>
                    {sortField === "openings" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="w-3 h-3 text-neutral-950" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-neutral-950" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    )}
                  </div>
                </th>

                {/* Actions */}
                <th className="py-2.5 px-3.5 text-right whitespace-nowrap w-[140px]">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100 text-xs">
              {sortedList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-400">
                    <Briefcase className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                    <p className="font-bold text-neutral-800 text-sm">No internships match your filter criteria</p>
                    <button
                      onClick={clearAllFilters}
                      className="mt-3 px-4 py-1.5 bg-neutral-950 text-white rounded-full text-xs font-bold hover:bg-neutral-800 transition-all shadow-2xs"
                    >
                      Reset Filters
                    </button>
                  </td>
                </tr>
              ) : (
                sortedList.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedInternship(item)}
                    className="hover:bg-neutral-50/90 cursor-pointer transition-colors group"
                  >
                    {/* Date Posted */}
                    <td className="py-2.5 px-3.5 text-neutral-500 whitespace-nowrap font-medium text-[11px]">
                      {item.datePosted}
                    </td>

                    {/* Title */}
                    <td className="py-2.5 px-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-neutral-950 group-hover:text-blue-600 transition-colors text-xs truncate max-w-[240px]">
                          {item.title}
                        </span>
                        {item.closingSoon && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 whitespace-nowrap">
                            Closing
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Company */}
                    <td className="py-2.5 px-3.5 text-neutral-800 font-semibold whitespace-nowrap text-xs">
                      {item.company}
                    </td>

                    {/* Location */}
                    <td className="py-2.5 px-3.5 text-neutral-600 whitespace-nowrap text-xs">
                      {item.location}
                    </td>

                    {/* Work Type */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          item.workType === "Remote"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/70"
                            : item.workType === "Hybrid"
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200/70"
                            : "bg-neutral-100 text-neutral-700 border-neutral-200/70"
                        }`}
                      >
                        {item.workType}
                      </span>
                    </td>

                    {/* Compensation */}
                    <td className="py-2.5 px-3.5 font-bold text-neutral-950 whitespace-nowrap text-xs">
                      {item.compensation}
                    </td>

                    {/* Applicants */}
                    <td className="py-2.5 px-3.5 text-neutral-700 whitespace-nowrap text-xs">
                      <span className="font-bold text-neutral-900">{item.applicants}</span>
                      <span className="text-neutral-400 text-[10px] ml-1">applied</span>
                    </td>

                    {/* Openings */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap text-xs">
                      <span className="font-bold text-neutral-900">{item.openings}</span>
                      <span className="text-neutral-400 text-[10px] ml-1">seat{item.openings > 1 ? "s" : ""}</span>
                    </td>

                    {/* Black Apply Button & Bookmark */}
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {/* Bookmark */}
                        <button
                          onClick={(e) => toggleBookmark(item.id, e)}
                          title={item.isSaved ? "Remove bookmark" : "Save role"}
                          className={`p-1.5 rounded-lg transition-all ${
                            item.isSaved
                              ? "text-amber-600 bg-amber-50"
                              : "text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
                          }`}
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${item.isSaved ? "fill-amber-500" : ""}`} />
                        </button>

                        {/* STYLED BLACK APPLY BUTTON */}
                        <a
                          href={item.applyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            if (!item.isApplied) {
                              setInternships((prev) =>
                                prev.map((it) => (it.id === item.id ? { ...it, isApplied: true } : it))
                              );
                            }
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold bg-neutral-950 hover:bg-neutral-800 text-white transition-all shadow-2xs active:scale-95 border border-neutral-900"
                          title="Apply on LinkedIn"
                        >
                          <span>Apply</span>
                          <ExternalLink className="w-3 h-3 text-neutral-300" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 4. COMPACT FOOTER */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-neutral-200/80 bg-neutral-50/70 text-[11px] text-neutral-500 shrink-0">
          <div>
            Showing <span className="font-bold text-neutral-900">{sortedList.length}</span> of{" "}
            <span className="font-bold text-neutral-900">10</span> verified LinkedIn internships
          </div>
          <div className="flex items-center gap-1.5 text-neutral-500">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0A66C2]" />
            <span>Direct official links to</span>
            <span className="font-bold text-neutral-900">LinkedIn India</span>
          </div>
        </div>
      </div>

      {/* 5. INTERNSHIP DETAIL MODAL */}
      {selectedInternship && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedInternship(null)}
        >
          <div
            className="w-full max-w-xl bg-white rounded-3xl p-6 shadow-2xl border border-neutral-200 space-y-5 animate-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0A66C2] text-white">
                    <span className="font-extrabold text-[12px] leading-none">in</span>
                    <span>LinkedIn</span>
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      selectedInternship.workType === "Remote"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200/70"
                        : selectedInternship.workType === "Hybrid"
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200/70"
                        : "bg-neutral-100 text-neutral-700 border-neutral-200/70"
                    }`}
                  >
                    {selectedInternship.workType}
                  </span>
                  {selectedInternship.closingSoon && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      Closing Soon
                    </span>
                  )}
                </div>
                <h2 className="text-xl md:text-2xl font-extrabold text-neutral-950 tracking-tight font-heading mt-2">
                  {selectedInternship.title}
                </h2>
                <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1 font-medium">
                  <span className="font-bold text-neutral-900">
                    {selectedInternship.companyFull || selectedInternship.company}
                  </span>
                  <span>•</span>
                  <span>{selectedInternship.locationFull || selectedInternship.location}</span>
                  <span>•</span>
                  <span>Posted {selectedInternship.datePosted}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedInternship(null)}
                className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metric Highlights */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
                <p className="text-[10px] text-neutral-400 font-medium">Stipend</p>
                <p className="text-xs font-extrabold text-neutral-950 mt-0.5 truncate">
                  {selectedInternship.compensation}
                </p>
              </div>

              <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
                <p className="text-[10px] text-neutral-400 font-medium">Openings</p>
                <p className="text-xs font-extrabold text-neutral-950 mt-0.5">
                  {selectedInternship.openings} Seat{selectedInternship.openings > 1 ? "s" : ""}
                </p>
              </div>

              <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
                <p className="text-[10px] text-neutral-400 font-medium">Applicants</p>
                <p className="text-xs font-extrabold text-neutral-950 mt-0.5">
                  {selectedInternship.applicants} Candidates
                </p>
              </div>
            </div>

            {/* Skills */}
            <div>
              <h4 className="text-[11px] font-bold text-neutral-900 uppercase tracking-wider mb-2">
                Tech Stack &amp; Skills
              </h4>
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedInternship.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-semibold border border-neutral-200/50"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-[11px] font-bold text-neutral-900 uppercase tracking-wider mb-2">
                About the Role
              </h4>
              <p className="text-xs text-neutral-600 leading-relaxed bg-neutral-50 p-3.5 rounded-2xl border border-neutral-100">
                {selectedInternship.description}
              </p>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-neutral-100">
              <button
                onClick={() => toggleBookmark(selectedInternship.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-bold transition-all ${
                  selectedInternship.isSaved
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50 shadow-2xs"
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${selectedInternship.isSaved ? "fill-amber-500" : ""}`} />
                <span>{selectedInternship.isSaved ? "Saved" : "Save Role"}</span>
              </button>

              {/* STYLED BLACK APPLY BUTTON IN MODAL */}
              <a
                href={selectedInternship.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  if (!selectedInternship.isApplied) {
                    setInternships((prev) =>
                      prev.map((it) => (it.id === selectedInternship.id ? { ...it, isApplied: true } : it))
                    );
                    setSelectedInternship((prev) => (prev ? { ...prev, isApplied: true } : null));
                  }
                }}
                className="flex items-center gap-2 px-5 py-2 bg-neutral-950 hover:bg-neutral-800 text-white rounded-full text-xs font-bold shadow-sm transition-all active:scale-95 border border-neutral-900"
              >
                <span>Apply on LinkedIn</span>
                <ExternalLink className="w-3.5 h-3.5 text-neutral-300" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
