import { create } from "zustand";

type PriceUpdate = {
  id: string;
  yesPrice: number;
  noPrice: number;
};

type PriceStore = {
  prices: Record<string, { yesPrice: number; noPrice: number }>;
  lastUpdate: number;
  setPrices: (updates: PriceUpdate[]) => void;
  getPrice: (marketId: string) => { yesPrice: number; noPrice: number } | undefined;
};

export const usePriceStore = create<PriceStore>((set, get) => ({
  prices: {},
  lastUpdate: 0,
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
}));
