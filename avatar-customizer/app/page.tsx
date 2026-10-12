'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Layers,
  Share2,
  FileCode2,
  CheckCircle2,
} from 'lucide-react';

const AvatarViewer = dynamic(
  () => import('../components/AvatarViewer').then((mod) => mod.AvatarViewer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[400px] rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
        Loading 3D Engine...
      </div>
    ),
  }
);

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <header className="h-16 px-6 sm:px-12 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-bold tracking-tight text-lg bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            BitVRM
          </span>
        </div>

        <nav className="flex items-center gap-4">
          <Link
            href="/create"
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition active:scale-95"
          >
            <span>Launch Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-12 md:py-20 px-6 sm:px-12 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Glow backdrop */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Hero Text */}
        <div className="lg:col-span-7 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-800/50 text-indigo-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>100% Free • Self-Hosted • Zero External APIs</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
            Build Your 3D Avatar.{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
              Own Every Vertex.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl font-light">
            A Bitmoji-style 3D avatar customizer built on Pixiv VRM and Three.js.
            Fully customizable hair, skin, outfits, accessories, poses, and expressions.
            Export snapshots, share instant links, and embed the viewer into your own website.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/create"
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-xl shadow-indigo-950/60 active:scale-95 transition"
            >
              <span>Create Your Avatar</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="#features"
              className="px-5 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-medium text-sm transition"
            >
              Explore Architecture
            </a>
          </div>

          <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>No paid accounts</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>MIT/Apache-2.0 clean</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>VRoid Studio compatible</span>
            </div>
          </div>
        </div>

        {/* Live Interactive Hero Canvas */}
        <div className="lg:col-span-5 h-[460px] sm:h-[520px] w-full">
          <div className="relative w-full h-full rounded-3xl overflow-hidden p-1 bg-gradient-to-b from-indigo-500/20 via-slate-800/40 to-slate-900/60 shadow-2xl">
            <AvatarViewer autoRotate showControls={false} className="w-full h-full rounded-[22px]" />
          </div>
        </div>
      </section>

      {/* Feature Highlights Section */}
      <section id="features" className="py-16 sm:py-24 px-6 sm:px-12 border-t border-slate-900 bg-slate-950/60">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Engineered for Independence & Longevity
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              When proprietary hosted services shut down, BitVRM keeps running. Zero vendor lock-in.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">$0 Zero Vendor Lock-in</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Self-hosted Three.js + Pixiv VRM stack. No external subscription, no API tokens, no surprise rate limits.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition">
              <div className="w-10 h-10 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center mb-4">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Procedural Fallback</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Missing <code>base.vrm</code>? The engine automatically spins up an isolated procedural humanoid with full bone rigging.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition">
              <div className="w-10 h-10 rounded-xl bg-sky-600/20 text-sky-400 flex items-center justify-center mb-4">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Reusable Component</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Drop <code>&lt;AvatarViewer config={'{...}'} /&gt;</code> into any React or Next.js app to render customized avatars anywhere.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition">
              <div className="w-10 h-10 rounded-xl bg-pink-600/20 text-pink-400 flex items-center justify-center mb-4">
                <Share2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Instant Sharing & PNG</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Compact base64url state encoded right into URL query parameters. Export 1024x1024 transparent PNGs with one click.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-10 px-6 sm:px-12 border-t border-slate-900 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span>BitVRM Studio</span>
          <span>•</span>
          <span>MIT Licensed Engine</span>
        </div>

        <div className="flex items-center gap-6">
          <Link href="/create" className="hover:text-slate-300 transition">
            Avatar Customizer
          </Link>
          <a
            href="https://vroid.com/en/studio"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-300 transition"
          >
            VRoid Studio
          </a>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">All assets CC0 / Self-Made</span>
        </div>
      </footer>
    </div>
  );
}
