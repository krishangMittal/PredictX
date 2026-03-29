// Polymarket API client - fetches real market data

const GAMMA_API = "https://gamma-api.polymarket.com";

export interface PolymarketMarket {
  id: string;
  question: string;
  slug: string;
  description: string;
  outcomes: string[];
  outcomePrices: string[];
  volume: string;
  volumeNum: number;
  liquidityNum: number;
  volume24hr: number;
  volume1wk: number;
  endDateIso: string;
  active: boolean;
  closed: boolean;
  bestBid: number | null;
  bestAsk: number | null;
  spread: number | null;
  lastTradePrice: number | null;
  oneDayPriceChange: number | null;
  oneWeekPriceChange: number | null;
  events?: Array<{
    title: string;
    slug: string;
  }>;
}

function categorizeMarket(question: string, description: string): string {
  const text = (question + " " + description).toLowerCase();

  if (/iran|russia|ukraine|china|war|military|ceasefire|nuclear|weapon|conflict|invasion|missile|strike|hezbollah|regime|nato/.test(text)) return "geopolitics";
  if (/bitcoin|btc|ethereum|eth|crypto|solana|token|defi|nft/.test(text)) return "crypto";
  if (/nba|nfl|nhl|cbb|mlb|soccer|football|basketball|hockey|world cup|fifa|sport|championship|playoff|tennis|ufc|boxing/.test(text)) return "sports";
  if (/ai\b|gpt|openai|anthropic|chatbot|llm|machine learning|model|tech|apple|google|microsoft|tesla|spacex|robot/.test(text)) return "tech";
  if (/trump|biden|election|congress|senate|president|governor|democrat|republican|vote|political|minister|parliament|tariff|recession|inflation|nomination/.test(text)) return "politics";
  if (/climate|population|pandemic|covid|virus|science|fusion|space|mars|moon|nasa/.test(text)) return "science";
  if (/oil|crude|commodity|gold|silver|stock|s&p|dow|fed\b|federal reserve|interest rate/.test(text)) return "finance";
  if (/jesus|religion|god|church|christ/.test(text)) return "other";

  return "other";
}

export async function fetchPolymarkets(params: {
  limit?: number;
  order?: string;
  ascending?: boolean;
  tag?: string;
} = {}): Promise<PolymarketMarket[]> {
  const { limit = 50, order = "volume1wk", ascending = false } = params;

  const url = new URL(`${GAMMA_API}/markets`);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("active", "true");
  url.searchParams.set("closed", "false");
  url.searchParams.set("order", order);
  url.searchParams.set("ascending", String(ascending));
  if (params.tag) url.searchParams.set("tag", params.tag);

  const res = await fetch(url.toString(), {
    headers: { "Accept": "application/json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`Polymarket API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

function parseJsonField<T>(val: T | string): T {
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return val as T; }
  }
  return val;
}

export function polymarketToLocal(pm: PolymarketMarket) {
  const prices = parseJsonField<string[]>(pm.outcomePrices as unknown as string);
  const outcomes = parseJsonField<string[]>(pm.outcomes as unknown as string);
  const yesPrice = parseFloat(prices?.[0] || "0.5");
  const noPrice = parseFloat(prices?.[1] || "0.5");
  const category = categorizeMarket(pm.question, pm.description || "");

  return {
    polymarketId: pm.id,
    polymarketSlug: pm.slug,
    title: pm.question,
    description: (pm.description || "").slice(0, 2000),
    category,
    status: "active" as const,
    yesPrice: Math.max(0.001, Math.min(0.999, yesPrice)),
    noPrice: Math.max(0.001, Math.min(0.999, noPrice)),
    volume: pm.volumeNum || 0,
    liquidity: pm.liquidityNum || 0,
    volume24hr: pm.volume24hr || 0,
    spread: pm.spread || 0,
    bestBid: pm.bestBid,
    bestAsk: pm.bestAsk,
    lastTradePrice: pm.lastTradePrice,
    oneDayChange: pm.oneDayPriceChange,
    oneWeekChange: pm.oneWeekPriceChange,
    outcomes: JSON.stringify(outcomes || ["Yes", "No"]),
    expiresAt: new Date(pm.endDateIso || "2026-12-31"),
  };
}

// Fetch diverse markets across multiple orderings
export async function fetchDiverseMarkets(count: number = 100): Promise<PolymarketMarket[]> {
  const seen = new Set<string>();
  const allMarkets: PolymarketMarket[] = [];

  // Fetch by different orderings to get diverse markets
  const fetches = [
    fetchPolymarkets({ limit: 50, order: "volume1wk" }),
    fetchPolymarkets({ limit: 50, order: "liquidityNum" }),
    fetchPolymarkets({ limit: 50, order: "volume24hr" }),
  ];

  const results = await Promise.all(fetches);

  for (const markets of results) {
    for (const m of markets) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        allMarkets.push(m);
      }
    }
  }

  // Filter out low-quality markets
  return allMarkets
    .filter(m => {
      const prices = parseJsonField<string[]>(m.outcomePrices as unknown as string);
      const outcomes = parseJsonField<string[]>(m.outcomes as unknown as string);
      // Must have valid prices
      const yesPrice = parseFloat(prices?.[0] || "0");
      if (yesPrice <= 0.005 || yesPrice >= 0.995) return false;
      // Must have some volume
      if ((m.volumeNum || 0) < 10000) return false;
      // Must have binary outcomes
      if (!outcomes || outcomes.length !== 2) return false;
      // Must not be expired
      if (m.endDateIso && new Date(m.endDateIso) < new Date()) return false;
      return true;
    })
    .slice(0, count);
}
