/**
 * SUTRA SUPPLY — Server Ledger Transaction Invariant Unit Tests
 * Verifies eligibility threshold, insufficient balance shortfall, atomic commit,
 * stock decrement, and idempotency protection without double-deduction.
 */

import assert from "node:assert/strict";

console.log("==================================================");
console.log("TESTING SUTRA SUPPLY SHOP LEDGER INVARIANTS");
console.log("==================================================");

let passedCount = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// 1. Ledger Model Definition
const ELIGIBILITY_THRESHOLD_POINTS = 500;

const CATALOGUE = [
  { id: "sutra-essential-tee", name: "Essential Tee", pointsCost: 500, stock: 42 },
  { id: "sutra-everyday-hoodie", name: "Everyday Hoodie", pointsCost: 1000, stock: 18 },
  { id: "sutra-focus-notebook", name: "Focus Notebook", pointsCost: 250, stock: 85 },
  { id: "sutra-pen", name: "SUTRA Pen", pointsCost: 150, stock: 110 },
  { id: "sutra-notebook-pen-set", name: "Notebook & Pen Set", pointsCost: 380, stock: 34 },
  { id: "sutra-desk-mat", name: "Desk Mat", pointsCost: 350, stock: 29 },
  { id: "sutra-laptop-sleeve", name: "Laptop Sleeve", pointsCost: 700, stock: 22 },
  { id: "sutra-cable-organizer", name: "Cable Organizer", pointsCost: 200, stock: 65 },
  { id: "sutra-tote-bag", name: "Everyday Tote Bag", pointsCost: 300, stock: 50 },
  { id: "sutra-reusable-bottle", name: "Reusable Bottle", pointsCost: 600, stock: 38 },
  { id: "sutra-sticker-set", name: "SUTRA Sticker Set", pointsCost: 100, stock: 150 },
  { id: "sutra-enamel-pin-lanyard", name: "Enamel Pin & Lanyard", pointsCost: 120, stock: 95 },
];

class MockLedgerStore {
  constructor() {
    this.accounts = new Map([
      ["asha", { lifetime: 850, available: 600, spent: 250, status: "active" }],
      ["rohan", { lifetime: 350, available: 350, spent: 0, status: "active" }],
      ["priya", { lifetime: 580, available: 80, spent: 500, status: "active" }],
    ]);
    this.stock = new Map(CATALOGUE.map((p) => [p.id, p.stock]));
    this.processedIdempotencyKeys = new Set();
    this.redemptions = [];
  }

  executeRedemption({ studentId, productId, quantity = 1, idempotencyKey }) {
    if (this.processedIdempotencyKeys.has(idempotencyKey)) {
      return { success: true, idempotent: true, message: "Previously processed" };
    }

    const acc = this.accounts.get(studentId);
    if (!acc) return { success: false, error: "UNAUTHORIZED" };

    if (acc.lifetime < ELIGIBILITY_THRESHOLD_POINTS) {
      return {
        success: false,
        error: "ELIGIBILITY_THRESHOLD_UNMET",
        message: `Requires ${ELIGIBILITY_THRESHOLD_POINTS - acc.lifetime} more lifetime points`,
      };
    }

    const product = CATALOGUE.find((p) => p.id === productId);
    if (!product) return { success: false, error: "PRODUCT_NOT_FOUND" };

    const totalCost = product.pointsCost * quantity;
    if (acc.available < totalCost) {
      return {
        success: false,
        error: "INSUFFICIENT_POINTS",
        message: `Short by ${totalCost - acc.available} points`,
      };
    }

    const currentStock = this.stock.get(productId);
    if (currentStock < quantity) {
      return { success: false, error: "OUT_OF_STOCK" };
    }

    // Atomic commit
    acc.available -= totalCost;
    acc.spent += totalCost;
    this.stock.set(productId, currentStock - quantity);
    this.processedIdempotencyKeys.add(idempotencyKey);
    const record = {
      id: `RDM-${Date.now()}`,
      studentId,
      productId,
      pointsDeducted: totalCost,
      remainingBalance: acc.available,
    };
    this.redemptions.push(record);

    return { success: true, idempotent: false, record, remainingBalance: acc.available };
  }
}

const ledger = new MockLedgerStore();

test("Eligibility threshold constant is strictly 500 points", () => {
  assert.strictEqual(ELIGIBILITY_THRESHOLD_POINTS, 500);
});

test("Catalogue pricing matches specifications across 12 items", () => {
  assert.strictEqual(CATALOGUE.length, 12);
  const costs = Object.fromEntries(CATALOGUE.map((p) => [p.id, p.pointsCost]));
  assert.strictEqual(costs["sutra-sticker-set"], 100);
  assert.strictEqual(costs["sutra-pen"], 150);
  assert.strictEqual(costs["sutra-focus-notebook"], 250);
  assert.strictEqual(costs["sutra-tote-bag"], 300);
  assert.strictEqual(costs["sutra-desk-mat"], 350);
  assert.strictEqual(costs["sutra-essential-tee"], 500);
  assert.strictEqual(costs["sutra-reusable-bottle"], 600);
  assert.strictEqual(costs["sutra-laptop-sleeve"], 700);
  assert.strictEqual(costs["sutra-everyday-hoodie"], 1000);
});

test("Enforces 500 threshold: Ineligible student (Rohan, 350 lifetime) cannot redeem 100-pt sticker set", () => {
  const res = ledger.executeRedemption({
    studentId: "rohan",
    productId: "sutra-sticker-set",
    quantity: 1,
    idempotencyKey: "k-rohan-1",
  });
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.error, "ELIGIBILITY_THRESHOLD_UNMET");
  assert.strictEqual(ledger.accounts.get("rohan").available, 350, "Balance must not be modified");
});

test("Enforces available balance check: Eligible student (Asha) with 600 pts cannot redeem 1000-pt hoodie", () => {
  const res = ledger.executeRedemption({
    studentId: "asha",
    productId: "sutra-everyday-hoodie",
    quantity: 1,
    idempotencyKey: "k-asha-hoodie",
  });
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.error, "INSUFFICIENT_POINTS");
  assert.strictEqual(ledger.accounts.get("asha").available, 600, "Balance must not be modified");
});

test("Successful redemption: Deducts points atomically, decrements stock, records transaction", () => {
  const stockBefore = ledger.stock.get("sutra-focus-notebook");
  const res = ledger.executeRedemption({
    studentId: "asha",
    productId: "sutra-focus-notebook", // 250 pts
    quantity: 1,
    idempotencyKey: "k-asha-notebook",
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.remainingBalance, 350); // 600 - 250
  assert.strictEqual(ledger.accounts.get("asha").available, 350);
  assert.strictEqual(ledger.accounts.get("asha").spent, 500); // 250 + 250
  assert.strictEqual(ledger.stock.get("sutra-focus-notebook"), stockBefore - 1);
});

test("Idempotency guard: Duplicate submission does not deduct points twice", () => {
  const res = ledger.executeRedemption({
    studentId: "asha",
    productId: "sutra-focus-notebook",
    quantity: 1,
    idempotencyKey: "k-asha-notebook", // Same key!
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.idempotent, true);
  assert.strictEqual(ledger.accounts.get("asha").available, 350, "Balance must remain unchanged on repeat");
});

console.log("==================================================");
console.log(`ALL ${passedCount} LEDGER INVARIANT TESTS PASSED ✓`);
console.log("==================================================");
