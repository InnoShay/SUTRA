/**
 * SUTRA SUPPLY — Authoritative Product Catalogue & Rewards Ledger
 * Brand: SUTRA SUPPLY
 * Tagline: Earned, not bought.
 * Supporting: Your effort. Your points. Your SUTRA essentials.
 * Hero: Made for your next chapter.
 */

export type ProductCategory = "all" | "apparel" | "stationery" | "desk-tech" | "accessories";

export interface ProductVariantOption {
  name: string;
  type: "size" | "color" | "format" | "capacity";
  values: string[];
}

export interface ShopProduct {
  id: string;
  name: string;
  category: "apparel" | "stationery" | "desk-tech" | "accessories";
  categoryLabel: string;
  tagline: string;
  description: string;
  pointsCost: number;
  image: string;
  fallbackGradient: string;
  variantOptions: ProductVariantOption[];
  materials: string;
  specifications: string[];
  packaging: string;
  inStock: boolean;
  stockCount: number;
  badge?: string;
  featured?: boolean;
}

export interface StudentRewardsAccount {
  studentId: string;
  studentName: string;
  studentEmail: string;
  program: string;
  cohort: string;
  lifetimePoints: number;
  availablePoints: number;
  pointsSpent: number;
  thresholdPoints: number; // 500
  isEligible: boolean; // lifetimePoints >= thresholdPoints
  pointsNeededForEligibility: number;
  accountStatus: "active" | "restricted";
  lastUpdated: string;
}

export interface RedemptionRecord {
  redemptionId: string;
  idempotencyKey: string;
  studentId: string;
  productId: string;
  productName: string;
  variantSelections: Record<string, string>;
  quantity: number;
  pointsDeducted: number;
  remainingBalance: number;
  createdAt: string;
  status: "confirmed" | "ready_for_pickup" | "fulfilled";
  fulfilmentStatus: string;
  fulfilmentLocation: string;
  collectionCode: string;
}

export interface RedeemRequestPayload {
  studentId: string;
  productId: string;
  variantSelections: Record<string, string>;
  quantity: number;
  idempotencyKey: string;
}

export interface RedeemResponsePayload {
  success: boolean;
  message: string;
  redemption?: RedemptionRecord;
  updatedAccount?: StudentRewardsAccount;
  error?: string;
}

export const ELIGIBILITY_THRESHOLD_POINTS = 500;

