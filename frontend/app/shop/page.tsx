"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import {
  Sparkles,
  ShoppingBag,
  Award,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Filter,
  ArrowRight,
  Clock,
  ShieldCheck,
  ChevronRight,
  Package,
  MapPin,
  RefreshCw,
  Info,
  ChevronDown,
  Gift,
  Flame,
  Tag,
} from "lucide-react";
import {
  SUTRA_CATALOGUE,
  ShopProduct,
  ProductCategory,
  StudentRewardsAccount,
  RedemptionRecord,
  ELIGIBILITY_THRESHOLD_POINTS,
} from "@/lib/shop-data";
import { shopApi } from "@/lib/shop-api";
import { useSkillHub } from "@/lib/store";

export default function SutraShopPage() {
  const { currentPersona } = useSkillHub();

  // State management
  const [selectedStudentId, setSelectedStudentId] = useState<string>("66666666-6666-6666-6666-666666666666");
  const [account, setAccount] = useState<StudentRewardsAccount | null>(null);
  const [redemptions, setRedemptions] = useState<RedemptionRecord[]>([]);
  const [isLoadingAccount, setIsLoadingAccount] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isPersonaMenuOpen, setIsPersonaMenuOpen] = useState<boolean>(false);

  // Catalogue filtering & search
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"recommended" | "points-asc" | "points-desc">("recommended");
  const [onlyAffordable, setOnlyAffordable] = useState<boolean>(false);

  // Modals & Drawers
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
  const [activeVariantSelections, setActiveVariantSelections] = useState<Record<string, string>>({});
  const [activeQuantity, setActiveQuantity] = useState<number>(1);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState<boolean>(false);
  const [isPackagingModalOpen, setIsPackagingModalOpen] = useState<boolean>(false);
  const [isSubmittingRedeem, setIsSubmittingRedeem] = useState<boolean>(false);
  const [lastCompletedRedemption, setLastCompletedRedemption] = useState<RedemptionRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Animation DOM Refs
  const gridRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load account and redemption records
  const loadStudentData = async (studentId: string, showSpinner = true) => {
    if (showSpinner) setIsLoadingAccount(true);
    try {
      const [accData, historyData] = await Promise.all([
        shopApi.getBalance(studentId),
        shopApi.getHistory(studentId),
      ]);
      setAccount(accData);
      setRedemptions(historyData);
    } catch (err: any) {
      console.error("Error loading shop data:", err);
      showToast("error", err?.message || "Failed to load shop account details.");
    } finally {
      setIsLoadingAccount(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadStudentData(selectedStudentId);
  }, [selectedStudentId]);

  const showToast = (type: "success" | "error" | "info", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // Open product details modal and initialize default variants
  const handleOpenProduct = (product: ShopProduct) => {
    setSelectedProduct(product);
    const defaults: Record<string, string> = {};
    product.variantOptions.forEach((opt) => {
      defaults[opt.name] = opt.values[0];
    });
    setActiveVariantSelections(defaults);
    setActiveQuantity(1);
  };

  // Filter & Sort Catalogue
  const filteredProducts = useMemo(() => {
    let list = [...SUTRA_CATALOGUE];

    if (selectedCategory !== "all") {
      list = list.filter((p) => p.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.tagline.toLowerCase().includes(query) ||
          p.materials.toLowerCase().includes(query)
      );
    }

    if (onlyAffordable && account) {
      list = list.filter((p) => p.pointsCost <= account.availablePoints);
    }

    if (sortBy === "points-asc") {
      list.sort((a, b) => a.pointsCost - b.pointsCost);
    } else if (sortBy === "points-desc") {
      list.sort((a, b) => b.pointsCost - a.pointsCost);
    } else {
      list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }

    return list;
  }, [selectedCategory, searchQuery, sortBy, onlyAffordable, account]);

  // GSAP: Staggered animation on product grid cards when filter or list changes
  useEffect(() => {
    if (gridRef.current) {
      const cards = gridRef.current.querySelectorAll(".merch-card");
      if (cards.length > 0) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 30, scale: 0.98 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.5,
            stagger: 0.04,
            ease: "power3.out",
          }
        );
      }
    }
  }, [filteredProducts]);

  // GSAP: Hero entrance animation
  useEffect(() => {
    if (heroRef.current) {
      const elements = heroRef.current.querySelectorAll(".gsap-reveal");
      if (elements.length > 0) {
        gsap.fromTo(
          elements,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: "power3.out" }
        );
      }
    }
  }, []);

  // Keyboard shortcut (Cmd+K / Ctrl+K) to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // GSAP: Modal pop-in animation
  useEffect(() => {
    if (selectedProduct && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, scale: 0.94, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: "power4.out" }
      );
    }
  }, [selectedProduct]);

  // Execute Redemption
  const handleConfirmRedemption = async () => {
    if (!selectedProduct || !account) return;
    setIsSubmittingRedeem(true);

    const idempotencyKey = `rdm-${account.studentId}-${selectedProduct.id}-${Date.now()}`;

    try {
      const response = await shopApi.redeemProduct({
        studentId: account.studentId,
        productId: selectedProduct.id,
        variantSelections: activeVariantSelections,
        quantity: activeQuantity,
        idempotencyKey,
      });

      if (response.success && response.redemption) {
        setLastCompletedRedemption(response.redemption);
        if (response.updatedAccount) {
          setAccount(response.updatedAccount);
        }
        const updatedHistory = await shopApi.getHistory(account.studentId);
        setRedemptions(updatedHistory);
        setIsConfirmModalOpen(false);
        showToast("success", `Redemption confirmed! ${response.redemption.productName} is scheduled for campus pickup.`);
      } else {
        throw new Error(response.message || "Redemption could not be completed.");
      }
    } catch (err: any) {
      console.error("Redemption failed:", err);
      showToast("error", err?.message || "Redemption failed. Please try again.");
    } finally {
      setIsSubmittingRedeem(false);
    }
  };

  const currentAvailablePoints = account?.availablePoints ?? 0;
  const currentLifetimePoints = account?.lifetimePoints ?? 0;
  const isEligible = account?.isEligible ?? false;
  const pointsShortOfEligibility = Math.max(0, ELIGIBILITY_THRESHOLD_POINTS - currentLifetimePoints);

  const selectedTotalCost = (selectedProduct?.pointsCost || 0) * activeQuantity;
  const hasSufficientPoints = currentAvailablePoints >= selectedTotalCost;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased selection:bg-[#d2f831] selection:text-slate-950">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 max-w-md shadow-2xl rounded-2xl overflow-hidden border border-white/20">
          <div
            className={`p-4 flex items-start gap-3 ${
              toastMessage.type === "success"
                ? "bg-slate-950 text-white"
                : toastMessage.type === "error"
                ? "bg-rose-900 text-white"
                : "bg-slate-900 text-white"
            }`}
          >
            {toastMessage.type === "success" && <CheckCircle2 className="w-5 h-5 text-[#d2f831] shrink-0 mt-0.5" />}
            {toastMessage.type === "error" && <AlertCircle className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />}
            {toastMessage.type === "info" && <Info className="w-5 h-5 text-sky-300 shrink-0 mt-0.5" />}
            <div className="flex-1 text-xs font-semibold leading-relaxed">{toastMessage.text}</div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-white/70 hover:text-white p-1 rounded-md"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* TOP ANNOUNCEMENT TICKER (Inspired by Streetwear/Merch Drops) */}
      <div className="bg-slate-950 text-white border-b border-white/10 overflow-hidden py-2 select-none">
        <div className="animate-merch-marquee text-[11px] font-merch-mono font-bold uppercase tracking-widest text-slate-300">
          <span className="mx-6 text-[#d2f831]">✦ SUTRA SUPPLY DROP 01</span>
          <span className="mx-6 text-slate-400">•</span>
          <span className="mx-6">OFFICIAL CAMPUS PROVISIONS</span>
          <span className="mx-6 text-slate-400">•</span>
          <span className="mx-6 text-[#d2f831]">EARNED, NOT BOUGHT</span>
          <span className="mx-6 text-slate-400">•</span>
          <span className="mx-6">ZERO MONETARY PURCHASE</span>
          <span className="mx-6 text-slate-400">•</span>
          <span className="mx-6">UNLOCKED VIA VERIFIED EFFORT</span>
          <span className="mx-6 text-slate-400">•</span>
          <span className="mx-6 text-[#38bdf8]">PICKUP AT BLDG 4 DESK</span>
          <span className="mx-6 text-slate-400">•</span>
          <span className="mx-6">100% GOTS ORGANIC &amp; ARCHIVAL QUALITY</span>
          <span className="mx-6 text-slate-400">•</span>
          <span className="mx-6 text-[#d2f831]">✦ SUTRA SUPPLY DROP 01</span>
          <span className="mx-6 text-slate-400">•</span>
          <span className="mx-6">OFFICIAL CAMPUS PROVISIONS</span>
          <span className="mx-6 text-slate-400">•</span>
          <span className="mx-6 text-[#d2f831]">EARNED, NOT BOUGHT</span>
          <span className="mx-6 text-slate-400">•</span>
          <span className="mx-6">ZERO MONETARY PURCHASE</span>
          <span className="mx-6 text-slate-400">•</span>
          <span className="mx-6">UNLOCKED VIA VERIFIED EFFORT</span>
          <span className="mx-6 text-slate-400">•</span>
          <span className="mx-6 text-[#38bdf8]">PICKUP AT BLDG 4 DESK</span>
        </div>
      </div>

      {/* HIGH-END NAVIGATION BAR (Matching Images 2 & 3: Deep Slate-950, Crisp White, Neon Accent) */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/20 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-4">
            <Link href="/shop" className="group flex items-center gap-2.5">
              <div className="w-8 h-8 flex items-center justify-center shrink-0">
                <img
                  src="/sutra-logo.svg"
                  alt="Sutra Logo"
                  className="w-8 h-8 object-contain brightness-0 invert transition-transform duration-200 group-hover:scale-105"
                  draggable={false}
                />
              </div>
              <span className="font-merch-display font-extrabold text-2xl tracking-tight text-white">
                Sutra<span className="text-[#d2f831]">.</span>
              </span>
              <span className="text-[10px] font-merch-mono font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#d2f831] text-slate-950 shadow-xs">
                SUPPLY
              </span>
            </Link>
          </div>

          {/* Center: Curated Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-bold uppercase tracking-wider text-slate-300">
            <a href="#provisions-catalogue" className="hover:text-white transition-colors">
              Provisions
            </a>
            <button
              onClick={() => setIsPackagingModalOpen(true)}
              className="hover:text-white transition-colors"
            >
              Standards
            </button>
            <span className="text-slate-600">•</span>
            <span className="text-[#38bdf8] flex items-center gap-1.5 font-semibold">
              <MapPin className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Campus Hub Bldg 4</span>
            </span>
          </nav>

          {/* Right: Evaluator Switcher & Spendable Points Chip */}
          <div className="flex items-center gap-3">
            {/* Dropdown Persona Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsPersonaMenuOpen(!isPersonaMenuOpen)}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-inner"
                aria-expanded={isPersonaMenuOpen}
                aria-label="Switch Student Persona"
              >
                <div className="w-2 h-2 rounded-full bg-[#d2f831]" />
                <span className="max-w-[120px] sm:max-w-none truncate font-medium">
                  {account?.studentName ? account.studentName.split(" ")[0] : "Student"}
                </span>
                <span className="text-[11px] text-slate-400 font-merch-mono hidden sm:inline">
                  ({currentAvailablePoints} pts)
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                    isPersonaMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Floating Dropdown Card */}
              {isPersonaMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/80 p-2 z-50 text-white animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 text-[10px] font-merch-mono font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    Switch Evaluator Persona
                  </div>
                  <div className="py-1 space-y-1">
                    <button
                      onClick={() => {
                        setSelectedStudentId("66666666-6666-6666-6666-666666666666");
                        setIsPersonaMenuOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors flex items-center justify-between ${
                        selectedStudentId === "66666666-6666-6666-6666-666666666666"
                          ? "bg-white text-slate-950 font-bold"
                          : "hover:bg-slate-800 text-slate-200"
                      }`}
                    >
                      <div>
                        <div>Asha Rao</div>
                        <div
                          className={`text-[10px] ${
                            selectedStudentId === "66666666-6666-6666-6666-666666666666"
                              ? "text-slate-600 font-normal"
                              : "text-[#d2f831]"
                          }`}
                        >
                          600 pts • Verified Eligible
                        </div>
                      </div>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-black/10">
                        Active
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedStudentId("student-below-threshold");
                        setIsPersonaMenuOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors flex items-center justify-between ${
                        selectedStudentId === "student-below-threshold"
                          ? "bg-white text-slate-950 font-bold"
                          : "hover:bg-slate-800 text-slate-200"
                      }`}
                    >
                      <div>
                        <div>Rohan Sharma</div>
                        <div
                          className={`text-[10px] ${
                            selectedStudentId === "student-below-threshold"
                              ? "text-slate-600 font-normal"
                              : "text-amber-400"
                          }`}
                        >
                          350 pts • Locked (&lt;500 Threshold)
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-amber-300">Locked</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedStudentId("student-low-balance");
                        setIsPersonaMenuOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors flex items-center justify-between ${
                        selectedStudentId === "student-low-balance"
                          ? "bg-white text-slate-950 font-bold"
                          : "hover:bg-slate-800 text-slate-200"
                      }`}
                    >
                      <div>
                        <div>Priya Nair</div>
                        <div
                          className={`text-[10px] ${
                            selectedStudentId === "student-low-balance"
                              ? "text-slate-600 font-normal"
                              : "text-slate-400"
                          }`}
                        >
                          80 pts • Eligible Low Balance
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-rose-400">Low PTS</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Neon Chartreuse Points Chip (Matching Landing Page Button / Bento Accent) */}
            <div className="flex items-center gap-1.5 bg-[#d2f831] text-slate-950 rounded-xl px-3.5 py-2 font-bold shadow-md shadow-[#d2f831]/20">
              <Sparkles className="w-4 h-4 text-slate-950" />
              <div className="flex items-baseline gap-1">
                <span className="font-merch-display font-black text-sm sm:text-base tracking-tight text-slate-950">
                  {currentAvailablePoints.toLocaleString()}
                </span>
                <span className="text-[10px] font-merch-mono font-black tracking-wider text-slate-950">
                  PTS
                </span>
              </div>
            </div>

            {/* Orders Bag Trigger */}
            <button
              onClick={() => setIsHistoryDrawerOpen(true)}
              className="relative p-2.5 rounded-xl border border-white/20 bg-slate-900 text-white hover:bg-slate-850 transition-colors"
              aria-label="View Redemption History"
              title="Redemption History"
            >
              <ShoppingBag className="w-5 h-5 text-white" />
              {redemptions.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#d2f831] text-slate-950 rounded-full text-[10px] font-black flex items-center justify-center border-2 border-slate-950 shadow-sm">
                  {redemptions.length}
                </span>
              )}
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => {
                setIsRefreshing(true);
                loadStudentData(selectedStudentId, false);
              }}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl border border-white/20 bg-slate-900 text-slate-400 hover:text-white transition-colors"
              title="Refresh Balance"
              aria-label="Refresh Balance"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#d2f831]" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* EDITORIAL HERO SECTION (Image 1 Cards REMOVED completely; Sleek Merch Drop Identity) */}
        <section ref={heroRef} className="space-y-6 pt-2">
          {/* Subheader kicker with live eligibility tag */}
          <div className="gsap-reveal flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
            <div className="inline-flex items-center gap-2 text-xs font-merch-mono font-bold uppercase tracking-widest text-slate-500">
              <span className="w-2 h-2 rounded-full bg-[#d2f831] animate-pulse" />
              <span>SUTRA SUPPLY • OFFICIAL CAMPUS PROVISIONS</span>
            </div>
            <div className="text-xs text-slate-600 flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full border border-slate-200 shadow-2xs font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>500 Lifetime Points Eligibility Threshold</span>
            </div>
          </div>

          {/* High-Impact Merch Headline (Image 1 fix: 'made for your next' smaller & less bold, 'chapter.' bigger, bolder, accent color) */}
          <div className="gsap-reveal space-y-3">
            {/* Made for your next chapter. */}
            <h1
              aria-label="Made for your next chapter."
              className="font-merch-display tracking-[-0.03em] leading-tight"
            >
              <span className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-800 align-baseline mr-2.5 sm:mr-3">
                Made for your next
              </span>
              <span className="text-5xl sm:text-6xl lg:text-7xl font-black text-[#84CC16] tracking-tight align-baseline inline-block hover:scale-105 transition-transform duration-200 cursor-default">
                chapter.
              </span>
            </h1>
            <p className="font-merch-display font-medium text-lg sm:text-xl text-slate-600 tracking-tight">
              Earned, not bought. Your effort. Your points. Your SUTRA essentials.
            </p>
          </div>

          {/* Minimalist Student Account Status Strip (Clean, single-line horizontal status - NOT the 4 cards) */}
          <div className="gsap-reveal flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-950 text-white font-merch-display font-black flex items-center justify-center text-sm">
                {account?.studentName ? account.studentName[0] : "S"}
              </div>
              <div>
                <div className="font-merch-display font-bold text-sm text-slate-950">
                  {account?.studentName}
                </div>
                <div className="text-xs text-slate-500">{account?.cohort}</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl font-medium text-slate-600">
                Lifetime Earned: <strong className="text-slate-950 font-merch-mono">{currentLifetimePoints} PTS</strong>
              </div>
              <div className="bg-[#d2f831]/20 border border-[#d2f831] text-slate-950 px-3 py-1.5 rounded-xl font-bold">
                Spendable: <strong className="font-merch-mono">{currentAvailablePoints} PTS</strong>
              </div>
              <div
                className={`px-3 py-1.5 rounded-xl font-bold border flex items-center gap-1.5 ${
                  isEligible
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-amber-50 border-amber-200 text-amber-800"
                }`}
              >
                {isEligible ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Eligible for Redemption</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Need {pointsShortOfEligibility} more pts to unlock</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* CATALOGUE CONTROLS & FILTER BAR (Image 2 fix: Search bar on leftmost side, professionally arranged) */}
        <section id="provisions-catalogue" className="space-y-6">
          <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between pb-4 border-b border-slate-200/80">
            {/* Left Group: Search Bar on Far Left + Category Filter Pills */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 flex-1 min-w-0">
              {/* Leftmost Search Bar */}
              <div className="relative w-full sm:w-72 lg:w-80 shrink-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search provisions, gear..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-950 focus:ring-1 focus:ring-slate-950 shadow-2xs transition-all"
                />
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-100 transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="hidden sm:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-merch-mono font-bold text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded pointer-events-none">
                    ⌘K
                  </span>
                )}
              </div>

              {/* Vertical subtle divider */}
              <div className="h-6 w-px bg-slate-200 hidden sm:block shrink-0" />

              {/* Category Pills directly next to Search Bar (No cutoff, shrink-0 on pills) */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 shrink-0">
                {[
                  { id: "all", label: "All Provisions" },
                  { id: "apparel", label: "Apparel" },
                  { id: "stationery", label: "Stationery" },
                  { id: "desk-tech", label: "Desk & Tech" },
                  { id: "accessories", label: "Accessories" },
                ].map((cat) => {
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id as ProductCategory)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                        isActive
                          ? "bg-slate-950 text-white shadow-xs"
                          : "bg-white text-slate-600 hover:text-slate-950 hover:bg-slate-50 border border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Group: Provision Count Badge, Sort Dropdown, and Can Redeem Now Switch */}
            <div className="flex items-center gap-3 justify-end shrink-0 pt-2 xl:pt-0">
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-merch-mono font-bold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span>
                  {filteredProducts.length} {filteredProducts.length === 1 ? "Item" : "Items"}
                </span>
              </div>

              {/* Sort Selector */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="appearance-none bg-white border border-slate-200 text-slate-800 text-xs font-semibold py-2.5 pl-3.5 pr-8 rounded-xl focus:outline-none focus:border-slate-950 hover:border-slate-300 cursor-pointer shadow-2xs transition-colors"
                >
                  <option value="recommended">Featured / Curated</option>
                  <option value="points-asc">Points: Low to High</option>
                  <option value="points-desc">Points: High to Low</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Only Affordable Filter */}
              <label
                className={`flex items-center gap-2 cursor-pointer border px-3.5 py-2.5 rounded-xl text-xs font-semibold select-none shadow-2xs transition-all ${
                  onlyAffordable
                    ? "bg-slate-950 text-white border-slate-950"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={onlyAffordable}
                  onChange={(e) => setOnlyAffordable(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors ${
                    onlyAffordable
                      ? "bg-[#d2f831] border-[#d2f831] text-slate-950"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {onlyAffordable && (
                    <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 12 12">
                      <path d="M10.28 2.28L3.989 8.575 1.707 6.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l7-7a1 1 0 00-1.414-1.414z" />
                    </svg>
                  )}
                </div>
                <span>Can Redeem Now</span>
              </label>
            </div>
          </div>

          {/* MERCHANDISE GRID WITH GSAP STAGGER (Streetwear & Luxury Lookbook Aesthetic) */}
          {filteredProducts.length === 0 ? (
            <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 space-y-4">
              <Package className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="font-merch-display font-bold text-lg text-slate-950">No Provisions Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No items match your active filters. Try resetting the search or category to view the complete catalogue.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory("all");
                  setSearchQuery("");
                  setOnlyAffordable(false);
                }}
                className="px-5 py-2.5 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-[#d2f831] hover:text-slate-950 transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div
              ref={gridRef}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7"
            >
              {filteredProducts.map((product) => {
                const canAfford = currentAvailablePoints >= product.pointsCost;
                const shortfall = Math.max(0, product.pointsCost - currentAvailablePoints);

                return (
                  <article
                    key={product.id}
                    onClick={() => handleOpenProduct(product)}
                    className="merch-card group bg-white rounded-3xl border border-slate-200/90 overflow-hidden flex flex-col justify-between hover:border-slate-400 hover:shadow-xl transition-all duration-300 cursor-pointer"
                  >
                    <div>
                      {/* LARGE HERO PRODUCT VISUAL (aspect-[4/5] Streetwear Presentation) */}
                      <div className="relative aspect-[4/5] bg-slate-100 overflow-hidden">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />

                        {/* Top Left: Category & Badge */}
                        <div className="absolute top-3.5 left-3.5 flex flex-col gap-1.5 items-start">
                          <span className="px-2.5 py-1 rounded-full text-[9px] font-merch-mono font-black tracking-widest uppercase bg-white/95 backdrop-blur-md text-slate-950 border border-slate-200 shadow-xs">
                            {product.categoryLabel}
                          </span>
                          {product.badge && (
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase bg-slate-950 text-[#d2f831] shadow-xs">
                              {product.badge}
                            </span>
                          )}
                        </div>

                        {/* Top Right: SUTRA Brand Watermark Tag */}
                        <div className="absolute top-3.5 right-3.5 bg-slate-950/70 backdrop-blur-md text-white text-[9px] font-merch-mono font-black tracking-widest px-2 py-0.5 rounded-md uppercase">
                          SUTRA.
                        </div>

                        {/* Bottom Right: Neon Chartreuse Points Tag */}
                        <div className="absolute bottom-3.5 right-3.5 bg-[#d2f831] text-slate-950 px-3.5 py-1.5 rounded-full font-merch-display font-black text-xs shadow-md border border-black/10">
                          {product.pointsCost}{" "}
                          <span className="text-[10px] font-merch-mono font-bold">PTS</span>
                        </div>
                      </div>

                      {/* CARD DETAILS: ULTRA-MINIMAL (No paragraphs of text!) */}
                      <div className="p-5 pb-3 space-y-1">
                        <h3 className="font-merch-display font-black text-lg text-slate-950 group-hover:text-slate-800 transition-colors leading-snug">
                          {product.name}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium line-clamp-1">
                          {product.tagline}
                        </p>
                      </div>
                    </div>

                    {/* CARD FOOTER & ACTION STATUS */}
                    <div className="p-5 pt-0">
                      {!isEligible ? (
                        <div className="w-full py-2.5 px-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center justify-between">
                          <span>Inspect Provisions</span>
                          <span className="text-[10px] font-semibold text-amber-700">Threshold locked</span>
                        </div>
                      ) : canAfford ? (
                        <div className="w-full py-2.5 px-4 rounded-xl bg-slate-950 text-white text-xs font-bold group-hover:bg-[#d2f831] group-hover:text-slate-950 transition-colors flex items-center justify-between shadow-xs">
                          <span>Inspect &amp; Redeem</span>
                          <ChevronRight className="w-4 h-4 text-[#d2f831] group-hover:text-slate-950 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      ) : (
                        <div className="w-full py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs font-semibold flex items-center justify-between">
                          <span>Inspect Details</span>
                          <span className="text-[11px] font-bold text-rose-600">
                            Short {shortfall} pts
                          </span>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* PRODUCT DETAILS MODAL (Spacious Luxury Editorial Modal - Image 1 fix) */}
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-slate-950/75 backdrop-blur-md animate-fade-in">
            <div
              ref={modalRef}
              className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-y-auto border border-slate-200 shadow-2xl relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-5 right-5 z-20 p-2.5 rounded-full bg-white/90 hover:bg-white text-slate-950 border border-slate-200 shadow-md transition-all hover:scale-105"
                aria-label="Close product modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                {/* Visual Showcase Side (Left Column - Spacious Gallery Stage) */}
                <div className="lg:col-span-6 p-8 sm:p-10 bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col justify-between space-y-6">
                  {/* Top Category & Verification Tag */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-merch-mono font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-slate-950 text-[#d2f831]">
                      {selectedProduct.categoryLabel} • SUTRA SUPPLY
                    </span>
                    <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Verified Campus Provision</span>
                    </span>
                  </div>

                  {/* Main Product Photography Display */}
                  <div className="relative w-full aspect-[4/3] rounded-2xl bg-white p-4 shadow-sm border border-slate-200 flex items-center justify-center overflow-hidden group">
                    <img
                      src={selectedProduct.image}
                      alt={selectedProduct.name}
                      className="w-full h-full object-contain sm:object-cover rounded-xl transition-all duration-500 group-hover:scale-105"
                    />
                    <div className="absolute bottom-3 right-3 bg-slate-950/75 backdrop-blur-md text-white text-[9px] font-merch-mono font-black tracking-widest px-2.5 py-1 rounded-md uppercase">
                      SUTRA AUTHENTIC
                    </div>
                  </div>

                  {/* Standards & Packaging Specifications Cards */}
                  <div className="space-y-3">
                    <div className="p-4 bg-white rounded-2xl border border-slate-200 text-xs space-y-1 shadow-2xs">
                      <div className="font-bold text-slate-950 flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-slate-950" />
                        <span>Packaging &amp; Craft Standards</span>
                      </div>
                      <div className="text-[11px] text-slate-600 leading-relaxed">
                        {selectedProduct.packaging}
                      </div>
                    </div>

                    <div className="p-3.5 bg-sky-50 rounded-2xl border border-sky-200 text-xs space-y-1 text-sky-950">
                      <div className="font-bold flex items-center gap-1.5 text-sky-900">
                        <MapPin className="w-3.5 h-3.5 text-sky-600" />
                        <span>Campus Hub Collection (Building 4, Level 1)</span>
                      </div>
                      <div className="text-[11px] text-sky-800">
                        Ready for verified pickup within 24 hours of point redemption.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details & Action Side (Right Column - Generous Spacing & Editorial Layout) */}
                <div className="lg:col-span-6 p-8 sm:p-10 space-y-6 flex flex-col justify-between">
                  <div className="space-y-5">
                    {/* Title & Price Header */}
                    <div>
                      <span className="text-[10px] font-merch-mono font-black uppercase tracking-widest text-slate-400">
                        Provisions Catalogue
                      </span>
                      <h2 className="font-merch-display font-black text-2xl sm:text-3xl text-slate-950 tracking-tight mt-1">
                        {selectedProduct.name}
                      </h2>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        {selectedProduct.tagline}
                      </p>

                      <div className="mt-3 flex items-baseline justify-between pb-3 border-b border-slate-200">
                        <div className="font-merch-display font-black text-2xl text-slate-950 flex items-baseline gap-1.5">
                          {selectedProduct.pointsCost}
                          <span className="text-xs font-merch-mono font-bold text-slate-500">PTS per item</span>
                        </div>
                        <div className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                          Your Balance: <strong className="text-slate-950 font-merch-mono">{currentAvailablePoints} PTS</strong>
                        </div>
                      </div>
                    </div>

                    {/* Full Description (Spacious & Highly Readable) */}
                    <div className="space-y-1.5">
                      <h4 className="text-[11px] font-merch-mono font-bold uppercase tracking-wider text-slate-400">
                        About this provision
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {selectedProduct.description}
                      </p>
                    </div>

                    {/* Materials Card */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <span className="font-bold text-slate-950">Materials: </span>
                      <span className="text-slate-600">{selectedProduct.materials}</span>
                    </div>

                    {/* Variant Selectors */}
                    <div className="space-y-3 pt-2 border-t border-slate-200">
                      {selectedProduct.variantOptions.map((opt) => (
                        <div key={opt.name} className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-950 flex items-center justify-between">
                            <span>{opt.name}</span>
                            <span className="text-[11px] font-normal text-slate-500">
                              Selected: <strong>{activeVariantSelections[opt.name]}</strong>
                            </span>
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {opt.values.map((val) => {
                              const isSelected = activeVariantSelections[opt.name] === val;
                              return (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() =>
                                    setActiveVariantSelections((prev) => ({
                                      ...prev,
                                      [opt.name]: val,
                                    }))
                                  }
                                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                    isSelected
                                      ? "bg-slate-950 text-white shadow-xs scale-102"
                                      : "bg-slate-100 text-slate-900 border border-slate-200 hover:border-slate-400"
                                  }`}
                                >
                                  {val}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      {/* Quantity Selector */}
                      <div className="space-y-1.5 pt-1">
                        <label className="text-xs font-bold text-slate-950">Quantity</label>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setActiveQuantity((q) => Math.max(1, q - 1))}
                            className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-100 text-slate-950 font-bold text-sm flex items-center justify-center hover:bg-slate-200"
                          >
                            -
                          </button>
                          <span className="text-sm font-merch-mono font-bold text-slate-950 w-6 text-center">
                            {activeQuantity}
                          </span>
                          <button
                            onClick={() => setActiveQuantity((q) => Math.min(3, q + 1))}
                            className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-100 text-slate-950 font-bold text-sm flex items-center justify-center hover:bg-slate-200"
                          >
                            +
                          </button>
                          <span className="text-[11px] text-slate-500">(Max 3 per order)</span>
                        </div>
                      </div>
                    </div>

                    {/* Provisions Checklist */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-200">
                      <span className="text-xs font-bold text-slate-950">Provisions Checklist:</span>
                      <ul className="text-[11px] text-slate-600 space-y-1">
                        {selectedProduct.specifications.map((spec, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-600 font-bold">•</span>
                            <span>{spec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Modal Footer / Action with Transparent Ledger Deduction Breakdown */}
                  <div className="pt-4 border-t border-slate-200 space-y-3">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                      <div className="flex justify-between text-slate-500">
                        <span>Spendable Balance:</span>
                        <span className="font-merch-mono font-semibold">{currentAvailablePoints.toLocaleString()} PTS</span>
                      </div>
                      <div className="flex justify-between text-rose-600 font-bold">
                        <span>Points to Deduct:</span>
                        <span className="font-merch-mono">-{selectedTotalCost.toLocaleString()} PTS</span>
                      </div>
                      <div className="flex justify-between text-slate-950 font-bold pt-1.5 border-t border-slate-200">
                        <span>Remaining After Redemption:</span>
                        <span className="font-merch-mono">
                          {Math.max(0, currentAvailablePoints - selectedTotalCost).toLocaleString()} PTS
                        </span>
                      </div>
                    </div>

                    {!isEligible ? (
                      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                        <div className="font-bold">Redemption Threshold Locked</div>
                        <div>
                          Your account requires {pointsShortOfEligibility} more lifetime points to unlock shop redemption.
                        </div>
                      </div>
                    ) : !hasSufficientPoints ? (
                      <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 space-y-1">
                        <div className="font-bold">Insufficient Available Points</div>
                        <div>
                          You need {selectedTotalCost - currentAvailablePoints} more points to redeem this configuration.
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setIsConfirmModalOpen(true);
                        }}
                        className="w-full py-4 rounded-xl bg-slate-950 text-white font-merch-display font-black text-sm hover:bg-[#d2f831] hover:text-slate-950 transition-all shadow-md flex items-center justify-center gap-2 group"
                      >
                        <span>Proceed to Confirmation</span>
                        <ArrowRight className="w-4 h-4 text-[#d2f831] group-hover:text-slate-950 group-hover:translate-x-1 transition-transform" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REDEMPTION CONFIRMATION MODAL */}
        {isConfirmModalOpen && selectedProduct && account && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 shadow-2xl relative space-y-6">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-950 rounded-full hover:bg-slate-100"
                aria-label="Cancel confirmation"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1">
                <span className="text-[10px] font-merch-mono font-black uppercase tracking-widest text-[#1681eb]">
                  Consequential Transaction
                </span>
                <h3 className="font-merch-display font-black text-2xl text-slate-950">
                  Confirm Point Redemption
                </h3>
              </div>

              {/* Order Ledger Preview */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="font-bold text-slate-950">{selectedProduct.name}</div>
                  <div className="font-black text-slate-950 font-merch-mono">Qty: {activeQuantity}</div>
                </div>

                {/* Variant list */}
                <div className="space-y-1 text-slate-600">
                  {Object.entries(activeVariantSelections).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span>{key}:</span>
                      <span className="font-semibold text-slate-950">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Ledger Invariant preview */}
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <div className="flex justify-between text-slate-500">
                    <span>Current Available Balance:</span>
                    <span className="font-merch-mono">{currentAvailablePoints.toLocaleString()} PTS</span>
                  </div>
                  <div className="flex justify-between text-rose-600 font-bold">
                    <span>Points to Deduct:</span>
                    <span className="font-merch-mono">-{selectedTotalCost.toLocaleString()} PTS</span>
                  </div>
                  <div className="flex justify-between text-slate-950 font-black pt-2 border-t border-slate-200">
                    <span>Remaining Balance After Commit:</span>
                    <span className="font-merch-mono">
                      {(currentAvailablePoints - selectedTotalCost).toLocaleString()} PTS
                    </span>
                  </div>
                </div>
              </div>

              {/* Campus Desk Pickup Notice */}
              <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-950 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-sky-900">
                  <MapPin className="w-3.5 h-3.5 text-sky-600" />
                  <span>Campus Fulfilment Verification</span>
                </div>
                <p className="text-[11px] leading-relaxed text-sky-800">
                  Your provision will be prepared in recyclable kraft packaging and held at the <strong>SUTRA Student Success Desk (Building 4, Level 1)</strong>.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  disabled={isSubmittingRedeem}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-950 hover:bg-slate-100 text-xs font-bold transition-colors"
                >
                  Cancel &amp; Review
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRedemption}
                  disabled={isSubmittingRedeem}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-950 text-white hover:bg-[#d2f831] hover:text-slate-950 text-xs font-merch-display font-black transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  {isSubmittingRedeem ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-[#d2f831]" />
                      <span>Authorizing Ledger...</span>
                    </>
                  ) : (
                    <span>Authorize Deduction</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUCCESS CONFIRMATION MODAL */}
        {lastCompletedRedemption && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-slate-200 shadow-2xl relative text-center space-y-5">
              <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 mx-auto flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-merch-mono font-black uppercase tracking-widest text-emerald-600">
                  Redemption Authorized
                </span>
                <h3 className="font-merch-display font-black text-2xl text-slate-950">
                  Your provision is confirmed!
                </h3>
                <p className="text-xs text-slate-500">
                  {lastCompletedRedemption.pointsDeducted} points deducted authoritatively from your balance.
                </p>
              </div>

              {/* Pickup Passcode Card */}
              <div className="bg-slate-950 text-white p-5 rounded-2xl border border-slate-800 text-left space-y-3">
                <div className="flex justify-between items-center text-xs border-b border-white/10 pb-2">
                  <span className="text-[#d2f831] uppercase tracking-wider font-bold">Pickup Passcode</span>
                  <span className="font-merch-mono text-[10px] text-slate-400">{lastCompletedRedemption.redemptionId}</span>
                </div>
                <div className="font-merch-mono font-black text-2xl tracking-widest text-center py-2 text-[#d2f831]">
                  {lastCompletedRedemption.collectionCode}
                </div>
                <div className="text-[11px] text-slate-300 text-center">
                  Present this code and your student ID card at Building 4
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    setLastCompletedRedemption(null);
                    setSelectedProduct(null);
                    setIsHistoryDrawerOpen(true);
                  }}
                  className="w-full py-3 rounded-xl bg-slate-950 text-white text-xs font-merch-display font-black hover:bg-[#d2f831] hover:text-slate-950 transition-colors"
                >
                  View in Redemption History
                </button>
                <button
                  onClick={() => {
                    setLastCompletedRedemption(null);
                    setSelectedProduct(null);
                  }}
                  className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-950 text-xs font-semibold"
                >
                  Continue Browsing Provisions
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REDEMPTION HISTORY DRAWER */}
        {isHistoryDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between p-6 sm:p-8 animate-slide-left">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-slate-950" />
                    <h3 className="font-merch-display font-black text-xl text-slate-950">
                      Redemption History
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsHistoryDrawerOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-950 rounded-lg hover:bg-slate-100"
                    aria-label="Close redemption drawer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* History List */}
                <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
                  {redemptions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 space-y-2 border border-dashed border-slate-200 rounded-2xl">
                      <Gift className="w-8 h-8 text-slate-300 mx-auto" />
                      <div className="font-bold text-slate-950">No Redemptions Recorded Yet</div>
                      <p>When you redeem SUTRA merchandise, your confirmed records will appear here.</p>
                    </div>
                  ) : (
                    redemptions.map((item) => (
                      <div
                        key={item.redemptionId}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-xs text-slate-950">{item.productName}</div>
                            <div className="text-[10px] text-slate-500">
                              {new Date(item.createdAt).toLocaleDateString()} • Qty {item.quantity}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#d2f831]/20 border border-[#d2f831] text-slate-950">
                            {item.fulfilmentStatus}
                          </span>
                        </div>

                        {/* Variants */}
                        <div className="text-[11px] text-slate-600 flex flex-wrap gap-2">
                          {Object.entries(item.variantSelections).map(([k, v]) => (
                            <span key={k} className="bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                              {k}: {v}
                            </span>
                          ))}
                        </div>

                        {/* Collection code */}
                        <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-xs">
                          <span className="text-slate-500 font-mono text-[10px]">{item.redemptionId}</span>
                          <span className="font-merch-mono font-black text-slate-950 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                            {item.collectionCode}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Drawer footer */}
              <div className="pt-4 border-t border-slate-200">
                <button
                  onClick={() => setIsHistoryDrawerOpen(false)}
                  className="w-full py-3 rounded-xl bg-slate-950 text-white font-merch-display font-bold text-xs hover:bg-[#d2f831] hover:text-slate-950 transition-colors"
                >
                  Close History
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PACKAGING STANDARDS MODAL */}
        {isPackagingModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 shadow-2xl relative space-y-6">
              <button
                onClick={() => setIsPackagingModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-950 rounded-full hover:bg-slate-100"
                aria-label="Close standards modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1">
                <span className="text-[10px] font-merch-mono font-black uppercase tracking-widest text-[#1681eb]">
                  Institutional Standard
                </span>
                <h3 className="font-merch-display font-black text-2xl text-slate-950">
                  Packaging &amp; Craft Policy
                </h3>
              </div>

              <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
                <p>
                  Every provision redeemed through SUTRA SUPPLY represents authentic student effort. To respect this commitment, all merchandise adheres to strict material standards:
                </p>

                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-950">Zero Plastic Mailers:</strong> Unbleached post-consumer kraft mailers sealed with natural vegetable gum.
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-950">Certified Textiles:</strong> 100% GOTS organic combed ring-spun cotton and Oeko-Tex certified French terry.
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-950">Archival Paper:</strong> 120gsm acid-free FSC-certified Swedish paper with Smyth sewn lay-flat bindings.
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-sky-50 rounded-xl border border-sky-200 text-sky-950 text-[11px]">
                  <strong>Campus Hub Fulfillment:</strong> Provisions are held in the student&apos;s name at the SUTRA Campus Hub (Building 4, Level 1) for 14 academic days.
                </div>
              </div>

              <button
                onClick={() => setIsPackagingModalOpen(false)}
                className="w-full py-3 rounded-xl bg-slate-950 text-white text-xs font-merch-display font-bold hover:bg-[#d2f831] hover:text-slate-950 transition-colors"
              >
                Understood
              </button>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER (Matching SUTRA Institutional Footer Style) */}
      <footer className="mt-20 border-t border-slate-200/80 bg-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-merch-display font-bold text-slate-950">Sutra.</span>
            <span>•</span>
            <span className="font-merch-mono font-bold text-slate-700">SUTRA SUPPLY</span>
            <span>•</span>
            <span>Earned, not bought.</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Threshold: 500 Lifetime Points</span>
            <span>•</span>
            <span>Campus Desk (Building 4)</span>
            <span>•</span>
            <span className="font-merch-mono">v1.2.0 Merch Drop</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
