"use client";

import React, { useState, useEffect } from "react";

interface UserAvatarProps {
  src?: string | null;
  avatarUrl?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
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
 * - Accepts both `src` and `avatarUrl`
 * - Supports responsive `size` variants ("sm", "md", "lg", "xl")
 * - Loads images with referrerpolicy="no-referrer" (required for OAuth profile pictures)
 * - Automatically falls back to a colored initials circle on load error or empty src
 * - Resets load error state when src changes
 */
export function UserAvatar({
  src,
  avatarUrl,
  name = "User",
  size,
  className = "",
}: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const requestedSrc = src ?? avatarUrl;
  const effectiveSrc = requestedSrc === "sutra-custom-avatar" ? "/avatars/male/avatar-001.png" : requestedSrc;

  // Reset failure state whenever src changes
  useEffect(() => {
    setFailed(false);
  }, [effectiveSrc]);

  const cleanSrc = effectiveSrc && effectiveSrc.trim() !== "" ? effectiveSrc.trim() : null;
  const hue = nameToHue(name || "U");
  const initials = getInitials(name || "U");

  const sizeClasses = size
    ? {
        sm: "w-7 h-7 text-[11px]",
        md: "w-9 h-9 text-xs",
        lg: "w-12 h-12 text-sm",
        xl: "w-16 h-16 text-lg",
      }[size]
    : "";

  if (!cleanSrc || failed) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full flex-shrink-0 font-bold select-none text-white tracking-tight ${sizeClasses} ${className}`}
        style={{
          background: `hsl(${hue}, 58%, 46%)`,
          fontSize: size ? undefined : "0.75rem",
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
      className={`rounded-full object-cover flex-shrink-0 ${sizeClasses} ${className}`}
      onError={() => setFailed(true)}
    />
  );
}

export default UserAvatar;
