import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// Dynamic import for the generated Prisma client
const { PrismaClient } = await import("../src/generated/prisma/client.js");
const prisma = new PrismaClient();

const markets = [
  { title: "Will AI pass the bar exam by 2027?", description: "Resolves YES if any AI system passes the full bar exam with a score in the top 10% of human test-takers.", category: "tech", yesPrice: 0.72, expiresIn: 365 },
  { title: "Will Bitcoin hit $200k by end of 2026?", description: "Resolves YES if Bitcoin's spot price on any major exchange exceeds $200,000 USD before January 1, 2027.", category: "crypto", yesPrice: 0.35, expiresIn: 270 },
  { title: "Will SpaceX land humans on Mars by 2030?", description: "Resolves YES if SpaceX successfully lands at least one human on Mars before January 1, 2031.", category: "science", yesPrice: 0.12, expiresIn: 1400 },
  { title: "Will GPT-5 launch before July 2026?", description: "Resolves YES if OpenAI officially releases GPT-5 (not a preview) before July 1, 2026.", category: "tech", yesPrice: 0.58, expiresIn: 90 },
  { title: "Will the US enter a recession in 2026?", description: "Resolves YES if NBER officially declares a US recession with start date in 2026.", category: "politics", yesPrice: 0.42, expiresIn: 270 },
  { title: "Will Tesla stock hit $500 by end of 2026?", description: "Resolves YES if TSLA closing price exceeds $500 on any trading day before January 1, 2027.", category: "crypto", yesPrice: 0.28, expiresIn: 270 },
  { title: "Will a new COVID variant cause lockdowns in 2026?", description: "Resolves YES if any G7 country implements nationwide lockdown measures due to a COVID variant in 2026.", category: "science", yesPrice: 0.08, expiresIn: 270 },
  { title: "Will the next iPhone have a foldable screen?", description: "Resolves YES if Apple releases an iPhone with a foldable display before January 1, 2028.", category: "tech", yesPrice: 0.22, expiresIn: 630 },
  { title: "Will Ethereum flip Bitcoin in market cap?", description: "Resolves YES if Ethereum's market cap exceeds Bitcoin's at any point before January 1, 2028.", category: "crypto", yesPrice: 0.09, expiresIn: 630 },
  { title: "Will there be a US federal TikTok ban?", description: "Resolves YES if TikTok is fully banned (not just divested) at the federal level in the US.", category: "politics", yesPrice: 0.45, expiresIn: 180 },
  { title: "Will nuclear fusion achieve net energy gain commercially?", description: "Resolves YES if any commercial fusion reactor demonstrates sustained net energy gain before 2030.", category: "science", yesPrice: 0.15, expiresIn: 1400 },
  { title: "Will Apple release an AI chatbot product?", description: "Resolves YES if Apple launches a standalone conversational AI product (not just Siri improvements).", category: "tech", yesPrice: 0.62, expiresIn: 365 },
  { title: "Will the Champions League final be won by an English club?", description: "Resolves YES if an English Premier League club wins the 2026 Champions League final.", category: "sports", yesPrice: 0.38, expiresIn: 60 },
  { title: "Will a self-driving taxi service launch in NYC?", description: "Resolves YES if a fully autonomous (no safety driver) taxi service begins commercial operation in NYC.", category: "tech", yesPrice: 0.25, expiresIn: 365 },
  { title: "Will inflation drop below 2% in the US by Q4 2026?", description: "Resolves YES if the US CPI year-over-year falls below 2.0% in any month of Q4 2026.", category: "politics", yesPrice: 0.55, expiresIn: 270 },
  { title: "Will the NBA Finals MVP be from the Western Conference?", description: "Resolves YES if the 2026 NBA Finals MVP plays for a Western Conference team.", category: "sports", yesPrice: 0.52, expiresIn: 90 },
  { title: "Will Solana reach $500?", description: "Resolves YES if Solana (SOL) price exceeds $500 on any major exchange before January 1, 2027.", category: "crypto", yesPrice: 0.18, expiresIn: 270 },
  { title: "Will world population hit 8.2 billion in 2026?", description: "Resolves YES based on UN official population estimates for 2026.", category: "science", yesPrice: 0.85, expiresIn: 270 },
  { title: "Will any country adopt Bitcoin as legal tender in 2026?", description: "Resolves YES if a new country (not El Salvador or CAR) officially adopts Bitcoin as legal tender.", category: "crypto", yesPrice: 0.20, expiresIn: 270 },
  { title: "Will the 2026 World Cup final have over 1 billion viewers?", description: "Resolves YES based on official FIFA viewership numbers for the 2026 World Cup final.", category: "sports", yesPrice: 0.70, expiresIn: 120 },
];

async function seed() {
  await prisma.priceHistory.deleteMany();
  await prisma.trade.deleteMany();
  await prisma.position.deleteMany();
  await prisma.market.deleteMany();
  await prisma.aITrade.deleteMany();
  await prisma.aIStrategy.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.create({ data: { username: "trader", balance: 10000 } });
  await prisma.user.create({ data: { username: "ai-trader", balance: 10000 } });

  for (const m of markets) {
    const expiresAt = new Date(Date.now() + m.expiresIn * 24 * 60 * 60 * 1000);
    const market = await prisma.market.create({
      data: {
        title: m.title, description: m.description, category: m.category,
        yesPrice: m.yesPrice, noPrice: +(1 - m.yesPrice).toFixed(2),
        volume: Math.floor(Math.random() * 500000) + 50000, expiresAt,
      },
    });

    const historyPoints = [];
    let price = m.yesPrice;
    const now = Date.now();
    for (let i = 7 * 48; i >= 0; i--) {
      const drift = (m.yesPrice - price) * 0.02;
      const noise = (Math.random() - 0.5) * 0.03;
      price = Math.max(0.02, Math.min(0.98, price + drift + noise));
      historyPoints.push({
        marketId: market.id, yesPrice: +price.toFixed(4), noPrice: +(1 - price).toFixed(4),
        volume: Math.floor(Math.random() * 5000), timestamp: new Date(now - i * 30 * 60 * 1000),
      });
    }
    await prisma.priceHistory.createMany({ data: historyPoints });
  }
  console.log("Seeded 20 markets with price history!");
}

seed().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
