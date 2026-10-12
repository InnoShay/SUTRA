import { NextRequest, NextResponse } from "next/server";
import { shopLedgerStore, RedeemRequestPayload } from "@/lib/shop-data";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentId, productId, variantSelections, quantity, idempotencyKey } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "MISSING_PRODUCT", message: "Product ID is required." },
        { status: 400 }
      );
    }

    const payload: RedeemRequestPayload = {
      studentId: studentId || "66666666-6666-6666-6666-666666666666",
      productId,
      variantSelections: variantSelections || {},
      quantity: quantity || 1,
      idempotencyKey: idempotencyKey || `req-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    };

    const result = shopLedgerStore.executeRedemption(payload);

    if (!result.success) {
      let status = 400;
      if (result.error === "ELIGIBILITY_THRESHOLD_UNMET" || result.error === "ACCOUNT_RESTRICTED") {
        status = 403;
      } else if (result.error === "INSUFFICIENT_POINTS") {
        status = 422;
      }
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: error?.message || "An unexpected error occurred during redemption.",
      },
      { status: 500 }
    );
  }
}