export const SUTRA_CATALOGUE: ShopProduct[] = [
  {
    id: "sutra-essential-tee",
    name: "Essential Tee",
    category: "apparel",
    categoryLabel: "Apparel",
    tagline: "Heavyweight combed organic cotton with discreet chest mark",
    description:
      "Crafted from 240gsm combed organic cotton with a tailored relaxed fit. Features blind-stitched hems, ribbed collar with shape retention, and a tone-on-tone embroidered SUTRA mark on the left chest.",
    pointsCost: 500,
    image: "/shop/essential-tee.jpg",
    fallbackGradient: "from-[#1E3B2E] to-[#152B21]",
    variantOptions: [
      { name: "Size", type: "size", values: ["XS", "S", "M", "L", "XL"] },
      { name: "Color", type: "color", values: ["Forest Green", "Chalk White", "Slate Melange"] },
    ],
    materials: "100% GOTS-certified combed organic cotton (240 gsm)",
    specifications: [
      "Tone-on-tone SUTRA micro-embroidery",
      "Pre-shrunk ring-spun yarn",
      "Reinforced neck tape and twin-needle hem",
      "Machine wash cold, line dry recommended",
    ],
    packaging: "Unbleached kraft apparel mailer with vegetable ink seal",
    inStock: true,
    stockCount: 42,
    badge: "Student Favorite",
    featured: true,
  },
  {
    id: "sutra-everyday-hoodie",
    name: "Everyday Hoodie",
    category: "apparel",
    categoryLabel: "Apparel",
    tagline: "420gsm brushed French terry with micro-embroidered cuff crest",
    description:
      "Substantial campus layer built for library sessions and autumn commutes. Features double-layered hood without drawstring clutter, kangaroo pocket with concealed interior key slot, and an understated SUTRA crest at the left wrist.",
    pointsCost: 1000,
    image: "/shop/everyday-hoodie.jpg",
    fallbackGradient: "from-[#16382A] to-[#0F261C]",
    variantOptions: [
      { name: "Size", type: "size", values: ["S", "M", "L", "XL", "XXL"] },
      { name: "Color", type: "color", values: ["Deep Forest", "Heather Carbon"] },
    ],
    materials: "85% Organic Cotton, 15% Recycled Poly French Terry (420 gsm)",
    specifications: [
      "Heavyweight 420gsm brushed interior",
      "Double-lined hood with structured neck drop",
      "Micro-embroidered SUTRA cuff mark",
      "Concealed pocket phone/card holster",
    ],
    packaging: "Recyclable rigid campus box with tissue wrap",
    inStock: true,
    stockCount: 18,
    badge: "Milestone Tier",
    featured: true,
  },
  {
    id: "sutra-focus-notebook",
    name: "Focus Notebook",
    category: "stationery",
    categoryLabel: "Stationery",
    tagline: "160-page fountain-pen friendly journal with debossed cover",
    description:
      "Thread-bound lay-flat journal designed for structured study and reflective notes. Includes numbered pages, dual grosgrain ribbon markers, expandable back pocket, and a blind-debossed SUTRA wordmark on bookcloth buckram.",
    pointsCost: 250,
    image: "/shop/focus-notebook.jpg",
    fallbackGradient: "from-[#2A4736] to-[#1C3024]",
    variantOptions: [
      { name: "Layout", type: "format", values: ["Dot Grid (5mm)", "Ruled (7mm)", "Blank Plain"] },
      { name: "Cover", type: "color", values: ["Forest Buckram", "Raw Oatmeal"] },
    ],
    materials: "120gsm acid-free FSC paper, European archival bookcloth",
    specifications: [
      "160 numbered acid-free ivory pages",
      "Thread-bound Smyth sewn lay-flat binding",
      "Dual ribbon bookmarks in sage and cream",
      "Rear gusseted document pocket",
    ],
    packaging: "Protective corrugated band with embossed bellyband",
    inStock: true,
    stockCount: 85,
    badge: "Essential Study",
    featured: true,
  },
  {
    id: "sutra-pen",
    name: "SUTRA Pen",
    category: "stationery",
    categoryLabel: "Stationery",
    tagline: "Precision-machined aluminum barrel with laser-etched insignia",
    description:
      "Balanced writing instrument engineered from aerospace aluminum. Balanced center of gravity for fatigue-free exams, knurled grip pattern, and a silent twist deployment loaded with smooth German 0.5mm black gel ink.",
    pointsCost: 150,
    image: "/shop/sutra-pen.jpg",
    fallbackGradient: "from-[#38483B] to-[#253227]",
    variantOptions: [
      { name: "Finish", type: "color", values: ["Matte Brass", "Anodized Forest", "Midnight Slate"] },
    ],
    materials: "6061-T6 Anodized Aluminum with Schmidt 0.5mm Gel Cartridge",
    specifications: [
      "Precision weighted (28g balanced body)",
      "Low-profile laser engraved SUTRA mark",
      "Schmidt 888 ceramic roller refill compatible",
      "All-metal deployment mechanism",
    ],
    packaging: "Slender rigid paperboard gift sleeve with foam cradle",
    inStock: true,
    stockCount: 110,
    badge: "Daily Driver",
  },
  {
    id: "sutra-notebook-pen-set",
    name: "Notebook & Pen Set",
    category: "stationery",
    categoryLabel: "Stationery",
    tagline: "Curated companion pair in gift sleeve at bundled point savings",
    description:
      "The complete academic toolkit. Pairs the Focus Notebook with the matching machined SUTRA Pen in a keepsake rigid kraft sleeve. Perfect for semester onboarding and project sprints.",
    pointsCost: 380,
    image: "/shop/notebook-pen-set.jpg",
    fallbackGradient: "from-[#203D2E] to-[#14261D]",
    variantOptions: [
      { name: "Format", type: "format", values: ["Dot Grid + Brass Pen", "Ruled + Forest Pen"] },
    ],
    materials: "FSC 120gsm paper journal + 6061 aluminum pen",
    specifications: [
      "Includes 1x Focus Notebook (160p)",
      "Includes 1x SUTRA Pen with refill",
      "Bundle saves 20 reward points",
      "Includes SUTRA bookmark ruler",
    ],
    packaging: "Two-piece telescoping rigid presentation box with foil detail",
    inStock: true,
    stockCount: 34,
    badge: "Curated Bundle",
  },
  {
    id: "sutra-desk-mat",
    name: "Desk Mat",
    category: "desk-tech",
    categoryLabel: "Desk & Tech",
    tagline: "Dual-layer pressed wool felt with non-slip natural cork base",
    description:
      "Elevate your study space. High-density heathered wool felt dampens keyboard noise while providing a smooth optical mouse glide. Backed by sustainable Mediterranean cork that grips the desk without chemical adhesives.",
    pointsCost: 350,
    image: "/shop/desk-mat.jpg",
    fallbackGradient: "from-[#293B32] to-[#1A2620]",
    variantOptions: [
      { name: "Size", type: "size", values: ["Standard (80x40 cm)", "Compact (60x30 cm)"] },
      { name: "Tone", type: "color", values: ["Sage Felt", "Charcoal Heather"] },
    ],
    materials: "Pressed natural merino felt + Portuguese natural cork backing",
    specifications: [
      "4mm total thickness cushion profile",
      "Laser debossed vegan leather corner tab",
      "Anti-fray beveled precision edge",
      "Naturally water-repellent felt surface",
    ],
    packaging: "Heavyweight kraft cylinder roll with paper endcaps",
    inStock: true,
    stockCount: 29,
  },
  {
    id: "sutra-laptop-sleeve",
    name: "Laptop Sleeve",
    category: "desk-tech",
    categoryLabel: "Desk & Tech",
    tagline: "Water-resistant recycled ripstop with plush microfiber cradle",
    description:
      "Minimalist protection for lecture halls and transit. Built from recycled water-repellent shell with 6mm impact-absorbing foam padding and magnetic closure that prevents zipper scratching on laptop finishes.",
    pointsCost: 700,
    image: "/shop/laptop-sleeve.jpg",
    fallbackGradient: "from-[#1F3D2F] to-[#13281E]",
    variantOptions: [
      { name: "Device Fit", type: "size", values: ["13-14 inch", "15-16 inch"] },
      { name: "Color", type: "color", values: ["Deep Olive", "Graphite Melange"] },
    ],
    materials: "100% Recycled 600D ripstop polyester, high-pile microfleece",
    specifications: [
      "Dual hidden neodymium magnetic closures",
      "Exterior slip sleeve for cables and notebooks",
      "360-degree corner foam bumpers",
      "Discreet debossed SUTRA rubber crest",
    ],
    packaging: "Flat unbleached kraft protector envelope",
    inStock: true,
    stockCount: 22,
    badge: "Campus Ready",
  },
  {
    id: "sutra-cable-organizer",
    name: "Cable Organizer",
    category: "desk-tech",
    categoryLabel: "Desk & Tech",
    tagline: "Full-grain vegetable-tanned leather taco with solid brass snap",
    description:
      "Tame charger cables and earbuds inside your bag. Hand-burnished edges, vegetable-tanned leather that patinas gracefully over academic years, and a solid antique brass snap stamped with the SUTRA compass.",
    pointsCost: 200,
    image: "/shop/cable-organizer.jpg",
    fallbackGradient: "from-[#354338] to-[#222E25]",
    variantOptions: [
      { name: "Leather Color", type: "color", values: ["Forest Green", "Saddle Tan", "Matte Black"] },
    ],
    materials: "Vegetable-tanned full-grain leather, solid brass hardware",
    specifications: [
      "Holds 1-2 standard laptop or phone cables",
      "Hand-burnished beeswax edge finish",
      "Stamped SUTRA leaf-and-compass emblem",
      "Compact 9cm x 9cm folded footprint",
    ],
    packaging: "Hand-stamped cotton muslin drawstring pouch",
    inStock: true,
    stockCount: 65,
  },
  {
    id: "sutra-tote-bag",
    name: "Everyday Tote Bag",
    category: "accessories",
    categoryLabel: "Accessories",
    tagline: "16oz washed organic cotton canvas with reinforced box handles",
    description:
      "Roomy, durable tote engineered for textbooks, a laptop, and daily provisions. Features 65cm shoulder drop handles, internal zippered security pocket for your phone, and a durable water-based SUTRA SUPPLY seal.",
    pointsCost: 300,
    image: "/shop/tote-bag.jpg",
    fallbackGradient: "from-[#284235] to-[#182B22]",
    variantOptions: [
      { name: "Color", type: "color", values: ["Natural Ecru", "Deep Forest"] },
    ],
    materials: "16oz washed 100% organic cotton canvas, brass zipper",
    specifications: [
      "Generous 18L main capacity compartment",
      "Internal 18x16cm zipped key/wallet pocket",
      "Box-stitched reinforced handle joints",
      "Flat reinforced gusset base",
    ],
    packaging: "Folded with branded recycled paper bellyband",
    inStock: true,
    stockCount: 50,
    badge: "Popular",
  },
  {
    id: "sutra-reusable-bottle",
    name: "Reusable Bottle",
    category: "accessories",
    categoryLabel: "Accessories",
    tagline: "Vacuum-insulated food-grade stainless steel with textured coat",
    description:
      "Keeps hydration ice-cold for 24 hours or coffee piping hot for 12 hours. Sweat-free textured matte powder coating, leakproof threaded bamboo cap with folding stainless carry loop, and laser-etched SUTRA wordmark.",
    pointsCost: 600,
    image: "/shop/reusable-bottle.jpg",
    fallbackGradient: "from-[#1D3B2C] to-[#12271C]",
    variantOptions: [
      { name: "Capacity", type: "capacity", values: ["500 ml", "750 ml"] },
      { name: "Color", type: "color", values: ["Matte Forest", "Stone Chalk"] },
    ],
    materials: "18/8 Pro-grade stainless steel, FSC bamboo, silicone seal",
    specifications: [
      "TempGuard double-wall vacuum insulation",
      "100% BPA-free and toxin-free interior",
      "Wide mouth accommodates ice cubes and brushes",
      "Condensation-proof grip powder coat",
    ],
    packaging: "Recycled corrugated protective cylinder",
    inStock: true,
    stockCount: 38,
    badge: "Eco Campus",
  },
  {
    id: "sutra-sticker-set",
    name: "SUTRA Sticker Set",
    category: "accessories",
    categoryLabel: "Accessories",
    tagline: "Set of 6 heavy-duty die-cut UV and waterproof vinyl stickers",
    description:
      "Deck your laptop lid, water bottle, and notebooks. Coordinated set of 6 distinct illustrations featuring the SUTRA wordmark, 'Earned Not Bought' crest, Campus Compass, and Focus geometry in muted forest and cream tones.",
    pointsCost: 100,
    image: "/shop/sticker-set.jpg",
    fallbackGradient: "from-[#304738] to-[#1F2F24]",
    variantOptions: [
      { name: "Finish", type: "format", values: ["Matte Weatherproof Vinyl", "Holographic Accent"] },
    ],
    materials: "Heavyweight thick vinyl with UV protective laminate",
    specifications: [
      "6 individual kiss-cut decals per pack",
      "Scratchproof, waterproof, dishwasher safe",
      "Clean-removal adhesive leaves zero residue",
      "Printed with eco-solvent soy inks",
    ],
    packaging: "Glassine paper envelope with embossed sticker seal",
    inStock: true,
    stockCount: 150,
    badge: "Entry Reward",
  },
  {
    id: "sutra-enamel-pin-lanyard",
    name: "Enamel Pin & Lanyard",
    category: "accessories",
    categoryLabel: "Accessories",
    tagline: "Hard enamel lapel badge with woven recycled PET campus lanyard",
    description:
      "Showcase your academic commitment on your jacket or student ID. Includes a die-struck brass and forest green hard enamel pin alongside a 20mm woven lanyard made from recycled ocean plastics with matte black swivel hook.",
    pointsCost: 120,
    image: "/shop/pin-lanyard.jpg",
    fallbackGradient: "from-[#2A3E31] to-[#18271E]",
    variantOptions: [
      { name: "Hardware", type: "color", values: ["Antique Brass", "Matte Black"] },
    ],
    materials: "Die-struck copper alloy with hard enamel + RPET woven ribbon",
    specifications: [
      "25mm diameter jewelry-grade pin",
      "Dual rubber clutch backs prevent spinning",
      "Safety breakaway buckle on lanyard neck",
      "Includes engraved metal SUTRA charm",
    ],
    packaging: "Printed backer card on heavy recycled chipboard",
    inStock: true,
    stockCount: 95,
  },
];

