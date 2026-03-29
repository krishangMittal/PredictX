import { runAILearningCycle } from "@/lib/ai-engine";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const result = await runAILearningCycle();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("AI learning error:", error);
    return NextResponse.json({ error: "AI learning cycle failed" }, { status: 500 });
  }
}
