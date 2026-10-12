export type AvatarGroup = "male" | "female";

const MALE_AVATAR_IDS = [
  ...Array.from({ length: 25 }, (_, index) => index + 1),
  ...Array.from({ length: 20 }, (_, index) => index + 71),
  ...Array.from({ length: 14 }, (_, index) => index + 103),
];

const FEMALE_AVATAR_IDS = [
  ...Array.from({ length: 45 }, (_, index) => index + 26),
  ...Array.from({ length: 12 }, (_, index) => index + 91),
];

export const AVATAR_GROUPS: Record<AvatarGroup, string[]> = {
  male: MALE_AVATAR_IDS.map((id) => `/avatars/male/avatar-${String(id).padStart(3, "0")}.png`),
  female: FEMALE_AVATAR_IDS.map((id) => `/avatars/female/avatar-${String(id).padStart(3, "0")}.png`),
};

export function avatarGroupFor(src: string | null | undefined): AvatarGroup | null {
  if (src?.startsWith("/avatars/male/")) return "male";
  if (src?.startsWith("/avatars/female/")) return "female";
  return null;
}
