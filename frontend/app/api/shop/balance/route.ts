import { NextRequest, NextResponse } from "next/server";
import { shopLedgerStore } from "@/lib/shop-data";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId") || "66666666-6666-6666-6666-666666666666";

    const account = shopLedgerStore.getAccount(studentId);
    return NextResponse.json({
      success: true,
      account,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: error?.message || "Failed to retrieve student rewards account",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Allows test suite to reset ledger to initial state
  try {
    const body = await req.json().catch(() => ({}));
    if (body.action === "reset") {
      shopLedgerStore.resetToDefaults();
      return NextResponse.json({ success: true, message: "Ledger reset to defaults" });
    }
    return NextResponse.json({ success: false, message: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
