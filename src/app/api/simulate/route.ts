import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

// Simulated news events that can affect prices
const NEWS_TEMPLATES = [
  { template: "Breaking: Major tech company announces AI breakthrough", categories: ["tech"], impact: 0.03 },
  { template: "Crypto market sees surge in institutional buying", categories: ["crypto"], impact: 0.04 },
  { template: "Federal Reserve hints at rate adjustment", categories: ["politics", "crypto"], impact: -0.02 },
  { template: "Sports analytics model predicts upset victory", categories: ["sports"], impact: 0.03 },
  { template: "New research paper challenges scientific consensus", categories: ["science"], impact: 0.02 },
  { template: "Regulatory concerns emerge in tech sector", categories: ["tech"], impact: -0.03 },
  { template: "Bitcoin whale moves $500M to exchange", categories: ["crypto"], impact: -0.04 },
  { template: "Poll numbers shift dramatically in key race", categories: ["politics"], impact: 0.05 },
  { template: "Record-breaking viewership for major sporting event", categories: ["sports"], impact: 0.02 },
  { template: "Climate data shows unexpected trend reversal", categories: ["science"], impact: -0.02 },
  { template: "Tech IPO exceeds expectations on first trading day", categories: ["tech"], impact: 0.02 },
  { template: "Crypto exchange reports record trading volume", categories: ["crypto"], impact: 0.03 },
];

export async function POST() {
  try {
    const markets = await prisma.market.findMany({
      where: { status: "active" },
    });

    const updates = [];
    let newsEvent = null;

    // 10% chance of a news event each tick
    if (Math.random() < 0.1) {
      const event = NEWS_TEMPLATES[Math.floor(Math.random() * NEWS_TEMPLATES.length)];
      newsEvent = {
        headline: event.template,
        categories: event.categories,
        impact: event.impact,
        timestamp: new Date().toISOString(),
      };
    }

    for (const market of markets) {
      const meanReversionStrength = 0.005;
      const volatility = 0.008;

      let drift = (0.5 - market.yesPrice) * meanReversionStrength;
      const noise = (Math.random() - 0.5) * 2 * volatility;

      // Apply news impact if relevant
      if (newsEvent && newsEvent.categories.includes(market.category)) {
        drift += newsEvent.impact * (Math.random() * 0.5 + 0.5);
      }

      // Occasional trend shift
      if (Math.random() < 0.02) {
        drift += (Math.random() - 0.5) * 0.05;
      }

      const newYesPrice = Math.max(0.02, Math.min(0.98, market.yesPrice + drift + noise));
      const newNoPrice = +(1 - newYesPrice).toFixed(4);
      const tickVolume = Math.floor(Math.random() * 2000) + 100;

      updates.push({
        id: market.id,
        yesPrice: +newYesPrice.toFixed(4),
        noPrice: newNoPrice,
        volume: market.volume + tickVolume,
      });
    }

    for (const update of updates) {
      await prisma.market.update({
        where: { id: update.id },
        data: {
          yesPrice: update.yesPrice,
          noPrice: update.noPrice,
          volume: update.volume,
        },
      });

      await prisma.priceHistory.create({
        data: {
          marketId: update.id,
          yesPrice: update.yesPrice,
          noPrice: update.noPrice,
          volume: 0,
        },
      });
    }

    return NextResponse.json({
      success: true,
      updated: updates.length,
      prices: updates.map((u) => ({
        id: u.id,
        yesPrice: u.yesPrice,
        noPrice: u.noPrice,
      })),
      news: newsEvent,
    });
  } catch (error) {
    console.error("Simulation error:", error);
    return NextResponse.json({ error: "Simulation failed" }, { status: 500 });
  }
}
