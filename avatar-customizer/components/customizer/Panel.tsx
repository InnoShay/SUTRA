'use client';

import React, { useState } from 'react';
import { HairTab } from './HairTab';
import { SkinTab } from './SkinTab';
import { EyesTab } from './EyesTab';
import { OutfitTab } from './OutfitTab';
import { AccessoriesTab } from './AccessoriesTab';
import { ExpressionTab } from './ExpressionTab';
import { PoseTab } from './PoseTab';
import { Toolbar } from './Toolbar';
import {
  Sparkles,
  User,
  Eye,
  Shirt,
  Glasses,
  Smile,
  Activity,
} from 'lucide-react';

export type CustomizerTab =
  | 'hair'
  | 'skin'
  | 'eyes'
  | 'outfit'
  | 'accessories'
  | 'expression'
  | 'pose';

const TABS: { id: CustomizerTab; label: string; icon: React.ReactNode }[] = [
  { id: 'hair', label: 'Hair', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'skin', label: 'Skin', icon: <User className="w-4 h-4" /> },
  { id: 'eyes', label: 'Eyes', icon: <Eye className="w-4 h-4" /> },
  { id: 'outfit', label: 'Outfit', icon: <Shirt className="w-4 h-4" /> },
  { id: 'accessories', label: 'Accessories', icon: <Glasses className="w-4 h-4" /> },
  { id: 'expression', label: 'Expression', icon: <Smile className="w-4 h-4" /> },
  { id: 'pose', label: 'Pose', icon: <Activity className="w-4 h-4" /> },
];

interface PanelProps {
  onCaptureSnapshot?: () => Promise<void>;
  isCapturing?: boolean;
}

export function Panel({ onCaptureSnapshot, isCapturing }: PanelProps) {
  const [activeTab, setActiveTab] = useState<CustomizerTab>('hair');

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Action Toolbar */}
      <Toolbar onCaptureSnapshot={onCaptureSnapshot} isCapturing={isCapturing} />

      {/* Main Tabbed Customizer Container */}
      <div className="flex-1 flex flex-col min-h-0 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="flex items-center gap-1.5 p-2 bg-slate-950/60 border-b border-slate-800/80 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
                aria-selected={isActive}
                role="tab"
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 p-5 overflow-y-auto" role="tabpanel">
          {activeTab === 'hair' && <HairTab />}
          {activeTab === 'skin' && <SkinTab />}
          {activeTab === 'eyes' && <EyesTab />}
          {activeTab === 'outfit' && <OutfitTab />}
          {activeTab === 'accessories' && <AccessoriesTab />}
          {activeTab === 'expression' && <ExpressionTab />}
          {activeTab === 'pose' && <PoseTab />}
        </div>
      </div>
    </div>
  );
}
