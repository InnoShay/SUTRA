"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "./Navbar";
import { ArrowUpRight, Plus, Star } from "lucide-react";
import { supabaseAuth } from "@/lib/supabase";

export default function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ribbonRef = useRef<HTMLDivElement>(null);
  const [isRibbonDragging, setIsRibbonDragging] = useState(false);
  const [isRibbonHovered, setIsRibbonHovered] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);

  // Ensure background video is reliably muted, autoplays, and slowed down smoothly to ~0.8x
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      videoRef.current.playbackRate = 0.8;
      videoRef.current.play().catch(() => {});
    }

    const checkAuth = async () => {
      try {
        const session = await supabaseAuth.getSession();
        if (session && session.access_token) {
          setIsAuthenticated(true);
          return;
        }
        if (typeof window !== "undefined") {
          const token = localStorage.getItem("sutra_auth_token");
          if (token) {
            setIsAuthenticated(true);
          }
        }
      } catch {}
    };
    checkAuth();
  }, []);

  // Ribbon Drag to Scroll on Mouse/Touch (Drag-only mode, autoplay disabled)
  const handleRibbonMouseDown = (e: React.MouseEvent) => {
    if (!ribbonRef.current) return;
    setIsRibbonDragging(true);
    startXRef.current = e.pageX - ribbonRef.current.offsetLeft;
    scrollLeftRef.current = ribbonRef.current.scrollLeft;
  };

  const handleRibbonMouseMove = (e: React.MouseEvent) => {
    if (!isRibbonDragging || !ribbonRef.current) return;
    e.preventDefault();
    const x = e.pageX - ribbonRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    ribbonRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleRibbonMouseUp = () => {
    setIsRibbonDragging(false);
  };

  const handleRibbonTouchStart = (e: React.TouchEvent) => {
    if (!ribbonRef.current) return;
    setIsRibbonDragging(true);
    startXRef.current = e.touches[0].pageX - ribbonRef.current.offsetLeft;
    scrollLeftRef.current = ribbonRef.current.scrollLeft;
  };

  const handleRibbonTouchMove = (e: React.TouchEvent) => {
    if (!isRibbonDragging || !ribbonRef.current) return;
    const x = e.touches[0].pageX - ribbonRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    ribbonRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleRibbonTouchEnd = () => {
    setIsRibbonDragging(false);
  };

  const renderCardSet = (prefix: string) => (
    <React.Fragment key={prefix}>
      {/* Card 1: Attendance Trends (Seamless, Zero Blackish Shadow) */}
      <div className="w-[clamp(190px,16vw,260px)] shrink-0 rounded-2xl sm:rounded-3xl bg-white/95 p-4 sm:p-5 shadow-none border border-white/90 hover:-translate-y-1.5 transition-transform duration-300">
        <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold text-slate-700 mb-3">
          <span>Attendance &amp; LMS</span>
          <span className="text-xs text-emerald-600 font-semibold">+4.2%</span>
        </div>
        <div className="h-24 sm:h-28 flex items-end justify-between gap-2 pt-2 px-1">
          <div className="w-3.5 bg-slate-100 rounded-t h-[40%]" />
          <div className="w-3.5 bg-sky-200 rounded-t h-[65%]" />
          <div className="w-3.5 bg-sky-400 rounded-t h-[50%]" />
          <div className="w-3.5 bg-sky-500 rounded-t h-[85%]" />
          <div className="w-3.5 bg-sky-600 rounded-t h-[100%]" />
        </div>
      </div>

      {/* Card 2: Support Case #8941 & SLA (Seamless, Zero Blackish Shadow) */}
      <div className="w-[clamp(190px,16vw,260px)] shrink-0 rounded-2xl sm:rounded-3xl bg-white/95 p-4 sm:p-5 shadow-none border border-white/90 hover:-translate-y-1.5 transition-transform duration-300">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm sm:text-base font-bold text-slate-900">48h SLA</span>
          <span className="text-xs text-emerald-600 font-semibold">18h Left</span>
        </div>
        <div className="space-y-2 pt-2">
          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 flex items-center justify-between text-[11px]">
            <span className="text-slate-600 font-medium">Mentor</span>
            <span className="text-emerald-600 font-bold">Assigned</span>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 flex items-center justify-between text-[11px]">
            <span className="text-slate-600 font-medium">Lab Check</span>
            <span className="text-sky-600 font-bold">Active</span>
          </div>
        </div>
      </div>


      {/* Card 4: Cohort Retention Curve (Seamless, Zero Blackish Shadow) */}
      <div className="w-[clamp(210px,18vw,300px)] shrink-0 rounded-2xl sm:rounded-3xl bg-white/95 p-4 sm:p-5 shadow-none border border-white/90 z-20 hover:-translate-y-1.5 transition-transform duration-300">
        <div className="text-[11px] sm:text-xs font-semibold text-slate-700 mb-2">
          Cohort Retention <br /> Recovery Curve
        </div>
        <div className="h-24 sm:h-28 flex items-center justify-center">
          <svg viewBox="0 0 160 70" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id={`chartGradHero-${prefix}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0,55 Q30,50 60,35 T120,20 T160,5 L160,70 L0,70 Z"
              fill={`url(#chartGradHero-${prefix})`}
            />
            <path
              d="M0,55 Q30,50 60,35 T120,20 T160,5"
              fill="none"
              stroke="#0284c7"
              strokeWidth="2.5"
            />
          </svg>
        </div>
      </div>

      {/* Card 5: Dark Charcoal Card (Seamless, Zero Blackish Shadow) */}
      <div className="w-[clamp(210px,18vw,300px)] shrink-0 rounded-2xl sm:rounded-3xl bg-[#111625] p-4 sm:p-5 text-white shadow-none border border-white/20 z-20 flex flex-col justify-between h-52 sm:h-60 hover:-translate-y-1.5 transition-transform duration-300">
        <div>
          <div className="text-slate-400 font-mono text-xs uppercase tracking-wider mb-2 font-semibold">
            Orchestration
          </div>
          <h4 className="font-display font-bold text-xs sm:text-sm leading-snug text-white">
            Combines Provenance, Faculty Mentors &amp; Care
          </h4>
        </div>
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>No Alert Without Action</span>
          <ArrowUpRight className="w-4 h-4 text-[#d2f831]" />
        </div>
      </div>

      {/* Card 6: Frosted Glass Card (Seamless, Zero Blackish Shadow) */}
      <div className="w-[clamp(190px,16vw,260px)] shrink-0 rounded-2xl sm:rounded-3xl bg-white/25 backdrop-blur-xl border border-white/40 p-4 sm:p-5 text-white shadow-none flex flex-col items-center justify-center text-center h-52 sm:h-60 hover:-translate-y-1.5 transition-transform duration-300">
        <div className="w-10 h-10 rounded-full bg-white/35 backdrop-blur-md flex items-center justify-center text-white mb-3">
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </div>
        <span className="font-bold text-xs sm:text-sm text-white">Signal Intake</span>
        <span className="text-[10px] sm:text-[11px] text-white/90 mt-1">Sync Canvas LMS &amp; SIS</span>
      </div>

      {/* Card 7: 520k+ Signals (Seamless, Zero Blackish Shadow) */}
      <div className="w-[clamp(190px,16vw,260px)] shrink-0 rounded-2xl sm:rounded-3xl bg-white/95 p-4 sm:p-5 shadow-none border border-white/90 hover:-translate-y-1.5 transition-transform duration-300">
        <div className="flex items-center gap-2 text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1.5">
          <span>Support Signals</span>
        </div>
        <div className="font-display font-extrabold text-xl sm:text-2xl text-slate-950">
          520k+
        </div>
        <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1.5 leading-tight">
          Analyzed monthly to power proactive, non-stigmatizing care.
        </p>
      </div>

      {/* Card 8: SLA Track (Seamless, Zero Blackish Shadow) */}
      <div className="w-[clamp(190px,16vw,260px)] shrink-0 rounded-2xl sm:rounded-3xl bg-[#0d131f] p-4 sm:p-5 text-white shadow-none border border-white/20 hover:-translate-y-1.5 transition-transform duration-300">
        <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 mb-1.5">
          <span>SLA Adherence</span>
          <span className="text-emerald-400 font-bold">98.2%</span>
        </div>
        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mb-2.5">
          <div className="h-full bg-emerald-400 rounded-full w-[98%]" />
        </div>
        <div className="space-y-1 text-[10px] sm:text-[11px] text-slate-300">
          <div className="flex justify-between">
            <span>Avg Response</span>
            <span className="text-white font-bold">36h</span>
          </div>
          <div className="flex justify-between">
            <span>Follow-Up</span>
            <span className="text-white font-bold">100%</span>
          </div>
        </div>
      </div>
    </React.Fragment>
  );

  return (
    <div className="p-2 sm:p-3.5 md:p-5 lg:p-6 bg-white w-full max-w-[2560px] mx-auto overflow-hidden">
      {/* Outer Rounded Hero Container with Fluid Dynamic Sizing */}
      <div className="relative rounded-[24px] sm:rounded-[32px] md:rounded-[40px] overflow-hidden bg-gradient-to-b from-[#1075d9] via-[#1a84ec] to-[#3ca3fa] min-h-[700px] sm:min-h-[780px] lg:min-h-[860px] flex flex-col justify-between shadow-none transition-all duration-300">
        
        {/* Muted Background Video (Autoplay, Seamless Loop) */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src="/gemini_generated_video_a63509ef.mp4" type="video/mp4" />
          </video>
          {/* Subtle translucent gradient overlay to harmonize with theme and ensure clear typography contrast */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#1075d9]/40 via-transparent to-[#1075d9]/60" />
        </div>

        {/* Soft Radial Ambient Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[90vw] max-w-[800px] h-[350px] sm:h-[450px] bg-white/10 blur-[100px] sm:blur-[130px] rounded-full pointer-events-none z-0" />

        {/* Top Navbar */}
        <Navbar />

        {/* Main Hero Header Content */}
        <div className="relative z-10 pt-24 sm:pt-28 md:pt-32 lg:pt-36 pb-6 sm:pb-8 max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-3xl xs:text-4xl sm:text-6xl md:text-7xl lg:text-[76px] font-display font-extrabold text-white tracking-tight leading-[1.08] drop-shadow-xs">
            Building the future of <br className="hidden sm:inline" />
            student support
          </h1>

          <p className="mt-4 sm:mt-6 text-xs sm:text-base md:text-lg text-white/95 max-w-2xl mx-auto font-normal leading-relaxed px-2">
            We help universities unlock student persistence through evidence-driven triage and policy-governed intervention orchestration.
          </p>

          {/* Action CTA */}
          <div className="mt-6 sm:mt-8 flex items-center justify-center">
            <Link
              href={isAuthenticated ? "/dashboard" : "/onboarding"}
              className="pl-6 pr-2.5 py-2 rounded-full bg-[#d2f831] hover:bg-[#c4ec26] text-slate-950 text-xs font-bold uppercase tracking-wider transition-all hover:scale-[1.03] active:scale-[0.98] flex items-center gap-3 group shadow-md"
            >
              <span>{isAuthenticated ? "GO TO DASHBOARD" : "GET STARTED"}</span>
              <div className="w-7 h-7 rounded-full bg-slate-950 text-white flex items-center justify-center transition-transform group-hover:rotate-45">
                <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
              </div>
            </Link>
          </div>
        </div>

        {/* Dynamic Truly Infinite Ribbon (Zero Blackish Shadows) */}
        <div id="orchestration" className="relative z-10 w-full overflow-hidden pt-4 pb-8 sm:pb-12">
          {/* Scrollable / Draggable Ribbon Wrapper */}
          <div className="w-full max-w-[2400px] mx-auto px-2 sm:px-4">
            <div 
              ref={ribbonRef}
              onMouseEnter={() => setIsRibbonHovered(true)}
              onMouseLeave={() => {
                setIsRibbonHovered(false);
                setIsRibbonDragging(false);
              }}
              onMouseDown={handleRibbonMouseDown}
              onMouseMove={handleRibbonMouseMove}
              onMouseUp={handleRibbonMouseUp}
              onTouchStart={handleRibbonTouchStart}
              onTouchMove={handleRibbonTouchMove}
              onTouchEnd={handleRibbonTouchEnd}
              className={`flex items-center gap-4 sm:gap-5 md:gap-6 overflow-x-auto no-scrollbar py-6 px-4 sm:px-8 select-none transition-all duration-300 ${
                isRibbonDragging ? "cursor-grabbing" : "cursor-grab"
              }`}
            >
              {renderCardSet("setA")}
              {renderCardSet("setB")}
            </div>
          </div>

          {/* Social Proof Rating */}
          <div className="mt-4 sm:mt-6 text-center">
            <p className="text-xs font-semibold text-white/95 tracking-wide">
              Rated 4.9/5 across 4,900+ institutional cases
            </p>
            <div className="flex items-center justify-center gap-1 mt-1.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="w-3.5 sm:w-4 h-3.5 sm:h-4 fill-[#facc15] text-[#facc15]"
                />
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
