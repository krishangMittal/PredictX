import { runAITradingCycle } from "@/lib/ai-engine";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const trades = await runAITradingCycle();
    return NextResponse.json({ success: true, trades });
  } catch (error) {
    console.error("AI trading error:", error);
    return NextResponse.json({ error: "AI trading cycle failed" }, { status: 500 });
  }
}
