"use client";

import React, { useState, useEffect } from "react";

interface UserAvatarProps {
  src?: string | null;
  name: string;
  className?: string;
}

function nameToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function getInitials(name: string): string {
  if (!name || !name.trim()) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Renders a user avatar that:
 * - Loads `src` with referrerpolicy="no-referrer" (required for Google OAuth profile pics)
 * - Automatically falls back to a colored initials circle on load error or empty src
 * - Resets load error state when src changes
 */
export function UserAvatar({ src, name, className = "" }: UserAvatarProps) {
  const [failed, setFailed] = useState(false);

  // Reset failure state whenever src changes
  useEffect(() => {
    setFailed(false);
  }, [src]);

  const cleanSrc = src && src.trim() !== "" ? src.trim() : null;
  const hue = nameToHue(name || "U");
  const initials = getInitials(name || "U");

  if (!cleanSrc || failed) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full flex-shrink-0 font-bold select-none text-white tracking-tight ${className}`}
        style={{
          background: `hsl(${hue}, 58%, 46%)`,
          fontSize: "0.75rem",
        }}
        aria-label={name}
      >
        {initials}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={cleanSrc}
      alt={name || "User avatar"}
      referrerPolicy="no-referrer"
      className={`rounded-full object-cover flex-shrink-0 ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
