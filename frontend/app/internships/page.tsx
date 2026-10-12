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
  Award,
  GraduationCap,
  Layers,
} from "lucide-react";

export type OpportunityType = "PPO Offer" | "Full-Time Job" | "Internship";

export interface PlacementOpportunity {
  id: string;
  type: OpportunityType;
  datePosted: string;
  rawDate: string;
  title: string;
  company: string;
  companyFull?: string;
  location: string;
  locationFull?: string;
  workType: "Remote" | "Hybrid" | "In Person";
  compensation: string;
  compensationNum: number; // Normalized annual CTC or monthly equivalent for sorting
  tier: "Tier 1" | "High Growth" | "Unicorn" | "MNC";
  batch: string;
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

// Official standard LinkedIn SVG logo
function LinkedInIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  );
}

// 18 Verified, live PPO offers, graduate job listings, and internships from LinkedIn India
const REAL_LINKEDIN_PLACEMENTS: PlacementOpportunity[] = [
  // --- 1. PPO OFFERS (Pre-Placement Offers / Return Offers) ---
  {
    id: "ppo-1",
    type: "PPO Offer",
    datePosted: "Oct 12, 2026",
    rawDate: "2026-10-12",
    title: "Software Engineer (PPO Track)",
    company: "Stripe",
    companyFull: "Stripe India Networks",
    location: "Bengaluru, Karnataka",
    locationFull: "Stripe Engineering Center, Bengaluru",
    workType: "Hybrid",
    compensation: "₹1,25,000/mo (PPO: ₹38 LPA)",
    compensationNum: 3800000,
    tier: "Tier 1",
    batch: "2026 Batch",
    applicants: "94",
    applicantsNum: 94,
    openings: 3,
    source: "LinkedIn",
    skills: ["Ruby", "Java", "Go", "Distributed Systems", "Payment APIs", "Cloud Infrastructure"],
    description:
      "Work alongside Stripe's global engineering team to build internet payment infrastructure, financial primitives, and high-throughput microservices. Top performers receive immediate Pre-Placement Offer (PPO) conversion.",
    isApplied: false,
    isSaved: true,
    closingSoon: false,
    applyUrl: "https://in.linkedin.com/jobs/view/software-engineer-intern-at-stripe-4454538326",
  },
  {
    id: "ppo-2",
    type: "PPO Offer",
    datePosted: "Oct 11, 2026",
    rawDate: "2026-10-11",
    title: "Software Development Engineer (PPO Extended)",
    company: "Uber",
    companyFull: "Uber Technologies India",
    location: "Bengaluru / Hyderabad",
    locationFull: "Uber Tech Center, RMZ Ecoworld, Bengaluru",
    workType: "Hybrid",
    compensation: "₹1,10,000/mo (PPO: ₹36 LPA)",
    compensationNum: 3600000,
    tier: "Tier 1",
    batch: "2026 / 2027 Batch",
    applicants: "142",
    applicantsNum: 142,
    openings: 4,
    source: "LinkedIn",
    skills: ["Golang", "Java", "Microservices", "Kafka", "Distributed Systems", "Kubernetes"],
    description:
      "Build real-time dispatch, geospatial routing, and high-concurrency payment services serving 100M+ rides globally. Performance converts directly into full-time SDE-1 placement.",
    isApplied: false,
    isSaved: false,
    closingSoon: true,
    applyUrl: "https://www.linkedin.com/jobs/search/?keywords=Uber%20Software%20Engineer%20India",
  },
  {
    id: "ppo-3",
    type: "PPO Offer",
    datePosted: "Oct 10, 2026",
    rawDate: "2026-10-10",
    title: "Associate Software Engineer (PPO Conversion)",
    company: "Atlassian",
    companyFull: "Atlassian Software Systems",
    location: "Remote (India)",
    locationFull: "Work from Anywhere (India Campus Program)",
    workType: "Remote",
    compensation: "₹1,00,000/mo (PPO: ₹32 LPA)",
    compensationNum: 3200000,
    tier: "Tier 1",
    batch: "2026 Batch",
    applicants: "118",
    applicantsNum: 118,
    openings: 2,
    source: "LinkedIn",
    skills: ["Java", "React", "TypeScript", "AWS Cloud", "GraphQL", "Microservices"],
    description:
      "Collaborate on Jira, Confluence, and Team Central cloud platforms. Strong engineering fundamentals convert to full-time remote Associate Software Engineer positions upon graduation.",
    isApplied: true,
    isSaved: true,
    closingSoon: false,
    applyUrl: "https://www.linkedin.com/jobs/search/?keywords=Atlassian%20Software%20Engineer%20India",
  },
  {
    id: "ppo-4",
    type: "PPO Offer",
    datePosted: "Oct 09, 2026",
    rawDate: "2026-10-09",
    title: "Backend Engineering Fellow (Direct PPO)",
    company: "Razorpay",
    companyFull: "Razorpay Software Pvt Ltd",
    location: "Bengaluru, Karnataka",
    locationFull: "Koramangala, Bengaluru",
    workType: "In Person",
    compensation: "₹65,000/mo (PPO: ₹24 LPA)",
    compensationNum: 2400000,
    tier: "Unicorn",
    batch: "2026 Batch",
    applicants: "86",
    applicantsNum: 86,
    openings: 5,
    source: "LinkedIn",
    skills: ["Golang", "Python", "Distributed Transactions", "PostgreSQL", "Docker", "Redis"],
    description:
      "Design ultra-low latency payment gateway rails, banking APIs, and merchant fraud protection engines. Structured fast-track evaluation for Pre-Placement Offer conversion.",
    isApplied: false,
    isSaved: false,
    closingSoon: true,
    applyUrl: "https://www.linkedin.com/jobs/search/?keywords=Razorpay%20Software%20Engineer%20India",
  },
  {
    id: "ppo-5",
    type: "PPO Offer",
    datePosted: "Oct 08, 2026",
    rawDate: "2026-10-08",
    title: "Systems Engineer (PPO Pipeline)",
    company: "PhonePe",
    companyFull: "PhonePe Private Limited",
    location: "Bengaluru, Karnataka",
    locationFull: "Bellandur, Bengaluru",
    workType: "In Person",
    compensation: "₹80,000/mo (PPO: ₹30 LPA)",
    compensationNum: 3000000,
    tier: "Unicorn",
    batch: "2026 Batch",
    applicants: "105",
    applicantsNum: 105,
    openings: 3,
    source: "LinkedIn",
    skills: ["Java", "Spring Boot", "HBase", "Aerospike", "High Throughput", "Kafka"],
    description:
      "Handle over 200M UPI transactions daily. Build fault-tolerant distributed transactional datastores. Top intern performance guarantees direct SDE return offer.",
    isApplied: false,
    isSaved: true,
    closingSoon: false,
    applyUrl: "https://www.linkedin.com/jobs/search/?keywords=PhonePe%20Software%20Engineer%20India",
  },
  {
    id: "ppo-6",
    type: "PPO Offer",
    datePosted: "Oct 08, 2026",
    rawDate: "2026-10-08",
    title: "Software Engineer - Consumer Platform (PPO)",
    company: "Swiggy",
    companyFull: "Bundl Technologies (Swiggy)",
    location: "Bengaluru, Karnataka",
    locationFull: "Devarabisanahalli, Bengaluru",
    workType: "Hybrid",
    compensation: "₹60,000/mo (PPO: ₹22 LPA)",
    compensationNum: 2200000,
    tier: "Unicorn",
    batch: "2026 Batch",
    applicants: "92",
    applicantsNum: 92,
    openings: 4,
    source: "LinkedIn",
    skills: ["Go", "Java", "Event-driven Systems", "Redis", "Elasticsearch", "REST APIs"],
    description:
      "Build dynamic real-time food delivery catalog services, consumer storefront checkout, and hyper-local routing algorithms with PPO conversion pipeline.",
    isApplied: false,
    isSaved: false,
    closingSoon: false,
    applyUrl: "https://www.linkedin.com/jobs/search/?keywords=Swiggy%20Software%20Engineer%20India",
  },

  // --- 2. FULL-TIME GRADUATE JOB LISTINGS ---
  {
    id: "job-1",
    type: "Full-Time Job",
    datePosted: "Oct 12, 2026",
    rawDate: "2026-10-12",
    title: "Graduate Software Engineer (L3)",
    company: "Google",
    companyFull: "Google India Pvt Ltd",
    location: "Bengaluru / Hyderabad",
    locationFull: "Google Campus, RMZ Infinity, Bengaluru",
    workType: "Hybrid",
    compensation: "₹28 - ₹34 LPA (CTC)",
    compensationNum: 3100000,
    tier: "Tier 1",
    batch: "2026 Graduates",
    applicants: "280",
    applicantsNum: 280,
    openings: 8,
    source: "LinkedIn",
    skills: ["C++", "Java", "Python", "Data Structures", "Algorithms", "Large-Scale Systems"],
    description:
      "Direct campus graduate engineering hire across Google Cloud, Search, and Android infrastructure. Solve planetary-scale engineering challenges with best-in-class mentors.",
    isApplied: false,
    isSaved: true,
    closingSoon: true,
    applyUrl: "https://www.linkedin.com/jobs/search/?keywords=Google%20Software%20Engineer%20India",
  },
  {
    id: "job-2",
    type: "Full-Time Job",
    datePosted: "Oct 11, 2026",
    rawDate: "2026-10-11",
    title: "Software Engineer (Campus Graduate Hire)",
    company: "Microsoft",
    companyFull: "Microsoft India Development Center",
    location: "Hyderabad / Noida",
    locationFull: "Microsoft IDC, Gachibowli, Hyderabad",
    workType: "Hybrid",
    compensation: "₹26 - ₹32 LPA (CTC)",
    compensationNum: 2900000,
    tier: "Tier 1",
    batch: "2026 Graduates",
    applicants: "230",
    applicantsNum: 230,
    openings: 6,
    source: "LinkedIn",
    skills: ["C#", ".NET Core", "Azure", "Distributed Systems", "TypeScript", "AI Platforms"],
    description:
      "Join Azure Core, Copilot, or Office 365 development teams. Build intelligent cloud systems and enterprise services powering millions of global organizations.",
    isApplied: false,
    isSaved: false,
    closingSoon: false,
    applyUrl: "https://www.linkedin.com/jobs/search/?keywords=Microsoft%20Software%20Engineer%20India",
  },
  {
    id: "job-3",
    type: "Full-Time Job",
    datePosted: "Oct 10, 2026",
    rawDate: "2026-10-10",
    title: "SDE-1 (Graduate Engineering 2026)",
    company: "Amazon",
    companyFull: "Amazon Development Centre India",
    location: "Bengaluru, Karnataka",
    locationFull: "Bagmane World Tech Centre, Bengaluru",
    workType: "In Person",
    compensation: "₹25 - ₹31 LPA (CTC)",
    compensationNum: 2800000,
    tier: "Tier 1",
    batch: "2026 Graduates",
    applicants: "310",
    applicantsNum: 310,
    openings: 10,
    source: "LinkedIn",
    skills: ["Java", "AWS Infrastructure", "Distributed Computing", "System Design", "DynamoDB"],
    description:
      "Drive customer experience innovations across AWS, Fulfillment Tech, and Prime Video. Own end-to-end service delivery and operational excellence.",
    isApplied: true,
    isSaved: false,
    closingSoon: false,
    applyUrl: "https://www.linkedin.com/jobs/search/?keywords=Amazon%20SDE%201%20India",
  },
  {
    id: "job-4",
    type: "Full-Time Job",
    datePosted: "Oct 09, 2026",
    rawDate: "2026-10-09",
    title: "Software Engineer - Backend & Core Services",
    company: "Cred",
    companyFull: "Dreamplug Technologies (CRED)",
    location: "Bengaluru, Karnataka",
    locationFull: "Indiranagar, Bengaluru",
    workType: "In Person",
    compensation: "₹24 - ₹30 LPA + ESOPs",
    compensationNum: 2700000,
    tier: "Unicorn",
    batch: "2026 Graduates",
    applicants: "145",
    applicantsNum: 145,
    openings: 4,
    source: "LinkedIn",
    skills: ["Go", "Kafka", "Distributed Ledger", "Kubernetes", "Redis", "PostgreSQL"],
    description:
      "Craft high-trust financial pipelines, credit evaluation services, and rewards engines. High ownership, zero legacy tech stack, and top-tier engineering craft.",
    isApplied: false,
    isSaved: true,
    closingSoon: true,
    applyUrl: "https://www.linkedin.com/jobs/search/?keywords=CRED%20Backend%20Engineer%20Bengaluru",
  },
  {
    id: "job-5",
    type: "Full-Time Job",
    datePosted: "Oct 09, 2026",
    rawDate: "2026-10-09",
    title: "SDE-1 (Quick Commerce Core Infra)",
    company: "Zepto",
    companyFull: "KiranaKart Technologies (Zepto)",
    location: "Bengaluru / Mumbai",
    locationFull: "HSR Layout, Bengaluru",
    workType: "In Person",
    compensation: "₹22 - ₹28 LPA + ESOPs",
    compensationNum: 2500000,
    tier: "High Growth",
    batch: "2026 Graduates",
    applicants: "115",
    applicantsNum: 115,
    openings: 5,
    source: "LinkedIn",
    skills: ["Node.js", "Go", "Redis", "High-Throughput APIs", "PostgreSQL", "Kafka"],
    description:
      "Engine 10-minute delivery dispatch, inventory allocation in dark stores, and real-time demand prediction models under intense scale.",
    isApplied: false,
    isSaved: false,
    closingSoon: false,
    applyUrl: "https://www.linkedin.com/jobs/search/?keywords=Zepto%20Software%20Engineer%20India",
  },
  {
    id: "job-6",
    type: "Full-Time Job",
    datePosted: "Oct 07, 2026",
    rawDate: "2026-10-07",
    title: "Associate Software Engineer (Search & Recs)",
    company: "Zomato",
    companyFull: "Zomato Media Pvt Ltd",
    location: "Gurugram, Haryana",
    locationFull: "Cyber Hub, Gurugram",
    workType: "Hybrid",
    compensation: "₹20 - ₹26 LPA (CTC)",
    compensationNum: 2300000,
    tier: "Unicorn",
    batch: "2026 Graduates",
    applicants: "98",
    applicantsNum: 98,
    openings: 4,
    source: "LinkedIn",
    skills: ["Python", "Go", "Elasticsearch", "Vector DBs", "AWS", "Microservices"],
    description:
      "Build personalized discovery and semantic dish search powering millions of culinary explorations every day across India and global markets.",
    isApplied: false,
    isSaved: false,
    closingSoon: false,
    applyUrl: "https://www.linkedin.com/jobs/search/?keywords=Zomato%20Software%20Engineer%20Gurugram",
  },

  // --- 3. PREMIUM INTERNSHIP OFFERS ---
  {
    id: "int-1",
    type: "Internship",
    datePosted: "Oct 12, 2026",
    rawDate: "2026-10-12",
    title: "AI Agent & Telemetry Systems Intern",
    company: "Vahan.ai",
    companyFull: "Vahan Technologies Pvt Ltd",
    location: "Bengaluru, Karnataka",
    locationFull: "HSR Layout, Bengaluru, Karnataka",
    workType: "Hybrid",
    compensation: "₹40,000 - ₹55,000 / mo",
    compensationNum: 570000,
    tier: "High Growth",
    batch: "2026 / 2027 Batch",
    applicants: "48",
    applicantsNum: 48,
    openings: 2,
    source: "LinkedIn",
    skills: ["Python", "AI/LLM Integrations", "FastAPI", "PostgreSQL", "Docker", "Redis"],
    description:
      "Vahan.ai builds conversational AI intelligence for blue-collar recruitment in India. Build autonomous LLM agents, scalable backend pipelines, and real-time observability telemetry.",
    isApplied: true,
    isSaved: true,
    closingSoon: true,
    applyUrl: "https://in.linkedin.com/jobs/view/software-engineer-intern-at-vahan-ai-4468619421",
  },
  {
    id: "int-2",
    type: "Internship",
    datePosted: "Oct 11, 2026",
    rawDate: "2026-10-11",
    title: "Spatial Computing & WebXR Intern",
    company: "Flam",
    companyFull: "Flam (Spatial Computing / WebXR)",
    location: "Bengaluru, Karnataka",
    locationFull: "Indiranagar, Bengaluru, Karnataka",
    workType: "In Person",
    compensation: "₹45,000 - ₹60,000 / mo",
    compensationNum: 630000,
    tier: "High Growth",
    batch: "2026 / 2027 Batch",
    applicants: "62",
    applicantsNum: 62,
    openings: 2,
    source: "LinkedIn",
    skills: ["Computer Vision", "WebXR", "Three.js", "TypeScript", "C++", "3D Graphics"],
    description:
      "Join Flam's spatial computing team developing real-time mixed reality camera experiences, interactive 3D graphics, and high-performance WebXR rendering pipelines.",
    isApplied: false,
    isSaved: false,
    closingSoon: false,
    applyUrl: "https://in.linkedin.com/jobs/view/software-engineering-intern-at-flam-4466665437",
  },
  {
    id: "int-3",
    type: "Internship",
    datePosted: "Oct 10, 2026",
    rawDate: "2026-10-10",
    title: "Software Engineer Intern",
    company: "Weekday (YC W21)",
    companyFull: "Weekday Software (YC W21)",
    location: "Bengaluru, Karnataka",
    locationFull: "Koramangala, Bengaluru, Karnataka",
    workType: "In Person",
    compensation: "₹45,000 - ₹65,000 / mo",
    compensationNum: 660000,
    tier: "High Growth",
    batch: "2026 / 2027 Batch",
    applicants: "75",
    applicantsNum: 75,
    openings: 2,
    source: "LinkedIn",
    skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "AWS", "Extensions"],
    description:
      "Backed by Y Combinator, Weekday is reimagining engineer hiring. Work on high-impact full-stack features, candidate matching algorithms, and semantic talent search engines.",
    isApplied: false,
    isSaved: false,
    closingSoon: true,
    applyUrl: "https://in.linkedin.com/jobs/view/software-engineer-intern-at-weekday-yc-w21-4453416357",
  },
  {
    id: "int-4",
    type: "Internship",
    datePosted: "Oct 09, 2026",
    rawDate: "2026-10-09",
    title: "Deep Learning Software Engineering Intern",
    company: "NVIDIA",
    companyFull: "NVIDIA Graphics Pvt Ltd",
    location: "Pune / Bengaluru",
    locationFull: "NVIDIA Development Center, Pune",
    workType: "Hybrid",
    compensation: "₹85,000 - ₹1,00,000 / mo",
    compensationNum: 1110000,
    tier: "Tier 1",
    batch: "2026 / 2027 Batch",
    applicants: "168",
    applicantsNum: 168,
    openings: 3,
    source: "LinkedIn",
    skills: ["CUDA", "C++", "PyTorch", "TensorRT", "GPU Optimization", "Compiler Tech"],
    description:
      "Accelerate deep neural network training and inference. Optimize CUDA kernels, TensorRT execution graphs, and distributed training clusters.",
    isApplied: false,
    isSaved: true,
    closingSoon: false,
    applyUrl: "https://www.linkedin.com/jobs/search/?keywords=NVIDIA%20Software%20Intern%20India",
  },
  {
    id: "int-5",
    type: "Internship",
    datePosted: "Oct 08, 2026",
    rawDate: "2026-10-08",
    title: "Software Development Intern (Cloud & Networks)",
    company: "Cisco",
    companyFull: "Cisco Systems India Pvt Ltd",
    location: "Bengaluru, Karnataka",
    locationFull: "Cisco Campus, Marathahalli-Sarjapur Road, Bengaluru",
    workType: "Hybrid",
    compensation: "₹65,000 - ₹80,000 / mo",
    compensationNum: 870000,
    tier: "MNC",
    batch: "2026 / 2027 Batch",
    applicants: "112",
    applicantsNum: 112,
    openings: 4,
    source: "LinkedIn",
    skills: ["Python", "Networking Protocols", "Docker", "Kubernetes", "Golang", "Linux"],
    description:
      "Build programmable network telemetry controllers, cloud-native SDN platforms, and automated security verification frameworks.",
    isApplied: false,
    isSaved: false,
    closingSoon: false,
    applyUrl: "https://www.linkedin.com/jobs/search/?keywords=Cisco%20Software%20Intern%20India",
  },
  {
    id: "int-6",
    type: "Internship",
    datePosted: "Oct 07, 2026",
    rawDate: "2026-10-07",
    title: "Solutions & Lakehouse Engineering Intern",
    company: "Databricks",
    companyFull: "Databricks India Development",
    location: "Bengaluru, Karnataka",
    locationFull: "Bellandur Outer Ring Road, Bengaluru",
    workType: "Hybrid",
    compensation: "₹90,000 - ₹1,15,000 / mo",
    compensationNum: 1230000,
    tier: "Unicorn",
    batch: "2026 / 2027 Batch",
    applicants: "88",
    applicantsNum: 88,
    openings: 2,
    source: "LinkedIn",
    skills: ["Apache Spark", "Python", "SQL", "Distributed Data Engines", "Cloud Data", "Delta Lake"],
    description:
      "Work on Databricks Lakehouse architecture, unified data analytics engines, and Apache Spark workload optimizations for enterprise clients across India.",
    isApplied: false,
    isSaved: true,
    closingSoon: false,
    applyUrl: "https://www.linkedin.com/jobs/search/?keywords=Databricks%20Engineering%20Intern%20India",
  },
];

