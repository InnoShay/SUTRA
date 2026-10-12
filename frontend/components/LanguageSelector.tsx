"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/lib/language-context";
import { IndicLanguage } from "@/lib/i18n";
import {
  Languages,
  Check,
  ChevronDown,
  Search,
  Sparkles,
  Globe2,
} from "lucide-react";

interface LanguageSelectorProps {
  variant?: "default" | "landing" | "minimal";
  className?: string;
}

export function LanguageSelector({
  variant = "default",
  className = "",
}: LanguageSelectorProps) {
  const { currentLanguage, setLanguage, languages, isTranslating } =
    useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const filteredLanguages = languages.filter((l) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      l.name.toLowerCase().includes(q) ||
      l.nativeName.toLowerCase().includes(q) ||
      l.region.toLowerCase().includes(q) ||
      l.script.toLowerCase().includes(q)
    );
  });

  const handleSelect = (lang: IndicLanguage) => {
    setLanguage(lang);
    setIsOpen(false);
    setSearchQuery("");
  };

  // 1. Landing Page Navbar Variant (dark background, white/lime accents)
  if (variant === "landing") {
    return (
      <div className={`relative ${className}`} ref={popoverRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150 border cursor-pointer ${
            isOpen
              ? "bg-white/20 text-white border-white/40 shadow-sm"
              : "bg-white/10 hover:bg-white/15 text-white/90 border-white/15"
          }`}
          title="Select Regional Language (Powered by Sarvam AI)"
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <Languages className="w-3.5 h-3.5 text-[#d2f831]" />
          <span className="font-medium">{currentLanguage.nativeName}</span>
          {isTranslating && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#d2f831] animate-ping" />
          )}
          <ChevronDown
            className={`w-3 h-3 text-white/70 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-white">
            {/* Popover Header */}
            <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5 text-[#d2f831]" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                  Regional Languages
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Sarvam AI
              </span>
            </div>

            {/* Search Input */}
            <div className="p-1.5">
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-xl">
                <Search className="w-3.5 h-3.5 text-white/40 shrink-0" />
                <input
                  type="text"
                  placeholder="Search language or script..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs text-white placeholder:text-white/40 focus:outline-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Language List */}
            <div className="max-h-64 overflow-y-auto space-y-0.5 p-1">
              {filteredLanguages.map((lang) => {
                const isSelected = currentLanguage.code === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelect(lang)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-white/15 text-white font-semibold"
                        : "hover:bg-white/10 text-white/80 hover:text-white"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-bold text-white">
                          {lang.nativeName}
                        </span>
                        <span className="text-[11px] text-white/60">
                          {lang.name}
                        </span>
                      </div>
                      <div className="text-[10px] text-white/40 truncate">
                        {lang.region} • {lang.script}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#d2f831] shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. Default AppShell / Dashboard Variant (Clean neutral glass design)
  return (
    <div className={`relative ${className}`} ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 bg-[#F8F9FA] hover:bg-[#F1F3F6] active:bg-neutral-200/60 border rounded-xl text-xs font-semibold text-neutral-800 shadow-2xs focus:outline-none transition-all cursor-pointer ${
          isOpen
            ? "border-neutral-400 bg-white shadow-xs ring-2 ring-neutral-900/5"
            : "border-neutral-200/70"
        }`}
        title="Select Indic Regional Language (Sarvam AI)"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Languages className="w-3.5 h-3.5 text-neutral-600" />
        <span className="font-semibold text-neutral-900">
          {currentLanguage.nativeName}
        </span>
        {isTranslating ? (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
        ) : (
          <span className="text-[10px] text-neutral-400 font-mono hidden sm:inline">
            {currentLanguage.code.split("-")[0].toUpperCase()}
          </span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-neutral-800" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white/95 backdrop-blur-xl border border-neutral-200/80 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.04)] p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Popover Header */}
          <div className="px-3 py-2 border-b border-neutral-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5 text-neutral-700" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Indic Languages
              </span>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">
              Sarvam AI
            </span>
          </div>

          {/* Quick Filter Search */}
          <div className="p-1.5">
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-neutral-50 border border-neutral-200/70 rounded-xl focus-within:border-neutral-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-neutral-900/5 transition-all">
              <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <input
                type="text"
                placeholder="Search language or state..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
                autoFocus
              />
            </div>
          </div>

          {/* Language Options Grid */}
          <div className="max-h-64 overflow-y-auto space-y-0.5 p-1">
            {filteredLanguages.length === 0 ? (
              <div className="py-6 text-center text-xs text-neutral-400">
                No matching languages found
              </div>
            ) : (
              filteredLanguages.map((lang) => {
                const isSelected = currentLanguage.code === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelect(lang)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-neutral-100/90 text-neutral-900 shadow-2xs font-semibold"
                        : "hover:bg-neutral-50 active:bg-neutral-100/80 text-neutral-700"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-bold text-neutral-900">
                          {lang.nativeName}
                        </span>
                        <span className="text-[11px] text-neutral-500 font-medium">
                          {lang.name}
                        </span>
                      </div>
                      <div className="text-[10px] text-neutral-400 truncate">
                        {lang.region}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-neutral-900 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="px-3 py-2 border-t border-neutral-100 text-[10px] text-neutral-400 flex items-center justify-between">
            <span>Official 8th Schedule of India</span>
            <span className="font-mono text-[9px] text-emerald-700 font-semibold">
              Live Neural MT
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
