"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowUp,
  User,
  Cpu,
  Workflow,
  Shield,
  FileCheck2,
  Mail,
  Phone,
  MapPin,
  Github,
  Linkedin,
  Twitter,
} from "lucide-react";

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <footer className="relative bg-[#090d16] text-slate-400 pt-16 sm:pt-20 pb-12 sm:pb-16 border-t border-slate-800/80 select-none font-sans overflow-hidden">
      {/* Subtle Ambient Brand Glow Matching Hero Accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] max-w-4xl h-36 bg-gradient-to-b from-[#1075d9]/15 via-[#d2f831]/5 to-transparent blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 relative z-10">
        {/* 1. Top Status Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-12 sm:pb-16 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d2f831] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#d2f831]" />
            </span>
            <span className="text-xs font-mono font-semibold tracking-widest text-slate-200 uppercase">
              Available For Institutional Pilots
            </span>
          </div>

          {/* Institutional Pilot CTA replacing generic 'Get in touch' */}
          <Link
            href="/login"
            className="group inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-[#d2f831] hover:bg-[#c4ec26] text-slate-950 text-xs font-bold uppercase tracking-wider transition-all hover:scale-[1.03] active:scale-[0.98] shadow-[0_0_24px_rgba(210,248,49,0.22)]"
          >
            <span>Request Pilot Access</span>
            <div className="w-5 h-5 rounded-full bg-slate-950 text-[#d2f831] flex items-center justify-center transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
          </Link>
        </div>

        {/* 2. Massive Typographic Branding "Sutra." with Theme Accent */}
        <div className="py-12 sm:py-16 border-b border-slate-800/80">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <h2 className="font-display font-extrabold text-6xl xs:text-7xl sm:text-8xl md:text-[110px] lg:text-[130px] text-white tracking-tighter leading-none select-none">
                Sutra<span className="text-[#d2f831]">.</span>
              </h2>

              <p className="mt-4 sm:mt-6 text-xs sm:text-sm md:text-base text-slate-400 font-normal tracking-wide flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="text-slate-200 font-medium">Student Support Orchestration</span>
                <span className="text-slate-600">•</span>
                <span>Signal Provenance</span>
                <span className="text-slate-600">•</span>
                <span>SLA-Governed Interventions</span>
              </p>
            </div>
          </div>
        </div>

        {/* 3. Three-Column Directory Section */}
        <div className="py-12 sm:py-16 grid grid-cols-1 md:grid-cols-12 gap-10 sm:gap-12 text-xs">
          {/* Column 1: Platform & Navigation */}
          <div className="md:col-span-4 space-y-4">
            <h4 className="font-mono text-[11px] font-bold tracking-widest text-slate-400 uppercase">
              PLATFORM
            </h4>
            <ul className="space-y-3 font-medium text-slate-300">
              <li>
                <a
                  href="#about"
                  className="flex items-center gap-2.5 hover:text-[#d2f831] transition-colors group"
                >
                  <User className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#d2f831] transition-colors" />
                  <span>About SUTRA</span>
                </a>
              </li>
              <li>
                <a
                  href="#orchestration"
                  className="flex items-center gap-2.5 hover:text-[#d2f831] transition-colors group"
                >
                  <Cpu className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#d2f831] transition-colors" />
                  <span>Orchestration Engine</span>
                </a>
              </li>
              <li>
                <a
                  href="#projects"
                  className="flex items-center gap-2.5 hover:text-[#d2f831] transition-colors group"
                >
                  <Workflow className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#d2f831] transition-colors" />
                  <span>Case Workflows</span>
                </a>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2.5 hover:text-[#d2f831] transition-colors group"
                >
                  <Shield className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#d2f831] transition-colors" />
                  <span>Institutional Console</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="flex items-center gap-2.5 hover:text-[#d2f831] transition-colors group"
                >
                  <FileCheck2 className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#d2f831] transition-colors" />
                  <span>FERPA &amp; DPDP Audit Ledger</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Institutional Contact & Deployments */}
          <div className="md:col-span-4 space-y-4">
            <h4 className="font-mono text-[11px] font-bold tracking-widest text-slate-400 uppercase">
              CAMPUS DESK
            </h4>
            <div className="space-y-3.5 font-medium text-slate-300">
              <div className="flex items-center gap-2.5 hover:text-white transition-colors">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>+1 (800) 480-SUTRA</span>
              </div>
              <div className="flex items-center gap-2.5 hover:text-[#d2f831] transition-colors">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <a
                  href="mailto:partners@sutra.edu"
                  className="hover:underline underline-offset-2"
                >
                  partners@sutra.edu
                </a>
              </div>
              <div className="flex items-center gap-2.5 text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>Bengaluru &bull; San Francisco &bull; London</span>
              </div>
            </div>
          </div>

          {/* Column 3: Ecosystem & Verification */}
          <div className="md:col-span-4 space-y-4">
            <h4 className="font-mono text-[11px] font-bold tracking-widest text-slate-400 uppercase">
              ECOSYSTEM &amp; CONNECTORS
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-slate-400">
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:text-[#d2f831] hover:border-slate-700 transition-colors"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:text-[#d2f831] hover:border-slate-700 transition-colors"
                  aria-label="GitHub"
                >
                  <Github className="w-4 h-4" />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:text-[#d2f831] hover:border-slate-700 transition-colors"
                  aria-label="Twitter"
                >
                  <Twitter className="w-4 h-4" />
                </a>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                Integrated directly with Canvas LMS, Blackboard Learn, and Moodle SIS infrastructure via LTI 1.3 standards.
              </p>
            </div>
          </div>
        </div>

        {/* 4. Bottom Footer Bar */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-5 text-xs text-slate-500">
          {/* Language Selector */}
          <div className="flex items-center gap-3 font-medium">
            <span className="text-white underline underline-offset-4 decoration-[#d2f831] cursor-pointer">
              English
            </span>
            <span className="hover:text-slate-300 transition-colors cursor-pointer">
              हिंदी
            </span>
          </div>

          {/* Copyright */}
          <div className="text-center sm:text-right text-[11px] text-slate-500">
            &copy; 2026 <strong className="text-slate-300 font-semibold">Sutra Higher Education Technologies</strong>. All rights reserved.
          </div>

          {/* Back to Top Floating Round Button with Website Theme */}
          <button
            onClick={scrollToTop}
            title="Back to Top"
            aria-label="Back to Top"
            className="w-10 h-10 rounded-full bg-[#d2f831] hover:bg-[#c4ec26] text-slate-950 flex items-center justify-center transition-all shadow-[0_0_20px_rgba(210,248,49,0.25)] hover:scale-105 active:scale-95 cursor-pointer shrink-0 font-bold"
          >
            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </footer>
  );
}
