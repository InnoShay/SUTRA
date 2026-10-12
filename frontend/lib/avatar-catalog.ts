/**
 * SUTRA Approved Avatar Studio Catalogue
 * Strict, inclusive, non-binary cosmetic options and layered SVG palette tokens.
 */

export interface AvatarTraitOption {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

export interface AvatarConfigDTO {
  preset: string;
  skin_tone: string;
  hair_style: string;
  hair_color: string;
  expression: string;
  facial_feature: string;
  clothing_style: string;
  clothing_color: string;
  accessory: string;
  background: string;
}

export interface StudentIdentityDTO {
  sutra_id: string;
  display_name: string;
  avatar_config: AvatarConfigDTO;
  avatar_url?: string | null;
  collectible_status: "unminted" | "pending" | "minted" | "failed";
  collectible_token_id?: number | null;
  collectible_tx_hash?: string | null;
  wallet_address?: string | null;
  minted_at?: string | null;
  chain_id?: number;
  mint_mode?: "onchain" | "none";
  contract_address?: string | null;
  explorer_url?: string | null;
  onchain_enabled?: boolean;
  artwork_url: string;
  collectible_error?: string | null;
  created_at: string;
  network?: string;
  is_test_asset?: boolean;
  disclaimer?: string;
}

export const DEFAULT_AVATAR_CONFIG: AvatarConfigDTO = {
  preset: "scholar",
  skin_tone: "golden",
  hair_style: "curls",
  hair_color: "midnight",
  expression: "confident",
  facial_feature: "none",
  clothing_style: "academic_blazer",
  clothing_color: "navy",
  accessory: "none",
  background: "minimal_gray",
};

export const AVATAR_PRESETS: { id: string; name: string; description: string; config: AvatarConfigDTO }[] = [
  {
    id: "scholar",
    name: "The Scholar",
    description: "Academic focus with tailored blazer and observant expression",
    config: {
      preset: "scholar",
      skin_tone: "golden",
      hair_style: "curls",
      hair_color: "midnight",
      expression: "confident",
      facial_feature: "none",
      clothing_style: "academic_blazer",
      clothing_color: "navy",
      accessory: "smart_glasses",
      background: "minimal_gray",
    },
  },
  {
    id: "innovator",
    name: "The Innovator",
    description: "Tech-forward casual with headphones and focused presence",
    config: {
      preset: "innovator",
      skin_tone: "espresso",
      hair_style: "locs",
      hair_color: "midnight",
      expression: "visionary",
      facial_feature: "light_beard",
      clothing_style: "tech_hoodie",
      clothing_color: "monochrome",
      accessory: "headphones",
      background: "ocean",
    },
  },
  {
    id: "creator",
    name: "The Creator",
    description: "Artistic vibrance with flowing hair and creative poise",
    config: {
      preset: "creator",
      skin_tone: "amber",
      hair_style: "flowing",
      hair_color: "chestnut",
      expression: "joyful",
      facial_feature: "freckles",
      clothing_style: "streetwear",
      clothing_color: "slate",
      accessory: "stud_earring",
      background: "sunset",
    },
  },
  {
    id: "strategist",
    name: "The Strategist",
    description: "Crisp collared composure with analytical stillness",
    config: {
      preset: "strategist",
      skin_tone: "bronze",
      hair_style: "short_crop",
      hair_color: "chestnut",
      expression: "focused",
      facial_feature: "clean",
      clothing_style: "crisp_collared",
      clothing_color: "slate",
      accessory: "lapel_pin",
      background: "minimal_gray",
    },
  },
  {
    id: "vanguard",
    name: "The Vanguard",
    description: "Bold leadership presence with structured styling",
    config: {
      preset: "vanguard",
      skin_tone: "chestnut",
      hair_style: "braids",
      hair_color: "obsidian",
      expression: "confident",
      facial_feature: "none",
      clothing_style: "varsity_jacket",
      clothing_color: "crimson",
      accessory: "none",
      background: "dusk",
    },
  },
  {
    id: "nomad",
    name: "The Nomad",
    description: "Eclectic resilience with comfort-knit layers",
    config: {
      preset: "nomad",
      skin_tone: "mocha",
      hair_style: "messy",
      hair_color: "honey",
      expression: "calm",
      facial_feature: "none",
      clothing_style: "minimal_knit",
      clothing_color: "amber",
      accessory: "scarf",
      background: "emerald",
    },
  },
  {
    id: "luminary",
    name: "The Luminary",
    description: "Research pioneer in pristine lab styling",
    config: {
      preset: "luminary",
      skin_tone: "porcelain",
      hair_style: "topknot",
      hair_color: "silver",
      expression: "friendly",
      facial_feature: "none",
      clothing_style: "lab_coat",
      clothing_color: "cream",
      accessory: "smart_glasses",
      background: "minimal_gray",
    },
  },
  {
    id: "sentinel",
    name: "The Sentinel",
    description: "Grounding discipline with clean high-fade precision",
    config: {
      preset: "sentinel",
      skin_tone: "hazel",
      hair_style: "high_fade",
      hair_color: "midnight",
      expression: "focused",
      facial_feature: "goatee",
      clothing_style: "academic_blazer",
      clothing_color: "emerald",
      accessory: "lapel_pin",
      background: "obsidian",
    },
  },
];

export const SKIN_TONES: Record<
  string,
  { name: string; hex: string; highlight: string; shadow: string; deepShadow: string; blush: string }
> = {
  porcelain: {
    name: "Porcelain",
    highlight: "#FFF6EF",
    hex: "#FCE5D8",
    shadow: "#EDB5A0",
    deepShadow: "#D4967E",
    blush: "#FCA5A5",
  },
  amber: {
    name: "Warm Amber",
    highlight: "#FDE8D4",
    hex: "#F3C59E",
    shadow: "#DB9A6E",
    deepShadow: "#BF7B4E",
    blush: "#FB7185",
  },
  golden: {
    name: "Golden Honey",
    highlight: "#F8D9BC",
    hex: "#E5A672",
    shadow: "#C57B43",
    deepShadow: "#A65F29",
    blush: "#F43F5E",
  },
  bronze: {
    name: "Sunlit Bronze",
    highlight: "#E6AF84",
    hex: "#CA8553",
    shadow: "#A85B2A",
    deepShadow: "#884216",
    blush: "#E11D48",
  },
  hazel: {
    name: "Hazel Nut",
    highlight: "#CF946B",
    hex: "#B06E41",
    shadow: "#884C23",
    deepShadow: "#6C3714",
    blush: "#BE123C",
  },
  chestnut: {
    name: "Chestnut",
    highlight: "#B26F48",
    hex: "#8D4B27",
    shadow: "#663013",
    deepShadow: "#4E210A",
    blush: "#9F1239",
  },
  mocha: {
    name: "Mocha",
    highlight: "#915835",
    hex: "#6C3A1F",
    shadow: "#4D2411",
    deepShadow: "#351508",
    blush: "#881337",
  },
  espresso: {
    name: "Espresso",
    highlight: "#6B3F2A",
    hex: "#4A2718",
    shadow: "#2E150C",
    deepShadow: "#1D0B05",
    blush: "#701A75",
  },
};

export const HAIR_COLORS: Record<
  string,
  { name: string; hex: string; highlight: string; shadow: string; sheen: string }
> = {
  midnight: { name: "Midnight Black", hex: "#18181B", highlight: "#3F3F46", shadow: "#09090B", sheen: "#71717A" },
  obsidian: { name: "Obsidian", hex: "#0F172A", highlight: "#334155", shadow: "#020617", sheen: "#64748B" },
  espresso: { name: "Dark Espresso", hex: "#3B2219", highlight: "#5C3829", shadow: "#20110B", sheen: "#85543D" },
  chestnut: { name: "Chestnut Brown", hex: "#5C3218", highlight: "#824926", shadow: "#381C0B", sheen: "#A9653B" },
  auburn: { name: "Auburn Flame", hex: "#9A3412", highlight: "#C2410C", shadow: "#641F07", sheen: "#EA580C" },
  honey: { name: "Honey Amber", hex: "#D97706", highlight: "#F59E0B", shadow: "#92400E", sheen: "#FBBF24" },
  silver: { name: "Platinum Silver", hex: "#CBD5E1", highlight: "#F1F5F9", shadow: "#94A3B8", sheen: "#FFFFFF" },
  cosmic_violet: { name: "Cosmic Violet", hex: "#7C3AED", highlight: "#A78BFA", shadow: "#4C1D95", sheen: "#C4B5FD" },
  electric_teal: { name: "Electric Teal", hex: "#0D9488", highlight: "#2DD4BF", shadow: "#115E59", sheen: "#5EEAD4" },
};

export const CLOTHING_COLORS: Record<
  string,
  { name: string; primary: string; secondary: string; highlight: string; deep: string }
> = {
  navy: { name: "Oxford Navy", primary: "#1E3A8A", secondary: "#172554", highlight: "#3B82F6", deep: "#0F172A" },
  slate: { name: "Slate Modern", primary: "#334155", secondary: "#0F172A", highlight: "#64748B", deep: "#020617" },
  emerald: { name: "Academic Emerald", primary: "#065F46", secondary: "#022C22", highlight: "#10B981", deep: "#021A14" },
  crimson: { name: "Varsity Crimson", primary: "#991B1B", secondary: "#450A0A", highlight: "#EF4444", deep: "#280505" },
  amber: { name: "Warm Ochre", primary: "#B45309", secondary: "#78350F", highlight: "#F59E0B", deep: "#451A03" },
  violet: { name: "Imperial Violet", primary: "#5B21B6", secondary: "#2E1065", highlight: "#8B5CF6", deep: "#1E0A40" },
  monochrome: { name: "Monochrome Matte", primary: "#27272A", secondary: "#09090B", highlight: "#52525B", deep: "#000000" },
  cream: { name: "Ivory Cream", primary: "#F8FAFC", secondary: "#CBD5E1", highlight: "#FFFFFF", deep: "#94A3B8" },
};

export const BACKGROUNDS: Record<string, { name: string; gradient: string }> = {
  minimal_gray: { name: "Editorial Grey", gradient: "linear-gradient(180deg, #FAFAFA 0%, #EAEAEB 100%)" },
  aurora: { name: "Studio Neutral", gradient: "linear-gradient(180deg, #F8FAFC 0%, #E2E8F0 100%)" },
  ocean: { name: "Deep Charcoal", gradient: "linear-gradient(180deg, #27272A 0%, #0F172A 100%)" },
  dusk: { name: "Warm Oat", gradient: "linear-gradient(180deg, #FAF7F2 0%, #EDE6DC 100%)" },
  cyber: { name: "Slate Matte", gradient: "linear-gradient(180deg, #F1F5F9 0%, #E2E8F0 100%)" },
  emerald: { name: "Muted Sage", gradient: "linear-gradient(180deg, #F4F6F4 0%, #E3E8E3 100%)" },
  obsidian: { name: "Obsidian Void", gradient: "linear-gradient(180deg, #18181B 0%, #09090B 100%)" },
  sunset: { name: "Terracotta Linen", gradient: "linear-gradient(180deg, #FDF8F5 0%, #F5EAE4 100%)" },
};

export const HAIR_STYLES: AvatarTraitOption[] = [
  { id: "curls", name: "Natural Curls" },
  { id: "locs", name: "Sculpted Locs" },
  { id: "braids", name: "Box Braids" },
  { id: "short_crop", name: "Short Crop" },
  { id: "high_fade", name: "High Fade" },
  { id: "bob", name: "Modern Bob" },
  { id: "flowing", name: "Flowing Waves" },
  { id: "messy", name: "Textured Messy" },
  { id: "topknot", name: "Samurai Topknot" },
  { id: "buzz", name: "Clean Buzz" },
];

export const EXPRESSIONS: AvatarTraitOption[] = [
  { id: "confident", name: "Confident Grin" },
  { id: "focused", name: "Analytical Focus" },
  { id: "friendly", name: "Warm Smile" },
  { id: "calm", name: "Zen Composure" },
  { id: "joyful", name: "Radiant Joy" },
  { id: "visionary", name: "Visionary Gaze" },
];

export const FACIAL_FEATURES: AvatarTraitOption[] = [
  { id: "none", name: "Clean Complexion" },
  { id: "freckles", name: "Sun Freckles" },
  { id: "light_beard", name: "Trimmed Shadow" },
  { id: "goatee", name: "Sculpted Goatee" },
];

export const CLOTHING_STYLES: AvatarTraitOption[] = [
  { id: "academic_blazer", name: "Academic Blazer" },
  { id: "tech_hoodie", name: "Minimal Tech Hoodie" },
  { id: "crisp_collared", name: "Crisp Oxford Shirt" },
  { id: "varsity_jacket", name: "Campus Varsity" },
  { id: "minimal_knit", name: "Fine-Knit Crew" },
  { id: "lab_coat", name: "Research Lab Coat" },
  { id: "streetwear", name: "Layered Streetwear" },
];

export const ACCESSORIES: AvatarTraitOption[] = [
  { id: "none", name: "No Accessory" },
  { id: "smart_glasses", name: "Titanium Glasses" },
  { id: "headphones", name: "Studio Headphones" },
  { id: "stud_earring", name: "Single Gold Stud" },
  { id: "scarf", name: "Woven Silk Scarf" },
  { id: "lapel_pin", name: "Sutra Gold Pin" },
];