// Initial mock accounts for realistic testing & evaluation
export const INITIAL_STUDENT_ACCOUNTS: Record<string, StudentRewardsAccount> = {
  // Primary logged-in student (Asha, SYN-1007)
  "66666666-6666-6666-6666-666666666666": {
    studentId: "66666666-6666-6666-6666-666666666666",
    studentName: "Asha (synthetic)",
    studentEmail: "syn-1007@sutra.edu",
    program: "B.Tech Computer Science & AI",
    cohort: "Cohort 2026 • Year 2",
    lifetimePoints: 850,
    availablePoints: 600,
    pointsSpent: 250,
    thresholdPoints: ELIGIBILITY_THRESHOLD_POINTS,
    isEligible: true,
    pointsNeededForEligibility: 0,
    accountStatus: "active",
    lastUpdated: new Date().toISOString(),
  },
  // Ineligible student below 500 lifetime threshold
  "student-below-threshold": {
    studentId: "student-below-threshold",
    studentName: "Rohan V. (Freshman)",
    studentEmail: "rohan.v@sutra.edu",
    program: "B.Des Communication Design",
    cohort: "Cohort 2027 • Year 1",
    lifetimePoints: 350,
    availablePoints: 350,
    pointsSpent: 0,
    thresholdPoints: ELIGIBILITY_THRESHOLD_POINTS,
    isEligible: false,
    pointsNeededForEligibility: 150, // 500 - 350
    accountStatus: "active",
    lastUpdated: new Date().toISOString(),
  },
  // Eligible student with low spendable balance
  "student-low-balance": {
    studentId: "student-low-balance",
    studentName: "Priya S. (Senior)",
    studentEmail: "priya.s@sutra.edu",
    program: "B.Tech Data Engineering",
    cohort: "Cohort 2025 • Year 3",
    lifetimePoints: 580,
    availablePoints: 80,
    pointsSpent: 500,
    thresholdPoints: ELIGIBILITY_THRESHOLD_POINTS,
    isEligible: true,
    pointsNeededForEligibility: 0,
    accountStatus: "active",
    lastUpdated: new Date().toISOString(),
  },
};

