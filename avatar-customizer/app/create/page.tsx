'use client';

import React, { useEffect, useRef, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Panel } from '../../components/customizer/Panel';
import { useAvatarStore } from '../../lib/store';
import { decodeAvatarConfig } from '../../lib/avatarConfig';
import { AvatarViewerHandle } from '../../components/AvatarViewer';
import { Sparkles, ArrowLeft, Download, ShieldCheck } from 'lucide-react';

// SSR-Safe dynamic import of 3D Canvas Viewer
const AvatarViewer = dynamic(
  () => import('../../components/AvatarViewer').then((mod) => mod.AvatarViewer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[420px] rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
        Loading 3D Canvas...
      </div>
    ),
  }
);

function CreatePageContent() {
  const searchParams = useSearchParams();
  const setConfig = useAvatarStore((s) => s.setConfig);
  const viewerRef = useRef<AvatarViewerHandle>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Hydrate configuration from shareable URL parameter if provided
  useEffect(() => {
    const avatarParam = searchParams.get('avatar');
    if (avatarParam) {
      const decoded = decodeAvatarConfig(avatarParam);
      if (decoded) {
        setConfig(decoded);
      }
    }
  }, [searchParams, setConfig]);

  // Snapshot Capture & Direct PNG File Download
  const handleCaptureSnapshot = async () => {
    if (!viewerRef.current) return;
    setIsCapturing(true);

    try {
      const dataUrl = await viewerRef.current.captureSnapshot();
      if (!dataUrl) {
        alert('Could not render snapshot. Please try again.');
        return;
      }

      // Download file to user computer
      const link = document.createElement('a');
      link.download = `avatar-${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Snapshot capture error:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-950 text-slate-100">
      {/* Studio Header */}
      <header className="h-16 px-4 sm:px-8 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md flex items-center justify-between shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </Link>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <h1 className="text-sm sm:text-base font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              BitVRM Studio
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Zero External APIs • 100% Free
          </span>
        </div>
      </header>

      {/* Main Responsive Customizer Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 items-stretch">
        {/* Left Side: 3D Interactive Canvas Viewer */}
        <section className="w-full lg:w-7/12 flex flex-col min-h-[460px] lg:min-h-0 lg:h-[calc(100vh-8rem)]">
          <AvatarViewer ref={viewerRef} className="flex-1" />
        </section>

        {/* Right Side: Tabbed Controls Panel */}
        <section className="w-full lg:w-5/12 flex flex-col lg:h-[calc(100vh-8rem)]">
          <Panel onCaptureSnapshot={handleCaptureSnapshot} isCapturing={isCapturing} />
        </section>
      </main>
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Studio...</div>}>
      <CreatePageContent />
    </Suspense>
  );
}
