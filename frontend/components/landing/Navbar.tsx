"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronDown, Menu, X, ArrowUpRight, ShieldCheck, Scale, Users } from "lucide-react";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [governanceOpen, setGovernanceOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 25);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setGovernanceOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-slate-950/85 backdrop-blur-xl border-b border-white/10 py-3.5 px-6 sm:px-10 lg:px-14 shadow-lg shadow-black/25"
          : "bg-transparent pt-8 sm:pt-10 lg:pt-11 pb-3 px-6 sm:px-10 lg:px-14"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left Section: Brand Logo (Flex-1 for balanced 3-column symmetry) */}
        <div className="flex-1 flex items-center justify-start">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-white group select-none transition-opacity hover:opacity-95"
          >
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              <img
                src="/sutra-logo.svg"
                alt="Sutra Logo"
                className="w-8 h-8 object-contain brightness-0 invert transition-transform duration-200 group-hover:scale-105"
                draggable={false}
              />
            </div>
            <span className="font-display font-bold text-xl sm:text-2xl tracking-tight text-white">
              Sutra
            </span>
          </Link>
        </div>

        {/* Center Section: Perfectly Centered Equispaced Nav Links (No Bubble) */}
        <nav
          aria-label="Main Navigation"
          className="hidden md:flex flex-none items-center justify-center gap-8 lg:gap-10 text-xs font-semibold tracking-wider uppercase text-white/90"
        >
          <a
            href="#"
            className="hover:text-white transition-colors duration-200 py-1"
          >
            Overview
          </a>
          <a
            href="#orchestration"
            className="hover:text-white transition-colors duration-200 py-1"
          >
            Orchestration
          </a>
          <a
            href="#about"
            className="hover:text-white transition-colors duration-200 py-1"
          >
            About Sutra
          </a>

          {/* Governance Dropdown */}
          <div
            ref={dropdownRef}
            className="relative py-1"
            onMouseEnter={() => setGovernanceOpen(true)}
            onMouseLeave={() => setGovernanceOpen(false)}
          >
            <button
              type="button"
              onClick={() => setGovernanceOpen((prev) => !prev)}
              className="text-xs font-semibold tracking-wider uppercase transition-colors duration-200 flex items-center gap-1.5 cursor-pointer text-white/90 hover:text-white"
              aria-expanded={governanceOpen}
            >
              <span>Governance</span>
              <ChevronDown
                className={`w-3.5 h-3.5 stroke-[2.5] transition-transform duration-200 ${
                  governanceOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Flyout Menu */}
            {governanceOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-50">
                <div className="w-72 p-2 rounded-2xl bg-slate-950/95 backdrop-blur-xl border border-white/15 shadow-2xl text-white space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  <a
                    href="#about"
                    onClick={() => setGovernanceOpen(false)}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/10 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5 text-[#d2f831]">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-[#d2f831] transition-colors">
                        FERPA &amp; Audit Trail
                      </div>
                      <div className="text-[11px] text-white/60 font-normal leading-tight mt-0.5">
                        Tamper-evident logs &amp; student privacy rules
                      </div>
                    </div>
                  </a>

                  <a
                    href="#orchestration"
                    onClick={() => setGovernanceOpen(false)}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/10 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5 text-sky-400">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-sky-300 transition-colors">
                        SLA &amp; Policy Engine
                      </div>
                      <div className="text-[11px] text-white/60 font-normal leading-tight mt-0.5">
                        48h resolution standards &amp; routing rules
                      </div>
                    </div>
                  </a>

                  <a
                    href="#projects"
                    onClick={() => setGovernanceOpen(false)}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/10 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5 text-emerald-400">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                        Human-in-the-Loop
                      </div>
                      <div className="text-[11px] text-white/60 font-normal leading-tight mt-0.5">
                        Advisor oversight with non-stigmatizing care
                      </div>
                    </div>
                  </a>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Right Section: Action Buttons (Flex-1 for balanced 3-column symmetry) */}
        <div className="hidden sm:flex flex-1 items-center justify-end gap-5 lg:gap-6">
          <Link
            href="/login"
            className="text-xs font-bold uppercase tracking-wider text-white/90 hover:text-white transition-colors duration-200"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-full bg-[#d2f831] hover:bg-[#c3ea22] text-slate-950 text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-sm hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5 group select-none"
          >
            <span>Launch Console</span>
            <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="md:hidden flex items-center justify-end">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-full text-white hover:bg-white/10 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 p-5 rounded-2xl bg-slate-950/95 backdrop-blur-2xl border border-white/10 text-white space-y-4 shadow-2xl animate-in fade-in duration-150">
          <div className="flex flex-col space-y-2 text-xs font-bold uppercase tracking-wider">
            <a
              href="#"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              Overview
            </a>
            <a
              href="#orchestration"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              Orchestration
            </a>
            <a
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              About Sutra
            </a>
            <a
              href="#projects"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              Case Workflows &amp; Governance
            </a>
          </div>

          <div className="pt-3 border-t border-white/10 space-y-2">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full block text-center py-2.5 rounded-full bg-white/10 text-white font-bold text-xs uppercase tracking-wider hover:bg-white/20 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-[#d2f831] text-slate-950 font-bold text-xs uppercase tracking-wider hover:bg-[#c3ea22] transition-colors"
            >
              <span>Launch Console</span>
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