// Initial seed redemptions (representing Asha's previous redemption of 250 pts)
export const INITIAL_REDEMPTIONS: RedemptionRecord[] = [
  {
    redemptionId: "RDM-2026-9041",
    idempotencyKey: "seed-rdm-9041",
    studentId: "66666666-6666-6666-6666-666666666666",
    productId: "sutra-focus-notebook",
    productName: "Focus Notebook",
    variantSelections: { Layout: "Dot Grid (5mm)", Cover: "Forest Buckram" },
    quantity: 1,
    pointsDeducted: 250,
    remainingBalance: 600,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    status: "ready_for_pickup",
    fulfilmentStatus: "Ready for collection at SUTRA Student Success Desk",
    fulfilmentLocation: "Campus Hub, Building 4, Level 1 (Mon-Fri 10am-5pm)",
    collectionCode: "SUTRA-9041-NB",
  },
];

/**
 * Server In-Memory Ledger (persists across Next.js API requests in development/runtime)
 */
class ShopLedgerServerStore {
  private accounts: Map<string, StudentRewardsAccount> = new Map();
  private redemptions: RedemptionRecord[] = [];
  private processedIdempotencyKeys: Set<string> = new Set();
  private productStock: Map<string, number> = new Map();

  constructor() {
    this.resetToDefaults();
  }

