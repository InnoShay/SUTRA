"use client";

import React from "react";
import Hero from "./Hero";
import LogoStrip from "./LogoStrip";
import AboutBento from "./AboutBento";
import CuriousShowcase from "./CuriousShowcase";
import Footer from "./Footer";

export function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-[#d2f831] selection:text-slate-950">
      {/* Hero with framed rounded card, Navbar, clouds and 3D arc cards */}
      <Hero />

      {/* Logo Client Strip */}
      <LogoStrip />

      {/* About Bento Grid */}
      <AboutBento />

      {/* 3D Arc Project Showcase */}
      <CuriousShowcase />

      {/* High-end Institutional Footer */}
      <Footer />
    </main>
  );
}

export default LandingPage;
