import {
  StudentRewardsAccount,
  RedemptionRecord,
  RedeemRequestPayload,
  RedeemResponsePayload,
  INITIAL_STUDENT_ACCOUNTS,
  INITIAL_REDEMPTIONS,
} from "./shop-data";

export interface ShopApiError {
  message: string;
  code?: string;
  status?: number;
}

export const shopApi = {
  async getBalance(studentId: string = "66666666-6666-6666-6666-666666666666"): Promise<StudentRewardsAccount> {
    try {
      const res = await fetch(`/api/shop/balance?studentId=${encodeURIComponent(studentId)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch rewards balance (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (!data.success || !data.account) {
        throw new Error(data.message || "Invalid balance response");
      }
      return data.account;
    } catch (err: any) {
      console.warn("Falling back to local account data:", err?.message);
      const fallback = INITIAL_STUDENT_ACCOUNTS[studentId] || INITIAL_STUDENT_ACCOUNTS["66666666-6666-6666-6666-666666666666"];
      return fallback;
    }
  },

  async redeemProduct(payload: RedeemRequestPayload): Promise<RedeemResponsePayload> {
    const res = await fetch("/api/shop/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok && !data.success) {
      const error = new Error(data.message || "Redemption request failed") as Error & { code?: string; status?: number };
      error.code = data.error;
      error.status = res.status;
      throw error;
    }
    return data;
  },

  async getHistory(studentId: string = "66666666-6666-6666-6666-666666666666"): Promise<RedemptionRecord[]> {
    try {
      const res = await fetch(`/api/shop/history?studentId=${encodeURIComponent(studentId)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch history (HTTP ${res.status})`);
      }
      const data = await res.json();
      return data.redemptions || [];
    } catch (err: any) {
      console.warn("Falling back to local redemptions:", err?.message);
      return INITIAL_REDEMPTIONS.filter((r) => r.studentId === studentId);
    }
  },

  async resetLedger(): Promise<void> {
    await fetch("/api/shop/balance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });
  },
};
