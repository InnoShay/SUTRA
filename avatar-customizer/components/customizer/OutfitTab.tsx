'use client';

import React from 'react';
import { useAvatarStore } from '../../lib/store';
import { OUTFIT_COLOR_PRESETS } from '../../lib/avatarConfig';
import { Shirt, AlertCircle, Check } from 'lucide-react';

export function OutfitTab() {
  const outfit = useAvatarStore((s) => s.config.outfit);
  const updateOutfit = useAvatarStore((s) => s.updateOutfit);
  const availableMeshes = useAvatarStore((s) => s.availableMeshes);

  const hasOutfitMaterials = availableMeshes.outfitMaterials.length > 0;
  const outfitMeshes = availableMeshes.outfitMeshes;

  const toggleMesh = (meshName: string) => {
    const active = outfit.activeMeshes || [];
    const updated = active.includes(meshName)
      ? active.filter((m) => m !== meshName)
      : [...active, meshName];
    updateOutfit({ activeMeshes: updated });
  };

  return (
    <div className="space-y-6">
      {/* Primary Outfit Color */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-slate-200">Primary Color (Top / Main)</label>
          <span className="text-xs font-mono text-slate-400">{outfit.primaryColor.toUpperCase()}</span>
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-9 gap-2">
          {OUTFIT_COLOR_PRESETS.map((hex) => {
            const isSelected = outfit.primaryColor.toLowerCase() === hex.toLowerCase();
            return (
              <button
                key={hex}
                type="button"
                onClick={() => updateOutfit({ primaryColor: hex })}
                className={`relative w-full aspect-square rounded-xl transition-all duration-150 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                  isSelected ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900 scale-105' : 'hover:opacity-90'
                }`}
                style={{ backgroundColor: hex }}
                aria-label={`Select primary outfit color ${hex}`}
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

        <div className="mt-3 flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <input
            type="color"
            value={outfit.primaryColor}
            onChange={(e) => updateOutfit({ primaryColor: e.target.value })}
            className="w-9 h-9 rounded-lg border border-slate-700 bg-transparent cursor-pointer p-0.5"
            aria-label="Custom primary outfit color"
          />
          <div className="flex-1">
            <p className="text-xs font-medium text-slate-300">Custom Primary Tone</p>
            <p className="text-[11px] text-slate-500">Pick any custom HEX color for clothing</p>
          </div>
        </div>
      </div>

      {/* Secondary Outfit Color */}
      <div className="pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-slate-200">Secondary Color (Pants / Accent)</label>
          <span className="text-xs font-mono text-slate-400">{outfit.secondaryColor.toUpperCase()}</span>
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-9 gap-2">
          {OUTFIT_COLOR_PRESETS.map((hex) => {
            const isSelected = outfit.secondaryColor.toLowerCase() === hex.toLowerCase();
            return (
              <button
                key={hex}
                type="button"
                onClick={() => updateOutfit({ secondaryColor: hex })}
                className={`relative w-full aspect-square rounded-xl transition-all duration-150 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                  isSelected ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900 scale-105' : 'hover:opacity-90'
                }`}
                style={{ backgroundColor: hex }}
                aria-label={`Select secondary outfit color ${hex}`}
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

        <div className="mt-3 flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <input
            type="color"
            value={outfit.secondaryColor}
            onChange={(e) => updateOutfit({ secondaryColor: e.target.value })}
            className="w-9 h-9 rounded-lg border border-slate-700 bg-transparent cursor-pointer p-0.5"
            aria-label="Custom secondary outfit color"
          />
          <div className="flex-1">
            <p className="text-xs font-medium text-slate-300">Custom Secondary Tone</p>
            <p className="text-[11px] text-slate-500">Pick any custom HEX color for accents</p>
          </div>
        </div>
      </div>

      {/* Mesh Toggle by Name (if model provides modular clothing meshes) */}
      {outfitMeshes.length > 0 && (
        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <Shirt className="w-4 h-4 text-indigo-400" />
            <h4 className="text-sm font-medium text-slate-200">Modular Clothing Layers</h4>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {outfitMeshes.map((meshName) => {
              const isChecked = (outfit.activeMeshes || []).includes(meshName);
              return (
                <button
                  key={meshName}
                  type="button"
                  onClick={() => toggleMesh(meshName)}
                  className={`flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg text-left truncate border transition ${
                    isChecked
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span className="truncate">{meshName}</span>
                  {isChecked && <Check className="w-3.5 h-3.5 shrink-0 text-indigo-400 ml-1.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!hasOutfitMaterials && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>No specific outfit material pattern detected in loaded model.</span>
        </div>
      )}
    </div>
  );
}