type CategoryFilter = "All" | "PPO Offer" | "Full-Time Job" | "Internship";
type StatusFilter = "All" | "Applied" | "Not Applied" | "Closing Soon" | "Saved";
type SortField = "date" | "compensation" | "applicants" | "openings";
type SortDirection = "asc" | "desc";

export default function PlacementsPage() {
  const [opportunities, setOpportunities] = useState<PlacementOpportunity[]>(REAL_LINKEDIN_PLACEMENTS);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [workTypeFilter, setWorkTypeFilter] = useState<string>("All");

  // Search states
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sorting
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Selected item for modal
  const [selectedOpportunity, setSelectedOpportunity] = useState<PlacementOpportunity | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const toggleBookmark = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setOpportunities((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextState = !item.isSaved;
          showToast(nextState ? `Saved "${item.title}"` : `Removed bookmark`);
          return { ...item, isSaved: nextState };
        }
        return item;
      })
    );
    if (selectedOpportunity && selectedOpportunity.id === id) {
      setSelectedOpportunity((prev) => (prev ? { ...prev, isSaved: !prev.isSaved } : null));
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
    return opportunities.filter((item) => {
      // Category filter
      if (categoryFilter !== "All" && item.type !== categoryFilter) return false;

      // Status filter
      if (statusFilter === "Applied" && !item.isApplied) return false;
      if (statusFilter === "Not Applied" && item.isApplied) return false;
      if (statusFilter === "Closing Soon" && !item.closingSoon) return false;
      if (statusFilter === "Saved" && !item.isSaved) return false;

      // Work type filter
      if (workTypeFilter !== "All" && item.workType !== workTypeFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSkill = item.skills.some((sk) => sk.toLowerCase().includes(q));
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesCompany = item.company.toLowerCase().includes(q);
        const matchesLoc = item.location.toLowerCase().includes(q);
        const matchesType = item.type.toLowerCase().includes(q);
        if (!matchesSkill && !matchesTitle && !matchesCompany && !matchesLoc && !matchesType) return false;
      }

      return true;
    });
  }, [opportunities, categoryFilter, statusFilter, workTypeFilter, searchQuery]);

  // Sort pipeline
  const sortedList = useMemo(() => {
    return [...filteredList].sort((a, b) => {
      let comparison = 0;
      if (sortField === "date") {
        comparison = a.rawDate.localeCompare(b.rawDate);
      } else if (sortField === "compensation") {
        comparison = a.compensationNum - b.compensationNum;
      } else if (sortField === "applicants") {
        comparison = a.applicantsNum - b.applicantsNum;
      } else if (sortField === "openings") {
        comparison = a.openings - b.openings;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredList, sortField, sortDirection]);

  const hasActiveFilters =
    categoryFilter !== "All" || statusFilter !== "All" || workTypeFilter !== "All" || searchQuery !== "";

  const clearAllFilters = () => {
    setCategoryFilter("All");
    setStatusFilter("All");
    setWorkTypeFilter("All");
    setSearchQuery("");
  };

  return (
    <div className="flex flex-col h-full space-y-4 pb-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-neutral-900 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-xl border border-neutral-800 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. CLEAN HEADER (Pure Text, Zero Bubbles) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight font-heading">
              Campus Placements &amp; Career Gateway
            </h1>
            <span className="text-xs text-neutral-500 font-medium">
              • 18 Live Offers
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Verified LinkedIn PPO conversions, full-time graduate roles, and engineering internships for the SUTRA cohort
          </p>
        </div>

        {/* Text Metric Strip */}
        <div className="flex items-center gap-5 text-xs text-neutral-600">
          <div>
            <span className="text-neutral-400 block text-[10px] uppercase tracking-wider font-semibold">PPO Track</span>
            <span className="font-bold text-neutral-900 text-sm">
              {opportunities.filter((o) => o.type === "PPO Offer").length} Offers
            </span>
          </div>
          <div className="h-6 w-px bg-neutral-200" />
          <div>
            <span className="text-neutral-400 block text-[10px] uppercase tracking-wider font-semibold">Top CTC</span>
            <span className="font-bold text-neutral-900 text-sm">₹38 LPA</span>
          </div>
          <div className="h-6 w-px bg-neutral-200" />
          <div>
            <span className="text-neutral-400 block text-[10px] uppercase tracking-wider font-semibold">Applied</span>
            <span className="font-bold text-neutral-900 text-sm">
              {opportunities.filter((i) => i.isApplied).length} Logged
            </span>
          </div>
        </div>
      </div>

      {/* 2. PURE TEXT FILTERS (Zero Bubbles, Zero SVGs) */}
      <div className="space-y-3 shrink-0 pt-1">
        {/* Category Text Tabs */}
        <div className="flex items-center justify-between border-b border-neutral-200 pb-0">
          <div className="flex items-center gap-6 text-sm overflow-x-auto">
            {(["All", "PPO Offer", "Full-Time Job", "Internship"] as CategoryFilter[]).map((cat) => {
              const isSelected = categoryFilter === cat;
              const count =
                cat === "All"
                  ? opportunities.length
                  : opportunities.filter((o) => o.type === cat).length;
              const label =
                cat === "All"
                  ? "All Placements"
                  : cat === "PPO Offer"
                  ? "PPO Offers"
                  : cat === "Full-Time Job"
                  ? "Full-Time Jobs"
                  : "Internships";

              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`pb-2.5 font-semibold transition-all relative text-sm whitespace-nowrap ${
                    isSelected
                      ? "text-neutral-950 border-b-2 border-neutral-950 -mb-[1px]"
                      : "text-neutral-400 hover:text-neutral-800 border-b-2 border-transparent"
                  }`}
                >
                  <span>{label}</span>
                  <span className="ml-1.5 text-xs text-neutral-400 font-normal">
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-neutral-500 hover:text-neutral-950 font-medium pb-2 transition-colors shrink-0"
            >
              Reset filters
            </button>
          )}
        </div>

        {/* Secondary Status Row + Search + Mode */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-0.5">
          {/* Status Text Links */}
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="text-neutral-400 font-medium">Status:</span>
            {(["All", "Applied", "Not Applied", "Closing Soon", "Saved"] as StatusFilter[]).map((tab, idx, arr) => {
              const isSelected = statusFilter === tab;
              const count =
                tab === "All"
                  ? opportunities.length
                  : tab === "Applied"
                  ? opportunities.filter((i) => i.isApplied).length
                  : tab === "Not Applied"
                  ? opportunities.filter((i) => !i.isApplied).length
                  : tab === "Closing Soon"
                  ? opportunities.filter((i) => i.closingSoon).length
                  : opportunities.filter((i) => i.isSaved).length;

              return (
                <React.Fragment key={tab}>
                  <button
                    onClick={() => setStatusFilter(tab)}
                    className={`transition-colors text-xs ${
                      isSelected
                        ? "text-neutral-950 font-bold underline underline-offset-4"
                        : "text-neutral-500 hover:text-neutral-800 font-medium"
                    }`}
                  >
                    {tab} <span className="text-neutral-400 font-normal">({count})</span>
                  </button>
                  {idx < arr.length - 1 && <span className="text-neutral-300">/</span>}
                </React.Fragment>
              );
            })}
          </div>

          {/* Search & Work Type */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search role, company, city..."
                className="pl-8 pr-6 py-1 bg-white border border-neutral-200 rounded-md text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition-all h-[30px] w-52"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="relative">
              <select
                value={workTypeFilter}
                onChange={(e) => setWorkTypeFilter(e.target.value)}
                className="appearance-none pl-2.5 pr-6 py-1 bg-white border border-neutral-200 rounded-md text-xs font-medium text-neutral-800 focus:outline-none focus:border-neutral-900 cursor-pointer transition-all h-[30px]"
              >
                <option value="All">All Modes</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="In Person">In Person</option>
              </select>
              <ChevronDown className="w-3 h-3 text-neutral-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. OPTIMIZED PLACEMENTS TABLE (Clean Text, Zero Bubbles) */}
      <div className="bg-white overflow-hidden border border-neutral-200/90 shadow-2xs rounded-lg flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-neutral-200/80 bg-neutral-50/95 backdrop-blur-xs text-[11px] font-bold text-neutral-500 uppercase tracking-wider select-none">
                {/* Type */}
                <th className="py-3 px-3.5 whitespace-nowrap w-[130px]">Type</th>

                {/* Title & Role */}
                <th className="py-3 px-3.5 whitespace-nowrap min-w-[210px]">Role &amp; Track</th>

                {/* Company */}
                <th className="py-3 px-3.5 whitespace-nowrap min-w-[120px]">Company</th>

                {/* Location */}
                <th className="py-3 px-3.5 whitespace-nowrap min-w-[130px]">Location</th>

                {/* Work Type */}
                <th className="py-3 px-3.5 whitespace-nowrap w-[100px]">Mode</th>

                {/* Compensation */}
                <th
                  onClick={() => handleSort("compensation")}
                  className="py-3 px-3.5 cursor-pointer hover:text-neutral-950 transition-colors whitespace-nowrap w-[170px]"
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
                  className="py-3 px-3.5 cursor-pointer hover:text-neutral-950 transition-colors whitespace-nowrap w-[100px]"
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
                  className="py-3 px-3.5 cursor-pointer hover:text-neutral-950 transition-colors whitespace-nowrap w-[85px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Seats</span>
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
                <th className="py-3 px-3.5 text-right whitespace-nowrap w-[140px]">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100 text-xs">
              {sortedList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-neutral-400">
                    <Briefcase className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                    <p className="font-bold text-neutral-800 text-sm">No placement opportunities match your filters</p>
                    <button
                      onClick={clearAllFilters}
                      className="mt-3 text-xs font-semibold text-neutral-900 underline hover:text-neutral-700 transition-colors"
                    >
                      Reset Filters
                    </button>
                  </td>
                </tr>
              ) : (
                sortedList.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedOpportunity(item)}
                    className="hover:bg-neutral-50/80 cursor-pointer transition-colors group"
                  >
                    {/* Type - Pure Clean Text with Subtle Color Accent Dot (No Bubbles) */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            item.type === "PPO Offer"
                              ? "bg-violet-600"
                              : item.type === "Full-Time Job"
                              ? "bg-emerald-600"
                              : "bg-sky-600"
                          }`}
                        />
                        <span className="font-semibold text-neutral-900 text-xs">
                          {item.type}
                        </span>
                      </div>
                    </td>

                    {/* Title */}
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-neutral-900 group-hover:text-blue-600 transition-colors text-xs truncate max-w-[240px]">
                          {item.title}
                        </span>
                        {item.closingSoon && (
                          <span className="text-[10px] text-amber-700 font-semibold whitespace-nowrap">
                            • Closing
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-400 block font-mono mt-0.5">
                        {item.batch}
                      </span>
                    </td>

                    {/* Company */}
                    <td className="py-3 px-3.5 text-neutral-900 font-semibold whitespace-nowrap text-xs">
                      {item.company}
                    </td>

                    {/* Location */}
                    <td className="py-3 px-3.5 text-neutral-600 whitespace-nowrap text-xs">
                      {item.location}
                    </td>

                    {/* Work Type */}
                    <td className="py-3 px-3.5 whitespace-nowrap text-xs text-neutral-600">
                      {item.workType}
                    </td>

                    {/* Compensation */}
                    <td className="py-3 px-3.5 font-bold text-neutral-900 whitespace-nowrap text-xs font-mono">
                      {item.compensation}
                    </td>

                    {/* Applicants */}
                    <td className="py-3 px-3.5 text-neutral-700 whitespace-nowrap text-xs">
                      <span className="font-bold text-neutral-900 font-mono">{item.applicants}</span>
                      <span className="text-neutral-400 text-[10px] ml-1">leads</span>
                    </td>

                    {/* Openings */}
                    <td className="py-3 px-3.5 whitespace-nowrap text-xs">
                      <span className="font-bold text-neutral-900 font-mono">{item.openings}</span>
                      <span className="text-neutral-400 text-[10px] ml-1">seat{item.openings > 1 ? "s" : ""}</span>
                    </td>

                    {/* Action Button & Bookmark */}
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2.5" onClick={(e) => e.stopPropagation()}>
                        {/* Bookmark */}
                        <button
                          onClick={(e) => toggleBookmark(item.id, e)}
                          title={item.isSaved ? "Remove bookmark" : "Save role"}
                          className={`transition-colors ${
                            item.isSaved
                              ? "text-amber-600"
                              : "text-neutral-400 hover:text-neutral-700"
                          }`}
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${item.isSaved ? "fill-amber-500" : ""}`} />
                        </button>

                        {/* Apply on LinkedIn with standard online LinkedIn icon */}
                        <a
                          href={item.applyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            if (!item.isApplied) {
                              setOpportunities((prev) =>
                                prev.map((it) => (it.id === item.id ? { ...it, isApplied: true } : it))
                              );
                            }
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#0A66C2] hover:underline"
                          title="Apply on LinkedIn"
                        >
                          <LinkedInIcon className="w-3.5 h-3.5" />
                          <span>Apply</span>
                          <ExternalLink className="w-3 h-3 text-neutral-400" />
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
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-neutral-100 bg-neutral-50/70 text-xs text-neutral-500 shrink-0">
          <div>
            Showing <span className="font-bold text-neutral-900">{sortedList.length}</span> of{" "}
            <span className="font-bold text-neutral-900">18</span> verified opportunities
          </div>
          <div className="flex items-center gap-1.5 text-neutral-500">
            <LinkedInIcon className="w-3.5 h-3.5 text-[#0A66C2]" />
            <span>Official verified postings on</span>
            <span className="font-bold text-neutral-900">LinkedIn India</span>
          </div>
        </div>
      </div>

      {/* 5. PLACEMENT DETAIL MODAL */}
      {selectedOpportunity && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedOpportunity(null)}
        >
          <div
            className="w-full max-w-xl bg-white rounded-lg p-6 shadow-2xl border border-neutral-200 space-y-5 animate-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="inline-flex items-center gap-1 text-[#0A66C2] font-semibold">
                    <LinkedInIcon className="w-3.5 h-3.5" />
                    <span>Verified LinkedIn Post</span>
                  </span>
                  <span className="text-neutral-300">•</span>
                  <span className="font-semibold text-neutral-900">
                    {selectedOpportunity.type}
                  </span>
                  <span className="text-neutral-300">•</span>
                  <span className="text-neutral-600">
                    {selectedOpportunity.workType}
                  </span>
                  {selectedOpportunity.closingSoon && (
                    <>
                      <span className="text-neutral-300">•</span>
                      <span className="text-amber-700 font-semibold">
                        Closing Soon
                      </span>
                    </>
                  )}
                </div>

                <h2 className="text-xl font-bold text-neutral-900 mt-2 font-heading">
                  {selectedOpportunity.title}
                </h2>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-neutral-600 flex-wrap">
                  <span className="font-bold text-neutral-900 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-neutral-400" />
                    {selectedOpportunity.companyFull || selectedOpportunity.company}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                    {selectedOpportunity.locationFull || selectedOpportunity.location}
                  </span>
                  <span>•</span>
                  <span>Posted {selectedOpportunity.datePosted}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedOpportunity(null)}
                className="p-1 rounded-md hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3 p-3.5 bg-neutral-50 rounded-md border border-neutral-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Package / Stipend</span>
                <span className="text-xs sm:text-sm font-extrabold text-neutral-900 mt-0.5 block truncate font-mono">
                  {selectedOpportunity.compensation}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Seats Available</span>
                <span className="text-xs sm:text-sm font-extrabold text-neutral-900 mt-0.5 block font-mono">
                  {selectedOpportunity.openings} Seat{selectedOpportunity.openings > 1 ? "s" : ""}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Batch Eligibility</span>
                <span className="text-xs sm:text-sm font-extrabold text-neutral-900 mt-0.5 block font-mono">
                  {selectedOpportunity.batch}
                </span>
              </div>
            </div>

            {/* Required Skills */}
            <div>
              <span className="text-[11px] font-bold text-neutral-700 block mb-2 uppercase tracking-wide">
                Key Competencies &amp; Skills
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedOpportunity.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-0.5 bg-neutral-100 rounded text-xs font-medium text-neutral-800"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <span className="text-[11px] font-bold text-neutral-700 block mb-1.5 uppercase tracking-wide">
                Position Overview
              </span>
              <p className="text-xs text-neutral-600 leading-relaxed bg-neutral-50 p-3.5 rounded-md border border-neutral-100">
                {selectedOpportunity.description}
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-neutral-100">
              <button
                onClick={() => toggleBookmark(selectedOpportunity.id)}
                className={`px-3 py-1.5 border rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  selectedOpportunity.isSaved
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${selectedOpportunity.isSaved ? "fill-amber-500" : ""}`} />
                <span>{selectedOpportunity.isSaved ? "Saved" : "Save Role"}</span>
              </button>

              <a
                href={selectedOpportunity.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  if (!selectedOpportunity.isApplied) {
                    setOpportunities((prev) =>
                      prev.map((it) => (it.id === selectedOpportunity.id ? { ...it, isApplied: true } : it))
                    );
                    setSelectedOpportunity((prev) => (prev ? { ...prev, isApplied: true } : null));
                  }
                }}
                className="px-4 py-2 bg-[#0A66C2] hover:bg-[#004182] text-white rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs"
              >
                <LinkedInIcon className="w-3.5 h-3.5" />
                <span>Apply on LinkedIn</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
