"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { LanguageSelector } from "../LanguageSelector";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 25);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
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
        </nav>

        {/* Right Section: Action Buttons & Indic Language Selector */}
        <div className="hidden sm:flex flex-1 items-center justify-end gap-4 lg:gap-5">
          <LanguageSelector variant="landing" />
          <Link
            href="/login"
            className="text-xs font-bold uppercase tracking-wider text-white/90 hover:text-white transition-colors duration-200"
          >
            Sign In
          </Link>
          <Link
            href="/onboarding"
            className="px-5 py-2.5 rounded-full bg-[#d2f831] hover:bg-[#c3ea22] text-slate-950 text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-sm hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5 group select-none"
          >
            <span>Get Started</span>
            <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        {/* Mobile Hamburger Toggle & Language Selector */}
        <div className="md:hidden flex items-center justify-end gap-2">
          <LanguageSelector variant="landing" />
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
              Case Workflows
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
              href="/onboarding"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-[#d2f831] text-slate-950 font-bold text-xs uppercase tracking-wider hover:bg-[#c3ea22] transition-colors"
            >
              <span>Get Started</span>
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
