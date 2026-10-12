import { NextRequest, NextResponse } from "next/server";
import { shopLedgerStore } from "@/lib/shop-data";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId") || "66666666-6666-6666-6666-666666666666";

    const redemptions = shopLedgerStore.getRedemptions(studentId);
    return NextResponse.json({
      success: true,
      studentId,
      totalRedemptions: redemptions.length,
      redemptions,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: error?.message || "Failed to retrieve redemption history",
      },
      { status: 500 }
    );
  }
}
