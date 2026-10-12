'use client';

import React from 'react';
import { useAvatarStore } from '../../lib/store';
import { SKIN_TONE_PRESETS, getSkinColorFromTone } from '../../lib/avatarConfig';
import { AlertCircle } from 'lucide-react';

export function SkinTab() {
  const skin = useAvatarStore((s) => s.config.skin);
  const updateSkin = useAvatarStore((s) => s.updateSkin);
  const availableMeshes = useAvatarStore((s) => s.availableMeshes);

  const hasSkinMaterials = availableMeshes.skinMaterials.length > 0;
  const computedColor = getSkinColorFromTone(skin.tone);

  const handlePresetSelect = (hex: string, index: number) => {
    const toneVal = parseFloat((index / (SKIN_TONE_PRESETS.length - 1)).toFixed(2));
    updateSkin({ color: hex, tone: toneVal });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-slate-200">Skin Tone Presets</label>
          <span className="text-xs font-mono text-slate-400">{computedColor.toUpperCase()}</span>
        </div>

        {/* Tone Presets */}
        <div className="grid grid-cols-6 gap-2.5">
          {SKIN_TONE_PRESETS.map((hex, idx) => {
            const isSelected = Math.abs(skin.tone - idx / (SKIN_TONE_PRESETS.length - 1)) < 0.1;
            return (
              <button
                key={hex}
                type="button"
                onClick={() => handlePresetSelect(hex, idx)}
                className={`relative w-full aspect-square rounded-xl transition-all duration-150 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                  isSelected ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900 scale-105' : 'hover:opacity-90'
                }`}
                style={{ backgroundColor: hex }}
                aria-label={`Select skin tone ${idx + 1}`}
              >
                {isSelected && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-slate-900/80 shadow-sm" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tone Spectrum Slider */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-300 font-medium">Fine Tone Adjustment</span>
          <span className="text-indigo-400 font-mono font-medium">{Math.round(skin.tone * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={skin.tone}
          onChange={(e) => {
            const toneVal = parseFloat(e.target.value);
            updateSkin({ tone: toneVal, color: getSkinColorFromTone(toneVal) });
          }}
          className="w-full h-2 rounded-lg bg-slate-800 appearance-none cursor-pointer accent-indigo-500"
          aria-label="Skin tone gradient slider"
        />
        <div className="flex justify-between text-[11px] text-slate-500">
          <span>Fair / Peach</span>
          <span>Golden Honey</span>
          <span>Deep Espresso</span>
        </div>
      </div>

      {/* Warning if no skin material found */}
      {!hasSkinMaterials && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>No specific skin/body material pattern detected in current model.</span>
        </div>
      )}
    </div>
  );
}
