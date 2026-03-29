import { create } from "zustand";

type PriceUpdate = {
  id: string;
  yesPrice: number;
  noPrice: number;
};

type NewsEvent = {
  headline: string;
  categories: string[];
  impact: number;
  timestamp: string;
};

type AppStore = {
  prices: Record<string, { yesPrice: number; noPrice: number }>;
  lastUpdate: number;
  newsEvents: NewsEvent[];
  setPrices: (updates: PriceUpdate[]) => void;
  getPrice: (marketId: string) => { yesPrice: number; noPrice: number } | undefined;
  addNews: (event: NewsEvent) => void;
};

export const usePriceStore = create<AppStore>((set, get) => ({
  prices: {},
  lastUpdate: 0,
  newsEvents: [],
  setPrices: (updates) => {
    set((state) => {
      const newPrices = { ...state.prices };
      for (const update of updates) {
        newPrices[update.id] = {
          yesPrice: update.yesPrice,
          noPrice: update.noPrice,
        };
      }
      return { prices: newPrices, lastUpdate: Date.now() };
    });
  },
  getPrice: (marketId) => get().prices[marketId],
  addNews: (event) => {
    set((state) => ({
      newsEvents: [event, ...state.newsEvents].slice(0, 10),
    }));
  },
}));
