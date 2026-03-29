import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter } as any);

// Markets are now synced from Polymarket API - no fake markets needed

async function seed() {
  await prisma.user.upsert({
    where: { username: "trader" },
    update: {},
    create: { username: "trader", balance: 10000 },
  });

  await prisma.user.upsert({
    where: { username: "ai-trader" },
    update: {},
    create: { username: "ai-trader", balance: 10000 },
  });

  console.log("Seeded users! Run POST /api/polymarket/sync to load real markets.");
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
