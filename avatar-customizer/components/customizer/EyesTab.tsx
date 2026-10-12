'use client';

import React from 'react';
import { useAvatarStore } from '../../lib/store';
import { EYE_COLOR_PRESETS } from '../../lib/avatarConfig';
import { AlertCircle } from 'lucide-react';

export function EyesTab() {
  const eyes = useAvatarStore((s) => s.config.eyes);
  const updateEyes = useAvatarStore((s) => s.updateEyes);
  const availableMeshes = useAvatarStore((s) => s.availableMeshes);

  const hasEyeMaterials = availableMeshes.eyeMaterials.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-slate-200">Iris Color</label>
          <span className="text-xs font-mono text-slate-400">{eyes.color.toUpperCase()}</span>
        </div>

        {/* Eye Color Presets */}
        <div className="grid grid-cols-7 gap-2.5">
          {EYE_COLOR_PRESETS.map((hex) => {
            const isSelected = eyes.color.toLowerCase() === hex.toLowerCase();
            return (
              <button
                key={hex}
                type="button"
                onClick={() => updateEyes({ color: hex })}
                className={`relative w-full aspect-square rounded-xl transition-all duration-150 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                  isSelected ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900 scale-105' : 'hover:opacity-90'
                }`}
                style={{ backgroundColor: hex }}
                aria-label={`Select eye color ${hex}`}
              >
                {isSelected && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-white shadow-md" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Custom Iris Color Picker */}
        <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <input
            type="color"
            value={eyes.color}
            onChange={(e) => updateEyes({ color: e.target.value })}
            className="w-9 h-9 rounded-lg border border-slate-700 bg-transparent cursor-pointer p-0.5"
            aria-label="Custom eye color picker"
          />
          <div className="flex-1">
            <p className="text-xs font-medium text-slate-300">Custom Iris Shade</p>
            <p className="text-[11px] text-slate-500">Pick any custom HEX color for eyes</p>
          </div>
        </div>
      </div>

      {!hasEyeMaterials && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>No specific eye/iris material pattern detected in loaded model.</span>
        </div>
      )}
    </div>
  );
}
