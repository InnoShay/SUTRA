"use client";

import React from "react";
import Hero from "./Hero";
import LogoStrip from "./LogoStrip";
import AboutBento from "./AboutBento";
import CuriousShowcase from "./CuriousShowcase";
import Footer from "./Footer";

export function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-[#d2f831] selection:text-slate-950 scroll-smooth w-full overflow-x-hidden">
      {/* 1. Dynamic Hero with framed card, interactive ribbon, and fluid scaling */}
      <Hero />

      {/* 2. Responsive Logo Client Strip */}
      <LogoStrip />

      {/* 3. About SUTRA Bento Grid */}
      <AboutBento />

      {/* 4. Horizontal Parallax Drag-Only Showcase */}
      <CuriousShowcase />

      {/* 5. Institutional Footer */}
      <Footer />
    </main>
  );
}

export default LandingPage;
