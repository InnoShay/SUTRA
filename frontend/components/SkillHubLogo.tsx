import React from "react";

export function SkillHubLogoIcon({
  className = "w-6 h-6",
  color = "currentColor",
}: {
  className?: string;
  color?: string;
}) {
  const isWhite =
    color === "white" ||
    color === "#ffffff" ||
    color === "#fff" ||
    color === "rgb(255, 255, 255)";

  return (
    <img
      src="/sutra-logo.svg"
      alt="Sutra"
      className={`object-contain select-none shrink-0 ${className} ${
        isWhite ? "brightness-0 invert" : "brightness-0"
      }`}
      draggable={false}
    />
  );
}

export function SkillHubLogo({
  className = "",
  light = false,
}: {
  className?: string;
  light?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className={light ? "text-white" : "text-neutral-900"}>
        <SkillHubLogoIcon
          className="w-7 h-7"
          color={light ? "white" : "currentColor"}
        />
      </div>
      <span
        className={`text-xl font-bold tracking-tight font-heading ${
          light ? "text-white" : "text-neutral-900"
        }`}
      >
        Sutra
      </span>
    </div>
  );
}

