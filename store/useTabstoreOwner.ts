
import { create } from "zustand";

import { TabKeyOwner } from "./tabKeyOwner";



interface TabStore {
    activeTab: TabKeyOwner;
    setActiveTab: (tab: TabKeyOwner) => void;
}

export const useTabStore = create<TabStore>((set) => ({
    activeTab: "home",
    setActiveTab: (tab) => set({ activeTab: tab }),
}));
