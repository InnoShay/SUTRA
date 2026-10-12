'use client';

import React from 'react';
import { useAvatarStore } from '../../lib/store';
import { HAIR_COLOR_PRESETS } from '../../lib/avatarConfig';
import { Sparkles, AlertCircle } from 'lucide-react';

export function HairTab() {
  const hair = useAvatarStore((s) => s.config.hair);
  const updateHair = useAvatarStore((s) => s.updateHair);
  const availableMeshes = useAvatarStore((s) => s.availableMeshes);

  const hasHairMaterials = availableMeshes.hairMaterials.length > 0;
  const hairMeshes = availableMeshes.hairMeshes;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-slate-200">Hair Color</label>
          <span className="text-xs font-mono text-slate-400">{hair.color.toUpperCase()}</span>
        </div>

        {/* Color Presets */}
        <div className="grid grid-cols-6 sm:grid-cols-6 gap-2.5">
          {HAIR_COLOR_PRESETS.map((hex) => {
            const isSelected = hair.color.toLowerCase() === hex.toLowerCase();
            return (
              <button
                key={hex}
                type="button"
                onClick={() => updateHair({ color: hex })}
                className={`relative w-full aspect-square rounded-xl transition-all duration-150 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                  isSelected ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900 scale-105' : 'hover:opacity-90'
                }`}
                style={{ backgroundColor: hex }}
                aria-label={`Select hair color ${hex}`}
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

        {/* Custom Color Input */}
        <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <input
            type="color"
            value={hair.color}
            onChange={(e) => updateHair({ color: e.target.value })}
            className="w-9 h-9 rounded-lg border border-slate-700 bg-transparent cursor-pointer p-0.5"
            aria-label="Custom hair color picker"
          />
          <div className="flex-1">
            <p className="text-xs font-medium text-slate-300">Custom Shade</p>
            <p className="text-[11px] text-slate-500">Pick any custom HEX color for hair</p>
          </div>
        </div>
      </div>

      {/* Hair Mesh Variants (if the VRM model contains multiple hair options) */}
      {hairMeshes.length > 1 && (
        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h4 className="text-sm font-medium text-slate-200">Hair Mesh Variant</h4>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {hairMeshes.map((meshName) => {
              const isSelected = hair.variant === meshName;
              return (
                <button
                  key={meshName}
                  type="button"
                  onClick={() => updateHair({ variant: isSelected ? undefined : meshName })}
                  className={`px-3 py-2 text-xs font-medium rounded-lg text-left truncate border transition ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {meshName}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Disabled Notification tooltip if no hair elements in model */}
      {!hasHairMaterials && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>No specific hair material pattern was detected in the loaded model.</span>
        </div>
      )}
    </div>
  );
}
