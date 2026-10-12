'use client';

import React, { useState, useRef } from 'react';
import { useAvatarStore } from '../../lib/store';
import { encodeAvatarConfig, validateAvatarConfig } from '../../lib/avatarConfig';
import {
  Dices,
  RotateCcw,
  Share2,
  Download,
  Upload,
  Camera,
  Check,
  Copy,
} from 'lucide-react';

interface ToolbarProps {
  onCaptureSnapshot?: () => Promise<void>;
  isCapturing?: boolean;
}

export function Toolbar({ onCaptureSnapshot, isCapturing = false }: ToolbarProps) {
  const config = useAvatarStore((s) => s.config);
  const randomize = useAvatarStore((s) => s.randomize);
  const reset = useAvatarStore((s) => s.reset);
  const setConfig = useAvatarStore((s) => s.setConfig);

  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate shareable URL with encoded avatar configuration
  const handleCopyShareLink = async () => {
    try {
      const encoded = encodeAvatarConfig(config);
      const url = `${window.location.origin}/create?avatar=${encoded}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      console.error('Failed to copy share link:', err);
    }
  };

  // Export configuration as JSON file
  const handleExportJson = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `avatar-config-${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error('Failed to export JSON:', err);
    }
  };

  // Import configuration from uploaded JSON file
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const validated = validateAvatarConfig(parsed);
        setConfig(validated);
      } catch (err) {
        console.error('Failed to import JSON file:', err);
        alert('Invalid avatar JSON file format.');
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
      {/* Primary Generator Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={randomize}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md hover:from-indigo-500 hover:to-violet-500 active:scale-95 transition"
        >
          <Dices className="w-4 h-4" />
          <span>Randomize</span>
        </button>

        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 active:scale-95 transition"
          title="Reset to default avatar"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Sharing & Import/Export Actions */}
      <div className="flex items-center gap-1.5">
        {/* Share Link Button */}
        <button
          type="button"
          onClick={handleCopyShareLink}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border transition ${
            copied
              ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
              : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-700'
          }`}
          title="Copy shareable avatar link"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Share</span>
            </>
          )}
        </button>

        {/* Snapshot PNG Export */}
        {onCaptureSnapshot && (
          <button
            type="button"
            onClick={onCaptureSnapshot}
            disabled={isCapturing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-700 transition disabled:opacity-50"
            title="Download 1024x1024 transparent PNG"
          >
            <Camera className="w-3.5 h-3.5 text-sky-400" />
            <span>{isCapturing ? 'Rendering...' : 'PNG'}</span>
          </button>
        )}

        {/* Export JSON */}
        <button
          type="button"
          onClick={handleExportJson}
          className="p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition"
          title="Export avatar config as JSON"
          aria-label="Export avatar config JSON"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Import JSON */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition"
          title="Import avatar config from JSON"
          aria-label="Import avatar config JSON"
        >
          <Upload className="w-4 h-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportJson}
          className="hidden"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
