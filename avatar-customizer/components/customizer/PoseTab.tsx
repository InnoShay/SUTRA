'use client';

import React from 'react';
import { useAvatarStore } from '../../lib/store';
import { AvatarPose } from '../../lib/avatarConfig';
import { POSE_DEFINITIONS } from '../../lib/vrm/poses';
import { UserCheck, HandMetal, Shield } from 'lucide-react';

export function PoseTab() {
  const currentPose = useAvatarStore((s) => s.config.pose);
  const setPose = useAvatarStore((s) => s.setPose);

  const getPoseIcon = (pose: AvatarPose) => {
    switch (pose) {
      case 'relaxed':
        return <UserCheck className="w-5 h-5 text-emerald-400" />;
      case 'wave':
        return <HandMetal className="w-5 h-5 text-amber-400" />;
      case 'arms_crossed':
        return <Shield className="w-5 h-5 text-indigo-400" />;
    }
  };

  const posesList: AvatarPose[] = ['relaxed', 'wave', 'arms_crossed'];

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-200">Humanoid Pose</label>
        <p className="text-xs text-slate-400 mt-0.5">
          Preset normalized bone rotations applied dynamically across the skeleton.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {posesList.map((poseKey) => {
          const poseInfo = POSE_DEFINITIONS[poseKey];
          const isSelected = currentPose === poseKey;

          return (
            <button
              key={poseKey}
              type="button"
              onClick={() => setPose(poseKey)}
              className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'bg-indigo-600/20 border-indigo-500 shadow-md shadow-indigo-950/40 ring-1 ring-indigo-500'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className="p-2 rounded-lg bg-slate-800/80 mb-2">
                {getPoseIcon(poseKey)}
              </div>
              <span className={`text-xs font-semibold ${isSelected ? 'text-indigo-300' : 'text-slate-200'}`}>
                {poseInfo.name}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                {poseInfo.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
