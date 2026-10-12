"use client";

import React, { useEffect, useState } from "react";
import { Shuffle } from "lucide-react";
import { AVATAR_GROUPS, avatarGroupFor, type AvatarGroup } from "@/lib/avatar-assets";

interface AvatarPickerProps {
  value: string;
  onChange: (avatar: string) => void;
}

function pickAvatar(group?: AvatarGroup, current?: string) {
  const candidates = group ? AVATAR_GROUPS[group] : Object.values(AVATAR_GROUPS).flat();
  const options = candidates.filter((avatar) => avatar !== current);
  const pool = options.length > 0 ? options : candidates;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  const [group, setGroup] = useState<AvatarGroup>(avatarGroupFor(value) || "male");
  const selectedGroup = avatarGroupFor(value) || group;

  useEffect(() => {
    const selectedGroup = avatarGroupFor(value);
    if (selectedGroup) setGroup(selectedGroup);
    else if (!value) onChange(pickAvatar());
  }, [value, onChange]);

  const randomize = () => onChange(pickAvatar(selectedGroup, value));
  const chooseGroup = (nextGroup: AvatarGroup) => {
    setGroup(nextGroup);
    if (nextGroup !== selectedGroup) onChange(pickAvatar(nextGroup, value));
  };
  const displayedAvatar = value || "/avatars/male/avatar-001.png";

  return (
    <section className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3" aria-label="Profile avatar">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#b698bb] ring-1 ring-black/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={displayedAvatar} alt="Selected profile avatar" className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="inline-flex rounded-lg border border-neutral-200 bg-neutral-100 p-0.5" role="group" aria-label="Avatar gender">
          {(["female", "male"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => chooseGroup(option)}
                aria-pressed={selectedGroup === option}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize transition-all ${
                  selectedGroup === option
                    ? "bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-200"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                {option}
              </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={randomize}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white shadow-sm transition hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-900/20 focus:ring-offset-2"
        aria-label={`Shuffle to another ${selectedGroup} avatar`}
        title="Shuffle avatar"
      >
        <Shuffle className="h-3.5 w-3.5" />
      </button>
    </section>
  );
}
