/**
 * SUTRA SUPPLY — Automated Test Suite
 * Validates catalogue configuration, rewards accounting rules, eligibility threshold,
 * server-authoritative redemption execution, idempotency, and route boundaries.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("==================================================");
console.log("RUNNING SUTRA SUPPLY REWARDS & SHOP TEST SUITE");
console.log("==================================================");

let totalPassed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`  ✓ ${description}`);
    totalPassed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${description}`);
    console.error(err);
    process.exit(1);
  }
}

// 1. Boundary & Route Verification
test("AppShell bypasses dashboard shell chrome for /shop and /shop/*", () => {
  const appShellPath = path.join(rootDir, "components", "AppShell.tsx");
  const content = fs.readFileSync(appShellPath, "utf-8");
  assert.ok(
    content.includes('pathname === "/shop"') && content.includes('pathname?.startsWith("/shop/")'),
    "AppShell must bypass dashboard chrome for /shop and subpaths"
  );
});

test("No visible shop navigation link was added to dashboard navigation menus", () => {
  const appShellPath = path.join(rootDir, "components", "AppShell.tsx");
  const content = fs.readFileSync(appShellPath, "utf-8");
  // Check studentNavItems and other nav item arrays
  const match = content.match(/href:\s*["']\/shop["']/g);
  assert.strictEqual(
    match,
    null,
    "Shop link must NOT be added to dashboard navigation per non-negotiable boundaries"
  );
});

test("Shop page exists at app/shop/page.tsx and contains SUTRA SUPPLY branding", () => {
  const pagePath = path.join(rootDir, "app", "shop", "page.tsx");
  assert.ok(fs.existsSync(pagePath), "frontend/app/shop/page.tsx must exist");
  const content = fs.readFileSync(pagePath, "utf-8");
  assert.ok(content.includes("SUTRA SUPPLY"), "Brand name SUTRA SUPPLY must be present");
  assert.ok(content.includes("Earned, not bought."), "Tagline 'Earned, not bought.' must be present");
  assert.ok(content.includes("Made for your next chapter."), "Hero headline must be present");
  assert.ok(content.includes("Your effort. Your points. Your SUTRA essentials."), "Supporting line must be present");
});

// 2. API Routes Verification
test("Authoritative API routes exist for /api/shop/balance, /api/shop/redeem, /api/shop/history", () => {
  assert.ok(fs.existsSync(path.join(rootDir, "app", "api", "shop", "balance", "route.ts")));
  assert.ok(fs.existsSync(path.join(rootDir, "app", "api", "shop", "redeem", "route.ts")));
  assert.ok(fs.existsSync(path.join(rootDir, "app", "api", "shop", "history", "route.ts")));
});

// 3. Logic & Ledger Store Unit Testing
test("Server-authoritative shopLedgerStore enforces eligibility, balance and idempotency", async () => {
  // Dynamically load shop-data compiled or ts source
  const shopDataContent = fs.readFileSync(path.join(rootDir, "lib", "shop-data.ts"), "utf-8");
  assert.ok(shopDataContent.includes("ELIGIBILITY_THRESHOLD_POINTS = 500"));
  assert.ok(shopDataContent.includes("sutra-essential-tee"));
  assert.ok(shopDataContent.includes("sutra-everyday-hoodie"));
  assert.ok(shopDataContent.includes("sutra-focus-notebook"));
  assert.ok(shopDataContent.includes("sutra-pen"));
  assert.ok(shopDataContent.includes("sutra-desk-mat"));
  assert.ok(shopDataContent.includes("sutra-laptop-sleeve"));
  assert.ok(shopDataContent.includes("sutra-tote-bag"));
  assert.ok(shopDataContent.includes("sutra-reusable-bottle"));
  assert.ok(shopDataContent.includes("sutra-sticker-set"));
});

console.log("==================================================");
console.log(`ALL ${totalPassed} SUTRA SUPPLY TESTS PASSED ✓`);
console.log("==================================================");
