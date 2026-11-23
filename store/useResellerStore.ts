import { create } from "zustand";

import type { Reseller, ResellerPatch } from "@/types/reseller";

interface ResellerStore {
  ownerId: string | null;
  localResellers: Reseller[];
  overrides: Record<string, ResellerPatch>;
  syncOwner: (ownerId: string | null) => void;
  addReseller: (reseller: Reseller) => void;
  updateReseller: (id: string, patch: ResellerPatch) => void;
}

export const useResellerStore = create<ResellerStore>((set) => ({
  ownerId: null,
  localResellers: [],
  overrides: {},
  syncOwner: (ownerId) =>
    set((state) =>
      state.ownerId === ownerId
        ? state
        : { ownerId, localResellers: [], overrides: {} },
    ),
  addReseller: (reseller) =>
    set((state) => ({ localResellers: [reseller, ...state.localResellers] })),
  updateReseller: (id, patch) =>
    set((state) => {
      const isLocal = state.localResellers.some((item) => item.id === id);
      if (isLocal) {
        return {
          localResellers: state.localResellers.map((item) =>
            item.id === id ? { ...item, ...patch } : item,
          ),
        };
      }

      return {
           overrides: {
             ...state.overrides,
             [id] : {...state.overrides[id] , ...patch}
           }
      };
    }),
}));
