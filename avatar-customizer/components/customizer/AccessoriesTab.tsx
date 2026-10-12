'use client';

import React from 'react';
import { useAvatarStore } from '../../lib/store';
import { ACCESSORIES_LIST } from '../../lib/accessories';
import { OUTFIT_COLOR_PRESETS } from '../../lib/avatarConfig';
import { Check, Glasses, Headphones, Crown } from 'lucide-react';

export function AccessoriesTab() {
  const accessories = useAvatarStore((s) => s.config.accessories);
  const toggleAccessory = useAvatarStore((s) => s.toggleAccessory);
  const updateAccessoryColor = useAvatarStore((s) => s.updateAccessoryColor);

  const getIcon = (category: string) => {
    switch (category) {
      case 'glasses':
        return <Glasses className="w-5 h-5" />;
      case 'audio':
        return <Headphones className="w-5 h-5" />;
      case 'hat':
      default:
        return <Crown className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-200">Wearable Accessories</label>
        <p className="text-xs text-slate-400">
          3D accessories attached directly to humanoid bone nodes with live customization.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {ACCESSORIES_LIST.map((acc) => {
            const activeAcc = accessories.find((a) => a.id === acc.id);
            const isEquipped = Boolean(activeAcc);

            return (
              <div
                key={acc.id}
                className={`relative flex flex-col justify-between p-3.5 rounded-xl border transition-all ${
                  isEquipped
                    ? 'bg-indigo-950/40 border-indigo-500/70 shadow-lg shadow-indigo-950/30'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className={`p-2 rounded-lg ${isEquipped ? 'bg-indigo-600/30 text-indigo-300' : 'bg-slate-800/80 text-slate-400'}`}>
                    {getIcon(acc.category)}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleAccessory(acc.id, '#1e293b')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${
                      isEquipped
                        ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {isEquipped ? 'Equipped' : 'Equip'}
                  </button>
                </div>

                <div className="mt-3">
                  <h4 className="text-xs font-semibold text-slate-200">{acc.name}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{acc.description}</p>
                </div>

                {/* Accessory Color Control if equipped */}
                {isEquipped && activeAcc && (
                  <div className="mt-3 pt-3 border-t border-indigo-900/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-300">Item Color:</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={activeAcc.color}
                          onChange={(e) => updateAccessoryColor(acc.id, e.target.value)}
                          className="w-5 h-5 rounded cursor-pointer border border-slate-700 bg-transparent p-0"
                          aria-label={`Pick color for ${acc.name}`}
                        />
                        <span className="text-[10px] font-mono text-slate-400">{activeAcc.color}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {OUTFIT_COLOR_PRESETS.slice(0, 6).map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => updateAccessoryColor(acc.id, hex)}
                          className="w-4 h-4 rounded-full border border-slate-700 transition hover:scale-110"
                          style={{ backgroundColor: hex }}
                          aria-label={`Color swatch ${hex}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
