'use client';

import React from 'react';
import { useAvatarStore } from '../../lib/store';
import { AvatarExpression } from '../../lib/avatarConfig';
import { Smile, Frown, Flame, Zap, Coffee, Meh } from 'lucide-react';

const EXPRESSIONS: { id: AvatarExpression; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: 'neutral', label: 'Neutral', desc: 'Calm, balanced resting face', icon: <Meh className="w-5 h-5 text-slate-400" /> },
  { id: 'happy', label: 'Happy', desc: 'Warm joyful smile', icon: <Smile className="w-5 h-5 text-amber-400" /> },
  { id: 'relaxed', label: 'Relaxed', desc: 'Gentle, friendly contentment', icon: <Coffee className="w-5 h-5 text-emerald-400" /> },
  { id: 'surprised', label: 'Surprised', desc: 'Wide-eyed excitement', icon: <Zap className="w-5 h-5 text-sky-400" /> },
  { id: 'sad', label: 'Pensive', desc: 'Gentle melancholy', icon: <Frown className="w-5 h-5 text-blue-400" /> },
  { id: 'angry', label: 'Fierce', desc: 'Determined sharp focus', icon: <Flame className="w-5 h-5 text-rose-400" /> },
];

export function ExpressionTab() {
  const currentExpression = useAvatarStore((s) => s.config.expression);
  const setExpression = useAvatarStore((s) => s.setExpression);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-200">Facial Expression</label>
        <p className="text-xs text-slate-400 mt-0.5">
          Dynamic morph blendshapes applied to the avatar face in real time.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {EXPRESSIONS.map((item) => {
          const isSelected = currentExpression === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setExpression(item.id)}
              className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'bg-indigo-600/20 border-indigo-500 shadow-md shadow-indigo-950/40 ring-1 ring-indigo-500'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className="p-2 rounded-lg bg-slate-800/80 mb-2">
                {item.icon}
              </div>
              <span className={`text-xs font-semibold ${isSelected ? 'text-indigo-300' : 'text-slate-200'}`}>
                {item.label}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{item.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
