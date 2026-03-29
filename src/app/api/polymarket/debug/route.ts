import { NextResponse } from "next/server";
import { fetchPolymarkets } from "@/lib/polymarket";

export async function GET() {
  try {
    const markets = await fetchPolymarkets({ limit: 5, order: "volume1wk" });
    return NextResponse.json({
      count: markets.length,
      sample: markets.slice(0, 2).map(m => ({
        id: m.id,
        question: m.question,
        outcomes: m.outcomes,
        outcomePrices: m.outcomePrices,
        volumeNum: m.volumeNum,
        endDateIso: m.endDateIso,
        active: m.active,
        closed: m.closed,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