  public resetToDefaults() {
    this.accounts.clear();
    Object.entries(INITIAL_STUDENT_ACCOUNTS).forEach(([id, acc]) => {
      this.accounts.set(id, { ...acc });
    });
    this.redemptions = [...INITIAL_REDEMPTIONS];
    this.processedIdempotencyKeys.clear();
    INITIAL_REDEMPTIONS.forEach((r) => this.processedIdempotencyKeys.add(r.idempotencyKey));
    this.productStock.clear();
    SUTRA_CATALOGUE.forEach((p) => {
      this.productStock.set(p.id, p.stockCount);
    });
  }

  public getAccount(studentId: string): StudentRewardsAccount {
    let acc = this.accounts.get(studentId);
    if (!acc) {
      // Default to Asha if not found
      acc = this.accounts.get("66666666-6666-6666-6666-666666666666")!;
    }
    return { ...acc };
  }

  public getProductStock(productId: string): number {
    return this.productStock.get(productId) ?? 0;
  }

  public getRedemptions(studentId: string): RedemptionRecord[] {
    return this.redemptions
      .filter((r) => r.studentId === studentId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public hasProcessedIdempotencyKey(key: string): boolean {
    return this.processedIdempotencyKeys.has(key);
  }

  public getRedemptionByIdempotencyKey(key: string): RedemptionRecord | undefined {
    return this.redemptions.find((r) => r.idempotencyKey === key);
  }

  /**
   * Atomic redemption execution
   */
  public executeRedemption(payload: RedeemRequestPayload): RedeemResponsePayload {
    const { studentId, productId, variantSelections, quantity, idempotencyKey } = payload;

    // 1. Idempotency check
    if (this.hasProcessedIdempotencyKey(idempotencyKey)) {
      const existing = this.getRedemptionByIdempotencyKey(idempotencyKey);
      const currentAcc = this.getAccount(studentId);
      return {
        success: true,
        message: "This redemption request was already processed successfully (idempotent).",
        redemption: existing,
        updatedAccount: currentAcc,
      };
    }

    // 2. Validate Student Account
    const account = this.accounts.get(studentId) || this.accounts.get("66666666-6666-6666-6666-666666666666");
    if (!account) {
      return { success: false, message: "Student account not found or unauthorized.", error: "UNAUTHORIZED_STUDENT" };
    }

    if (account.accountStatus !== "active") {
      return { success: false, message: "Account is restricted from rewards redemptions.", error: "ACCOUNT_RESTRICTED" };
    }

    // 3. Check Eligibility Threshold (500 lifetime points)
    if (account.lifetimePoints < ELIGIBILITY_THRESHOLD_POINTS) {
      const needed = ELIGIBILITY_THRESHOLD_POINTS - account.lifetimePoints;
      return {
        success: false,
        message: `Redemption eligibility threshold not met. You have ${account.lifetimePoints} lifetime points, but ${ELIGIBILITY_THRESHOLD_POINTS} lifetime points are required (${needed} more needed).`,
        error: "ELIGIBILITY_THRESHOLD_UNMET",
      };
    }

    // 4. Validate Product & Price
    const product = SUTRA_CATALOGUE.find((p) => p.id === productId);
    if (!product) {
      return { success: false, message: "Invalid product identifier.", error: "PRODUCT_NOT_FOUND" };
    }

    if (!quantity || quantity < 1 || quantity > 5) {
      return { success: false, message: "Invalid quantity specified (must be between 1 and 5).", error: "INVALID_QUANTITY" };
    }

    // 5. Validate Variants
    for (const opt of product.variantOptions) {
      const selected = variantSelections[opt.name];
      if (!selected || !opt.values.includes(selected)) {
        return {
          success: false,
          message: `Please select a valid option for ${opt.name}.`,
          error: "INVALID_VARIANT",
        };
      }
    }

    // 6. Check Inventory Stock
    const currentStock = this.productStock.get(productId) ?? 0;
    if (currentStock < quantity) {
      return {
        success: false,
        message: `Requested quantity exceeds available stock (${currentStock} units remaining).`,
        error: "INSUFFICIENT_STOCK",
      };
    }

    // 7. Check Available Balance
    const totalPointsCost = product.pointsCost * quantity;
    if (account.availablePoints < totalPointsCost) {
      const shortfall = totalPointsCost - account.availablePoints;
      return {
        success: false,
        message: `Insufficient available points. Total cost is ${totalPointsCost} points, but you have ${account.availablePoints} points available (${shortfall} points short).`,
        error: "INSUFFICIENT_POINTS",
      };
    }

    // 8. ATOMIC COMMIT: Deduct points, update spent, decrement stock, record transaction
    account.availablePoints -= totalPointsCost;
    account.pointsSpent += totalPointsCost;
    account.lastUpdated = new Date().toISOString();
    this.accounts.set(account.studentId, account);

    this.productStock.set(productId, currentStock - quantity);

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newRedemption: RedemptionRecord = {
      redemptionId: `RDM-2026-${randomSuffix}`,
      idempotencyKey,
      studentId: account.studentId,
      productId: product.id,
      productName: product.name,
      variantSelections,
      quantity,
      pointsDeducted: totalPointsCost,
      remainingBalance: account.availablePoints,
      createdAt: new Date().toISOString(),
      status: "confirmed",
      fulfilmentStatus: "Order confirmed — campus collection ready in 2 days",
      fulfilmentLocation: "Campus Hub, Building 4, Level 1 (Mon-Fri 10am-5pm)",
      collectionCode: `SUTRA-${randomSuffix}-${product.id.substring(0, 3).toUpperCase()}`,
    };

    this.redemptions.unshift(newRedemption);
    this.processedIdempotencyKeys.add(idempotencyKey);

    return {
      success: true,
      message: `Successfully redeemed ${product.name}! ${totalPointsCost} points deducted.`,
      redemption: newRedemption,
      updatedAccount: { ...account },
    };
  }
}

// Global server singleton
const globalForShop = globalThis as unknown as { shopLedgerStore?: ShopLedgerServerStore };
export const shopLedgerStore = globalForShop.shopLedgerStore || new ShopLedgerServerStore();
if (process.env.NODE_ENV !== "production") {
  globalForShop.shopLedgerStore = shopLedgerStore;
}
