"use client";

import React from "react";
import Hero from "./Hero";
import LogoStrip from "./LogoStrip";
import ProblemSolution from "./ProblemSolution";
import WorkflowSection from "./WorkflowSection";
import InteractiveCaseSimulator from "./InteractiveCaseSimulator";
import MetricsImpact from "./MetricsImpact";
import PersonaShowcase from "./PersonaShowcase";
import GovernanceTrust from "./GovernanceTrust";
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

      {/* Philosophy & Contrast: Dashboards vs Orchestration */}
      <ProblemSolution />

      {/* 6-Stage Case Closed-Loop Lifecycle */}
      <WorkflowSection />

      {/* Interactive Case Simulator Sandbox */}
      <InteractiveCaseSimulator />

      {/* Metrics, Evidence & Impact */}
      <MetricsImpact />

      {/* Role-Gated Campus Personas */}
      <PersonaShowcase />

      {/* Governance, 48h SLA & Regulatory Trust */}
      <GovernanceTrust />

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
